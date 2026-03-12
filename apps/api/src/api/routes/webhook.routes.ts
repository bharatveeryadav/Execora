/**
 * webhook.routes.ts — Inbound webhooks
 *
 * UPI Ecosystem:  NPCI does NOT expose a merchant API.  Every UPI payment
 * (GPay, PhonePe, Paytm, BHIM, etc.) flows through a licensed aggregator.
 * We support four aggregators so ANY of them can trigger the Execora
 * sound-box announcement automatically.
 *
 *  1. Meta / WhatsApp  — delivery status
 *  2. Razorpay         — payment.captured, payment_link.paid
 *  3. PhonePe Business — PAYMENT_SUCCESS
 *  4. Cashfree         — PAYMENT_SUCCESS_WEBHOOK
 *  5. PayU             — success callback
 */
import crypto from "crypto";
import { FastifyInstance, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { whatsappService, logger } from "@execora/infrastructure";
import { prisma } from "@execora/infrastructure";
import { ledgerService } from "@execora/modules";
import { broadcaster } from "../../ws/broadcaster";

// ─────────────────────────────────────────────────────────────────────────────
// Shared types & helpers
// ─────────────────────────────────────────────────────────────────────────────

interface NormalisedPayment {
amount: number;
phone: string;
name: string;
ref: string;
method: "upi" | "card" | "cash" | "other";
source:
	| "razorpay"
	| "phonepe"
	| "cashfree"
	| "payu"
	| "paytm"
	| "instamojo"
	| "stripe"
	| "easebuzz"
	| "bharatpe";
}

async function matchCustomer(tenantId: string, phone: string) {
const digits = phone.replace(/\D/g, "");
if (digits.length < 10) return null;
const last10 = digits.slice(-10);
return prisma.customer.findFirst({
where: {
tenantId,
OR: [
{ phone: { endsWith: last10 } },
{ alternatePhone: { has: last10 } },
],
},
select: { id: true, name: true },
});
}

async function processUpiPayment(
tenantId: string,
norm: NormalisedPayment,
recId: string,
) {
const dup = await prisma.payment.findFirst({
where: { tenantId, reference: norm.ref },
});
const customer = await matchCustomer(tenantId, norm.phone);
const resolvedName = customer?.name ?? norm.name;

if (customer && !dup) {
const { tenantContext } = await import("@execora/infrastructure");
await tenantContext.run({ tenantId, userId: "webhook" }, () =>
ledgerService.recordPayment(
customer.id,
norm.amount,
norm.method,
`Auto-recorded via ${norm.source} webhook (${norm.ref})`,
norm.ref,
),
);
}

broadcaster.send(tenantId, "payment:recorded", {
customerId: customer?.id ?? "",
customerName: resolvedName,
amount: norm.amount,
method: norm.method,
source: norm.source,
ref: norm.ref,
});

await prisma.webhookEvent.update({
where: { id: recId },
data: { processed: true, processedAt: new Date() },
});

logger.info(
{
tenantId,
source: norm.source,
amount: norm.amount,
ref: norm.ref,
customerId: customer?.id,
},
"UPI webhook processed",
);
return { status: "ok", customerMatched: !!customer };
}

async function storeEvent(
tenantId: string,
provider: string,
eventType: string,
payload: unknown,
) {
const r = await prisma.webhookEvent.create({
data: {
tenantId,
provider,
eventType,
payload: payload as Prisma.InputJsonValue,
processed: false,
},
});
return r.id;
}

function hmac256hex(secret: string, data: string): string {
return crypto.createHmac("sha256", secret).update(data).digest("hex");
}
function hmac256b64(secret: string, data: string): string {
return crypto.createHmac("sha256", secret).update(data).digest("base64");
}

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp types
// ─────────────────────────────────────────────────────────────────────────────
interface WhatsAppStatusEntry {
id: string;
status: string;
}
interface WhatsAppWebhookBody {
entry?: Array<{
changes?: Array<{ value?: { statuses?: WhatsAppStatusEntry[] } }>;
}>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route registrations
// ─────────────────────────────────────────────────────────────────────────────
export async function webhookRoutes(fastify: FastifyInstance) {
// ── 1. WhatsApp verification handshake ─────────────────────────────────
fastify.get(
"/api/v1/webhook/whatsapp",
{ config: { rateLimit: false } },
async (
request: FastifyRequest<{
Querystring: {
"hub.mode": string;
"hub.challenge": string;
"hub.verify_token": string;
};
}>,
reply,
) => {
const {
"hub.mode": mode,
"hub.challenge": challenge,
"hub.verify_token": token,
} = request.query;
if (mode === "subscribe" && whatsappService.validateWebhookToken(token))
return reply.code(200).send(challenge);
return reply.code(403).send("Forbidden");
},
);

// ── 2. WhatsApp messages / delivery status ─────────────────────────────
fastify.post<{ Body: WhatsAppWebhookBody }>(
"/api/v1/webhook/whatsapp",
{ config: { rateLimit: false } },
async (request, _reply) => {
const body = request.body;
await whatsappService.processWebhookEvent(
body as Record<string, unknown>,
);
const statuses =
body.entry?.[0]?.changes?.[0]?.value?.statuses ?? [];
if (statuses.length > 0) {
try {
await prisma.$transaction(
statuses.map((s) =>
prisma.messageLog.updateMany({
where: { providerMessageId: s.id },
data: {
status:
s.status as Prisma.MessageLogUpdateManyMutationInput["status"],
deliveredAt:
s.status === "delivered" ? new Date() : undefined,
readAt: s.status === "read" ? new Date() : undefined,
},
}),
),
);
} catch (error) {
request.log.error({ error }, "Webhook status update failed");
}
}
return { status: "ok" };
},
);

// ── 3. Razorpay ────────────────────────────────────────────────────────
// Dashboard → Settings → Webhooks
// Events:  payment.captured   payment_link.paid
// Header:  x-razorpay-signature  (HMAC-SHA256-hex of raw JSON body)
fastify.post<{
Params: { tenantId: string };
Body: Record<string, unknown>;
}>(
"/api/v1/webhook/razorpay/:tenantId",
{
config: { rateLimit: false },
schema: { body: { type: "object", additionalProperties: true } },
},
async (request, reply) => {
const { tenantId } = request.params;
const body = request.body;
const event = body?.event as string | undefined;

const tenant = await prisma.tenant.findUnique({
where: { id: tenantId },
select: { id: true, settings: true },
});
if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

const secret = (
(tenant.settings as Record<string, unknown>) ?? {}
)["razorpayWebhookSecret"] as string | undefined;

if (secret) {
const sig = request.headers[
"x-razorpay-signature"
] as string | undefined;
if (!sig)
return reply.code(401).send({ error: "Missing signature" });
const expected = hmac256hex(secret, JSON.stringify(body));
if (
!crypto.timingSafeEqual(
Buffer.from(sig),
Buffer.from(expected),
)
) {
logger.warn({ tenantId }, "Razorpay: bad signature");
return reply.code(401).send({ error: "Invalid signature" });
}
}

const SUPPORTED = ["payment.captured", "payment_link.paid"];
if (!event || !SUPPORTED.includes(event))
return reply.send({ status: "ignored" });

const pe =
(
(body?.payload as Record<string, unknown>)
?.payment as Record<string, unknown>
)?.entity as Record<string, unknown> ??
(
(body?.payload as Record<string, unknown>)
?.payment_link as Record<string, unknown>
)?.entity as Record<string, unknown> ??
{};

const paise = pe?.amount as number | undefined;
if (!paise || paise <= 0)
return reply.code(400).send({ error: "Zero amount" });

const recId = await storeEvent(tenantId, "razorpay", event, body);
try {
const methodRaw = pe?.method as string ?? "upi";
return reply.send(
await processUpiPayment(
tenantId,
{
amount: paise / 100,
phone: (pe?.contact as string ?? "").replace(/\D/g, ""),
name:
((pe?.description as string) ?? "") ||
(((pe?.notes as Record<string, unknown>)
?.customer_name as string) ?? ""),
ref: (pe?.id as string) ?? `rzp_${Date.now()}`,
method: (
["upi", "card", "cash"].includes(methodRaw)
? methodRaw
: "upi"
) as "upi" | "card" | "cash",
source: "razorpay",
},
recId,
),
);
} catch (err) {
const msg = err instanceof Error ? err.message : String(err);
await prisma.webhookEvent.update({
where: { id: recId },
data: { error: msg },
});
return reply.code(500).send({ error: "Processing failed" });
}
},
);

// ── 4. PhonePe Business ────────────────────────────────────────────────
// PhonePe Developer Portal → Merchant Dashboard → Webhooks
// Event:  PAYMENT_SUCCESS  (body.response is base64-encoded JSON)
// Header: x-verify  →  SHA256(base64Body + saltKey) + "###" + keyIndex
fastify.post<{
Params: { tenantId: string };
Body: Record<string, unknown>;
}>(
"/api/v1/webhook/phonepe/:tenantId",
{
config: { rateLimit: false },
schema: { body: { type: "object", additionalProperties: true } },
},
async (request, reply) => {
const { tenantId } = request.params;
const body = request.body;

const tenant = await prisma.tenant.findUnique({
where: { id: tenantId },
select: { id: true, settings: true },
});
if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

const saltKey = (
(tenant.settings as Record<string, unknown>) ?? {}
)["phonepeWebhookSecret"] as string | undefined;
const xVerify = request.headers["x-verify"] as string | undefined;

if (saltKey && xVerify) {
const [givenHash] = xVerify.split("###");
const base64Body = Buffer.from(JSON.stringify(body)).toString(
"base64",
);
const expected = crypto
.createHash("sha256")
.update(base64Body + saltKey)
.digest("hex");
if (givenHash !== expected) {
logger.warn({ tenantId }, "PhonePe: bad signature");
return reply.code(401).send({ error: "Invalid signature" });
}
}

let data: Record<string, unknown> = body;
if (typeof body?.response === "string") {
try {
data = JSON.parse(
Buffer.from(body.response, "base64").toString(),
);
} catch {
/* use raw */
}
}

const code =
(data?.code as string) ??
((data?.data as Record<string, unknown>)
?.responseCode as string) ??
"";
if (code !== "PAYMENT_SUCCESS") return reply.send({ status: "ignored" });

const txn = (data?.data ?? data) as Record<string, unknown>;
const paise = txn?.amount as number | undefined;
if (!paise || paise <= 0)
return reply.code(400).send({ error: "Zero amount" });

const recId = await storeEvent(
tenantId,
"phonepe",
"PAYMENT_SUCCESS",
body,
);
try {
return reply.send(
await processUpiPayment(
tenantId,
{
amount: paise / 100,
phone: (
(txn?.mobileNumber as string) ??
(txn?.mobile as string) ??
""
).replace(/\D/g, ""),
name: "",
ref:
(txn?.transactionId as string) ??
(txn?.merchantTransactionId as string) ??
`ppe_${Date.now()}`,
method: "upi",
source: "phonepe",
},
recId,
),
);
} catch (err) {
const msg = err instanceof Error ? err.message : String(err);
await prisma.webhookEvent.update({
where: { id: recId },
data: { error: msg },
});
return reply.code(500).send({ error: "Processing failed" });
}
},
);

// ── 5. Cashfree ────────────────────────────────────────────────────────
// Cashfree Dashboard → Webhooks → Payment Events
// Event:  PAYMENT_SUCCESS_WEBHOOK
// Header: x-webhook-signature  (HMAC-SHA256-base64, key=secret, msg=ts+body)
//         x-webhook-timestamp
fastify.post<{
Params: { tenantId: string };
Body: Record<string, unknown>;
}>(
"/api/v1/webhook/cashfree/:tenantId",
{
config: { rateLimit: false },
schema: { body: { type: "object", additionalProperties: true } },
},
async (request, reply) => {
const { tenantId } = request.params;
const body = request.body;

const tenant = await prisma.tenant.findUnique({
where: { id: tenantId },
select: { id: true, settings: true },
});
if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

const secret = (
(tenant.settings as Record<string, unknown>) ?? {}
)["cashfreeWebhookSecret"] as string | undefined;
const sig = request.headers[
"x-webhook-signature"
] as string | undefined;
const timestamp = request.headers[
"x-webhook-timestamp"
] as string | undefined;

if (secret && sig && timestamp) {
const expected = hmac256b64(
secret,
timestamp + JSON.stringify(body),
);
if (sig !== expected) {
logger.warn({ tenantId }, "Cashfree: bad signature");
return reply.code(401).send({ error: "Invalid signature" });
}
}

const event =
((body?.type ?? body?.event) as string | undefined) ?? "";
if (!event.includes("PAYMENT_SUCCESS"))
return reply.send({ status: "ignored" });

const payment =
((body?.data as Record<string, unknown>)
?.payment as Record<string, unknown>) ?? body;
const customer =
((body?.data as Record<string, unknown>)
?.customer as Record<string, unknown>) ?? {};
const amtRs =
typeof payment?.payment_amount === "number"
? payment.payment_amount
: parseFloat(
String(
payment?.payment_amount ??
payment?.amount ??
0,
),
);
if (!amtRs || amtRs <= 0)
return reply.code(400).send({ error: "Zero amount" });

const recId = await storeEvent(tenantId, "cashfree", event, body);
try {
const methodStr = String(payment?.payment_method ?? "upi").toLowerCase();
return reply.send(
await processUpiPayment(
tenantId,
{
amount: amtRs,
phone: (
customer?.customer_phone as string ?? ""
).replace(/\D/g, ""),
name: (customer?.customer_name as string) ?? "",
ref:
(payment?.cf_payment_id as string) ??
(payment?.order_id as string) ??
`cf_${Date.now()}`,
method: methodStr.includes("upi")
? "upi"
: methodStr.includes("card")
? "card"
: "upi",
source: "cashfree",
},
recId,
),
);
} catch (err) {
const msg = err instanceof Error ? err.message : String(err);
await prisma.webhookEvent.update({
where: { id: recId },
data: { error: msg },
});
return reply.code(500).send({ error: "Processing failed" });
}
},
);

// ── 6. PayU ────────────────────────────────────────────────────────────
// PayU Dashboard → Settings → Payment Webhook URL
// Reverse hash: sha512(salt|status|udf5..1|email|firstname|productinfo|amount|txnid|key)
fastify.post<{
Params: { tenantId: string };
Body: Record<string, unknown>;
}>(
"/api/v1/webhook/payu/:tenantId",
{
config: { rateLimit: false },
schema: { body: { type: "object", additionalProperties: true } },
},
async (request, reply) => {
const { tenantId } = request.params;
const body = request.body;

const tenant = await prisma.tenant.findUnique({
where: { id: tenantId },
select: { id: true, settings: true },
});
if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

const saltKey = (
(tenant.settings as Record<string, unknown>) ?? {}
)["payuWebhookSecret"] as string | undefined;

if (saltKey && body?.hash) {
const f = (k: string) => String(body?.[k] ?? "");
const reverseStr = [
saltKey,
f("status"),
f("udf10"),
f("udf9"),
f("udf8"),
f("udf7"),
f("udf6"),
f("udf5"),
f("udf4"),
f("udf3"),
f("udf2"),
f("udf1"),
f("email"),
f("firstname"),
f("productinfo"),
f("amount"),
f("txnid"),
f("key"),
].join("|");
const expected = crypto
.createHash("sha512")
.update(reverseStr)
.digest("hex");
if (body.hash !== expected) {
logger.warn({ tenantId }, "PayU: bad hash");
return reply.code(401).send({ error: "Invalid hash" });
}
}

if (body?.status !== "success") return reply.send({ status: "ignored" });

const amtRs = parseFloat(String(body?.amount ?? 0));
if (!amtRs || amtRs <= 0)
return reply.code(400).send({ error: "Zero amount" });

const recId = await storeEvent(tenantId, "payu", "success", body);
try {
return reply.send(
await processUpiPayment(
tenantId,
{
amount: amtRs,
phone: (body?.phone as string ?? "").replace(
/\D/g,
"",
),
name: (body?.firstname as string) ?? "",
ref:
(body?.mihpayid as string) ??
(body?.txnid as string) ??
`payu_${Date.now()}`,
method:
String(body?.mode ?? "UPI").toUpperCase() ===
"UPI"
? "upi"
: "other",
source: "payu",
},
recId,
),
);
} catch (err) {
const msg = err instanceof Error ? err.message : String(err);
await prisma.webhookEvent.update({
where: { id: recId },
data: { error: msg },
});
return reply.code(500).send({ error: "Processing failed" });
}
},
);

	// ── 7. Paytm Payment Gateway ────────────────────────────────────────────
	// Paytm Dashboard → Developer Settings → Webhook URL
	// Indicator: STATUS=TXN_SUCCESS + RESPCODE=01  (no reliable open-SDK-free sig)
	fastify.post<{
		Params: { tenantId: string };
		Body: Record<string, unknown>;
	}>(
		"/api/v1/webhook/paytm/:tenantId",
		{
			config: { rateLimit: false },
			schema: { body: { type: "object", additionalProperties: true } },
		},
		async (request, reply) => {
			const { tenantId } = request.params;
			const body = request.body;

			const tenant = await prisma.tenant.findUnique({
				where: { id: tenantId },
				select: { id: true, settings: true },
			});
			if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

			// STATUS=TXN_SUCCESS + RESPCODE=01 means successful payment
			if (body?.STATUS !== "TXN_SUCCESS" || body?.RESPCODE !== "01")
				return reply.send({ status: "ignored" });

			const amtRs = parseFloat(String(body?.TXNAMOUNT ?? 0));
			if (!amtRs || amtRs <= 0)
				return reply.code(400).send({ error: "Zero amount" });

			const recId = await storeEvent(tenantId, "paytm", "TXN_SUCCESS", body);
			try {
				const modeRaw = String(body?.PAYMENTMODE ?? "UPI").toUpperCase();
				return reply.send(
					await processUpiPayment(
						tenantId,
						{
							amount: amtRs,
							phone: String(
								body?.MOBILE_NO ?? body?.CUST_ID ?? "",
							).replace(/\D/g, ""),
							name: "",
							ref:
								(body?.TXNID as string) ??
								(body?.BANKTXNID as string) ??
								`ptm_${Date.now()}`,
							method: modeRaw === "UPI" ? "upi" : modeRaw === "CC" || modeRaw === "DC" ? "card" : "upi",
							source: "paytm",
						},
						recId,
					),
				);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				await prisma.webhookEvent.update({ where: { id: recId }, data: { error: msg } });
				return reply.code(500).send({ error: "Processing failed" });
			}
		},
	);

	// ── 8. Instamojo ───────────────────────────────────────────────────────
	// Instamojo Dashboard → Developers → Webhook URL
	// Header: X-Instamojo-Signature = HMAC-SHA1(private_salt, mac)
	// Event:  status = Credit
	fastify.post<{
		Params: { tenantId: string };
		Body: Record<string, unknown>;
	}>(
		"/api/v1/webhook/instamojo/:tenantId",
		{
			config: { rateLimit: false },
			schema: { body: { type: "object", additionalProperties: true } },
		},
		async (request, reply) => {
			const { tenantId } = request.params;
			const body = request.body;

			const tenant = await prisma.tenant.findUnique({
				where: { id: tenantId },
				select: { id: true, settings: true },
			});
			if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

			const salt = (
				(tenant.settings as Record<string, unknown>) ?? {}
			)["instamojoSalt"] as string | undefined;
			const sig = request.headers["x-instamojo-signature"] as string | undefined;

			if (salt && sig) {
				// Instamojo: HMAC-SHA1 of pipe-joined sorted field values
				const macFields = [
					"amount", "buyer", "buyer_name", "buyer_phone",
					"currency", "fees", "payment_id", "payment_request_id",
					"purpose", "shorturl", "status",
				];
				const mac = macFields
					.map((k) => String(body?.[k] ?? ""))
					.join("|");
				const expected = crypto
					.createHmac("sha1", salt)
					.update(mac)
					.digest("hex");
				if (sig !== expected) {
					logger.warn({ tenantId }, "Instamojo: bad signature");
					return reply.code(401).send({ error: "Invalid signature" });
				}
			}

			if (body?.status !== "Credit")
				return reply.send({ status: "ignored" });

			const amtRs = parseFloat(String(body?.amount ?? 0));
			if (!amtRs || amtRs <= 0)
				return reply.code(400).send({ error: "Zero amount" });

			const recId = await storeEvent(tenantId, "instamojo", "Credit", body);
			try {
				return reply.send(
					await processUpiPayment(
						tenantId,
						{
							amount: amtRs,
							phone: String(body?.buyer_phone ?? "").replace(/\D/g, ""),
							name: String(body?.buyer_name ?? body?.buyer ?? ""),
							ref:
								(body?.payment_id as string) ??
								`imo_${Date.now()}`,
							method: "upi",
							source: "instamojo",
						},
						recId,
					),
				);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				await prisma.webhookEvent.update({ where: { id: recId }, data: { error: msg } });
				return reply.code(500).send({ error: "Processing failed" });
			}
		},
	);

	// ── 9. Stripe (India UPI) ──────────────────────────────────────────────
	// Stripe Dashboard → Developers → Webhooks
	// Header: stripe-signature  (format: t=ts,v1=hmac256hex)
	// Event:  payment_intent.succeeded  (with payment_method_types including upi)
	fastify.post<{
		Params: { tenantId: string };
		Body: Record<string, unknown>;
	}>(
		"/api/v1/webhook/stripe/:tenantId",
		{
			config: { rateLimit: false },
			schema: { body: { type: "object", additionalProperties: true } },
		},
		async (request, reply) => {
			const { tenantId } = request.params;
			const body = request.body;

			const tenant = await prisma.tenant.findUnique({
				where: { id: tenantId },
				select: { id: true, settings: true },
			});
			if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

			const secret = (
				(tenant.settings as Record<string, unknown>) ?? {}
			)["stripeWebhookSecret"] as string | undefined;
			const sigHeader = request.headers["stripe-signature"] as string | undefined;

			if (secret && sigHeader) {
				// stripe-signature: t=timestamp,v1=hmac256hex(secret, "timestamp.payload")
				const parts = sigHeader.split(",");
				const t = parts.find((p) => p.startsWith("t="))?.slice(2) ?? "";
				const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3) ?? "";
				const expected = hmac256hex(secret, `${t}.${JSON.stringify(body)}`);
				if (!v1 || v1 !== expected) {
					logger.warn({ tenantId }, "Stripe: bad signature");
					return reply.code(401).send({ error: "Invalid signature" });
				}
			}

			const event = body?.type as string | undefined;
			if (event !== "payment_intent.succeeded")
				return reply.send({ status: "ignored" });

			const pi = (body?.data as Record<string, unknown>)
				?.object as Record<string, unknown>;
			const paise = pi?.amount as number | undefined;
			if (!paise || paise <= 0)
				return reply.code(400).send({ error: "Zero amount" });

			const recId = await storeEvent(tenantId, "stripe", event, body);
			try {
				const methodTypes = (pi?.payment_method_types as string[]) ?? [];
				return reply.send(
					await processUpiPayment(
						tenantId,
						{
							amount: paise / 100,
							phone: "",
							name: String(
								(pi?.metadata as Record<string, unknown>)?.customer_name ?? "",
							),
							ref:
								(pi?.id as string) ??
								`str_${Date.now()}`,
							method: methodTypes.includes("upi") ? "upi" :
								 methodTypes.includes("card") ? "card" : "upi",
							source: "stripe",
						},
						recId,
					),
				);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				await prisma.webhookEvent.update({ where: { id: recId }, data: { error: msg } });
				return reply.code(500).send({ error: "Processing failed" });
			}
		},
	);

	// ── 10. EaseBuzz ──────────────────────────────────────────────────────
	// EaseBuzz Dashboard → Settings → Webhook URL
	// Reverse hash: SHA512(salt|status|udf5..udf1|email|firstname|productinfo|amount|txnid|key)
	fastify.post<{
		Params: { tenantId: string };
		Body: Record<string, unknown>;
	}>(
		"/api/v1/webhook/easebuzz/:tenantId",
		{
			config: { rateLimit: false },
			schema: { body: { type: "object", additionalProperties: true } },
		},
		async (request, reply) => {
			const { tenantId } = request.params;
			const body = request.body;

			const tenant = await prisma.tenant.findUnique({
				where: { id: tenantId },
				select: { id: true, settings: true },
			});
			if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

			const saltKey = (
				(tenant.settings as Record<string, unknown>) ?? {}
			)["easebuzzSalt"] as string | undefined;

			if (saltKey && body?.hash) {
				const f = (k: string) => String(body?.[k] ?? "");
				const reverseStr = [
					saltKey, f("status"),
					f("udf5"), f("udf4"), f("udf3"), f("udf2"), f("udf1"),
					f("email"), f("phone"), f("productinfo"),
					f("amount"), f("txnid"), f("key"),
				].join("|");
				const expected = crypto.createHash("sha512").update(reverseStr).digest("hex");
				if (body.hash !== expected) {
					logger.warn({ tenantId }, "EaseBuzz: bad hash");
					return reply.code(401).send({ error: "Invalid hash" });
				}
			}

			if (body?.status !== "success")
				return reply.send({ status: "ignored" });

			const amtRs = parseFloat(String(body?.amount ?? 0));
			if (!amtRs || amtRs <= 0)
				return reply.code(400).send({ error: "Zero amount" });

			const recId = await storeEvent(tenantId, "easebuzz", "success", body);
			try {
				return reply.send(
					await processUpiPayment(
						tenantId,
						{
							amount: amtRs,
							phone: String(body?.phone ?? "").replace(/\D/g, ""),
							name: String(body?.firstname ?? ""),
							ref:
								(body?.easepayid as string) ??
								(body?.txnid as string) ??
								`eb_${Date.now()}`,
							method: "upi",
							source: "easebuzz",
						},
						recId,
					),
				);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				await prisma.webhookEvent.update({ where: { id: recId }, data: { error: msg } });
				return reply.code(500).send({ error: "Processing failed" });
			}
		},
	);

	// ── 11. BharatPe ──────────────────────────────────────────────────────
	// BharatPe Merchant Dashboard → Settings → Webhook URL
	// Header: x-bharatpe-signature = HMAC-SHA256-hex(secret, rawBody)
	// Event:  status = SUCCESS
	fastify.post<{
		Params: { tenantId: string };
		Body: Record<string, unknown>;
	}>(
		"/api/v1/webhook/bharatpe/:tenantId",
		{
			config: { rateLimit: false },
			schema: { body: { type: "object", additionalProperties: true } },
		},
		async (request, reply) => {
			const { tenantId } = request.params;
			const body = request.body;

			const tenant = await prisma.tenant.findUnique({
				where: { id: tenantId },
				select: { id: true, settings: true },
			});
			if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

			const secret = (
				(tenant.settings as Record<string, unknown>) ?? {}
			)["bharatpeWebhookSecret"] as string | undefined;
			const sig = request.headers["x-bharatpe-signature"] as string | undefined;

			if (secret && sig) {
				const expected = hmac256hex(secret, JSON.stringify(body));
				if (sig !== expected) {
					logger.warn({ tenantId }, "BharatPe: bad signature");
					return reply.code(401).send({ error: "Invalid signature" });
				}
			}

			// BharatPe sends status in multiple shapes
			const status = String(
				body?.status ??
				(body?.data as Record<string, unknown>)?.status ??
				"",
			).toUpperCase();
			if (!status.includes("SUCCESS"))
				return reply.send({ status: "ignored" });

			const data = (body?.data ?? body) as Record<string, unknown>;
			const paise = data?.amount as number | undefined;
			const amtRs =
				typeof paise === "number" && paise > 100
					? paise / 100 // BharatPe sometimes sends paise
					: parseFloat(String(paise ?? 0));
			if (!amtRs || amtRs <= 0)
				return reply.code(400).send({ error: "Zero amount" });

			const recId = await storeEvent(tenantId, "bharatpe", "SUCCESS", body);
			try {
				return reply.send(
					await processUpiPayment(
						tenantId,
						{
							amount: amtRs,
							phone: String(
								data?.mobile ?? data?.mobileNumber ?? "",
							).replace(/\D/g, ""),
							name: String(data?.payerName ?? data?.name ?? ""),
							ref:
								(data?.merchantTransactionId as string) ??
								(data?.transactionId as string) ??
								`bpe_${Date.now()}`,
							method: "upi",
							source: "bharatpe",
						},
						recId,
					),
				);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				await prisma.webhookEvent.update({ where: { id: recId }, data: { error: msg } });
				return reply.code(500).send({ error: "Processing failed" });
			}
		},
	);
}
