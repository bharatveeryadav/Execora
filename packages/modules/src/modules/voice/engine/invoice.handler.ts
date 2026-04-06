/**
 * Invoice intent handlers.
 * Covers: CREATE_INVOICE, CONFIRM_INVOICE, CANCEL_INVOICE,
 *         SHOW_PENDING_INVOICE, TOGGLE_GST, PROVIDE_EMAIL / SEND_INVOICE,
 *         ADD_DISCOUNT, SET_SUPPLY_TYPE, SET_PRICE_TIER
 */
import { logger } from '@execora/core';
import { invoiceService } from '../../invoice/invoice.service';
import { customerService } from '../../customer/customer.service';
import { ledgerService } from '../../ledger/ledger.service';
import { emailService } from '@execora/core';
import { minioClient } from '@execora/core';
import { conversationMemory } from '../conversation';
import { resolveCustomer, formatItemsSummary, sendConfirmedInvoiceEmail } from './shared';
import type { ExecutionResult } from '@execora/types';

// ── CREATE_INVOICE ───────────────────────────────────────────────────────────

/**
 * Creates a draft invoice (preview only — no DB write).
 * Stores the draft in Redis and waits for user confirmation via CONFIRM_INVOICE.
 */
export async function executeCreateInvoice(
	entities: Record<string, any>,
	conversationId?: string
): Promise<ExecutionResult> {
	const rawItems: any[] = Array.isArray(entities.items) ? entities.items : [];
	const items = rawItems
		.map((item: any) => ({
			productName: (item.productName || item.product || item.name || '').trim(),
			quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
		}))
		.filter((i) => i.productName.length > 0);

	if (items.length === 0) {
		return {
			success: false,
			message: 'Bill ke liye items batao — product name aur quantity.',
			error: 'MISSING_ITEMS',
		};
	}

	const resolution = await resolveCustomer(entities, conversationId);
	if (resolution.multiple) {
		return {
			success: false,
			message: `Multiple customers found. Please specify: ${(resolution.candidates || [])
				.slice(0, 3)
				.map((c) => c.name)
				.join(', ')}`,
			error: 'MULTIPLE_CUSTOMERS',
			data: { customers: (resolution.candidates || []).slice(0, 3) },
		};
	}
	if (!resolution.customer) {
		return {
			success: false,
			message: `Customer '${resolution.query || 'specified'}' not found. Create new customer?`,
			error: 'CUSTOMER_NOT_FOUND',
		};
	}

	const customer = resolution.customer;
	const withGst = !!(entities.withGst || entities.gst || entities.gstEnabled);
	const preview = await invoiceService.previewInvoice(customer.id, items, withGst);

	const newProductNote =
		preview.autoCreatedProducts.length > 0
			? ` (${preview.autoCreatedProducts.length} naya product catalog mein add hua — price ₹0 hai, update karo)`
			: '';
	const itemsSummary = formatItemsSummary(preview.resolvedItems);
	const gstSuffix = withGst ? ' (GST included)' : '';

	// autoSend: "bill banao aur bhej do" — skip confirmation
	if (entities.autoSend) {
		const invoice = await invoiceService.confirmInvoice(customer.id, preview.resolvedItems);
		return sendConfirmedInvoiceEmail(
			invoice,
			customer.id,
			customer.email || null,
			customer.name,
			preview.resolvedItems,
			conversationId
		);
	}

	const draft = {
		customerId: customer.id,
		customerName: customer.name,
		customerEmail: customer.email || null,
		resolvedItems: preview.resolvedItems,
		inputItems: items,
		subtotal: preview.subtotal,
		grandTotal: preview.grandTotal,
		withGst,
		autoCreatedProducts: preview.autoCreatedProducts,
		conversationId,
	};

	const draftId = await conversationMemory.addShopPendingInvoice(draft);
	const draftWithId = { ...draft, draftId };
	if (conversationId) {
		await conversationMemory.setContext(conversationId, 'pendingInvoice', draftWithId);
	}

	const allDrafts = await conversationMemory.getShopPendingInvoices();
	return {
		success: true,
		message: `${customer.name} ka draft bill ban gaya: ${itemsSummary}. Total ₹${preview.grandTotal}${gstSuffix}. Confirm karna hai?${newProductNote}`,
		data: {
			...preview,
			draftId,
			customerId: customer.id,
			customerName: customer.name,
			draft: true,
			awaitingConfirm: true,
			pendingInvoices: allDrafts,
		},
	};
}

// ── CONFIRM_INVOICE ──────────────────────────────────────────────────────────

export async function executeConfirmInvoice(
	entities: Record<string, any>,
	conversationId?: string
): Promise<ExecutionResult> {
	const sessionDraft = conversationId ? await conversationMemory.getContext(conversationId, 'pendingInvoice') : null;
	const allDrafts = await conversationMemory.getShopPendingInvoices();

	let draft: any = null;

	if (entities?.customer) {
		const cust = (entities.customer as string).toLowerCase();
		draft =
			allDrafts.find((d) => d.customerName.toLowerCase().includes(cust)) ??
			(sessionDraft?.customerName?.toLowerCase().includes(cust) ? sessionDraft : null);
	} else if (sessionDraft?.resolvedItems) {
		draft = sessionDraft;
	} else if (allDrafts.length === 1) {
		draft = allDrafts[0];
	} else if (allDrafts.length > 1) {
		const list = allDrafts.map((d) => `${d.customerName} ₹${d.grandTotal}`).join(', ');
		return {
			success: false,
			message: `Aapke ${allDrafts.length} pending bills hain: ${list}. Kaunsa confirm karein? Customer ka naam batao.`,
			data: { pendingInvoices: allDrafts, awaitingSelection: true },
			error: 'MULTIPLE_PENDING_INVOICES',
		};
	}

	if (!draft?.resolvedItems || !draft?.customerId) {
		return {
			success: false,
			message: 'Koi pending invoice draft nahi hai confirm karne ke liye. Pehle bill banao.',
			error: 'NO_PENDING_INVOICE',
		};
	}

	const invoice = await invoiceService.confirmInvoice(draft.customerId, draft.resolvedItems);

	if (draft.draftId) {
		await conversationMemory.removeShopPendingInvoice(draft.draftId);
	} else {
		await conversationMemory.setShopPendingInvoice(null);
	}
	if (conversationId) {
		await conversationMemory.setContext(conversationId, 'pendingInvoice', null);
	}

	const remaining = await conversationMemory.getShopPendingInvoices();
	const result = await sendConfirmedInvoiceEmail(
		invoice,
		draft.customerId,
		draft.customerEmail,
		draft.customerName,
		draft.resolvedItems,
		conversationId
	);
	result.data = { ...result.data, pendingInvoices: remaining };
	return result;
}

// ── CANCEL_INVOICE ───────────────────────────────────────────────────────────

export async function executeCancelInvoice(
	entities: Record<string, any>,
	conversationId?: string
): Promise<ExecutionResult> {
	// Case 1: Cancel ALL pending drafts
	if (entities?.cancelAll) {
		const allDrafts = await conversationMemory.getShopPendingInvoices();
		if (allDrafts.length === 0) {
			return { success: false, message: 'Koi pending bill draft nahi hai.', error: 'NO_PENDING_INVOICE' };
		}
		await conversationMemory.setShopPendingInvoice(null);
		if (conversationId) await conversationMemory.setContext(conversationId, 'pendingInvoice', null);
		const names = allDrafts.map((d) => d.customerName).join(', ');
		return {
			success: true,
			message: `${allDrafts.length} pending bills cancel ho gaye: ${names}.`,
			data: { pendingInvoices: [] },
		};
	}

	// Case 2: Cancel specific draft by customer name
	const allDrafts = await conversationMemory.getShopPendingInvoices();
	if (entities?.customer && allDrafts.length > 0) {
		const custQuery = (entities.customer as string).toLowerCase();
		const draft = allDrafts.find((d) => d.customerName.toLowerCase().includes(custQuery));
		if (draft) {
			await conversationMemory.removeShopPendingInvoice(draft.draftId);
			if (conversationId) {
				const sessionDraft = await conversationMemory.getContext(conversationId, 'pendingInvoice');
				if (sessionDraft?.draftId === draft.draftId) {
					await conversationMemory.setContext(conversationId, 'pendingInvoice', null);
				}
			}
			const remaining = await conversationMemory.getShopPendingInvoices();
			return {
				success: true,
				message: `${draft.customerName} ka draft bill cancel ho gaya.`,
				data: { pendingInvoices: remaining },
			};
		}
	}

	// Case 3: Cancel active session draft
	const sessionDraft = conversationId ? await conversationMemory.getContext(conversationId, 'pendingInvoice') : null;
	if (sessionDraft?.draftId) {
		await conversationMemory.removeShopPendingInvoice(sessionDraft.draftId);
		await conversationMemory.setContext(conversationId!, 'pendingInvoice', null);
		const remaining = await conversationMemory.getShopPendingInvoices();
		return {
			success: true,
			message: `${sessionDraft.customerName} ka draft bill cancel ho gaya.`,
			data: { pendingInvoices: remaining },
		};
	}

	// Case 4: Cancel last confirmed invoice for a customer (DB operation)
	const resolution = await resolveCustomer(entities, conversationId);
	if (resolution.multiple) {
		return {
			success: false,
			message: `Multiple customers found. Please specify: ${(resolution.candidates || [])
				.slice(0, 3)
				.map((c) => c.name)
				.join(', ')}`,
			error: 'MULTIPLE_CUSTOMERS',
			data: { customers: (resolution.candidates || []).slice(0, 3) },
		};
	}
	if (!resolution.customer) {
		return {
			success: false,
			message: `Customer '${resolution.query || 'specified'}' not found`,
			error: 'CUSTOMER_NOT_FOUND',
		};
	}

	const lastInvoice = await invoiceService.getLastInvoice(resolution.customer.id);
	if (!lastInvoice) {
		return { success: false, message: `${resolution.customer.name} ka koi bill nahi mila.`, error: 'NO_INVOICE' };
	}
	await invoiceService.cancelInvoice(lastInvoice.id);
	return {
		success: true,
		message: `${resolution.customer.name} ka bill cancel ho gaya.`,
		data: { invoiceId: lastInvoice.id, customer: resolution.customer.name },
	};
}

// ── SHOW_PENDING_INVOICE ─────────────────────────────────────────────────────

export async function executeShowPendingInvoice(
	_entities: Record<string, any>,
	conversationId?: string
): Promise<ExecutionResult> {
	const allDrafts = await conversationMemory.getShopPendingInvoices();
	const sessionDraft = conversationId ? await conversationMemory.getContext(conversationId, 'pendingInvoice') : null;

	if (allDrafts.length === 0 && !sessionDraft) {
		return { success: false, message: 'Abhi koi pending bill draft nahi hai.', error: 'NO_PENDING_INVOICE' };
	}

	if (allDrafts.length === 1 || sessionDraft) {
		const draft = sessionDraft ?? allDrafts[0];
		const itemsSummary = formatItemsSummary(draft.resolvedItems as any[]);
		const gstSuffix = draft.withGst ? ' (GST included)' : '';
		return {
			success: true,
			message: `${draft.customerName} ka pending bill: ${itemsSummary}. Total ₹${draft.grandTotal}${gstSuffix}. Confirm karna hai?`,
			data: { draft, pendingInvoices: allDrafts },
		};
	}

	const lines = allDrafts
		.map((d, i) => `${i + 1}. ${d.customerName}: ${formatItemsSummary(d.resolvedItems)} = ₹${d.grandTotal}`)
		.join('\n');
	return {
		success: true,
		message: `${allDrafts.length} pending bills hain:\n${lines}\nKaunsa confirm karna hai?`,
		data: { pendingInvoices: allDrafts },
	};
}

// ── TOGGLE_GST ───────────────────────────────────────────────────────────────

export async function executeToggleGst(
	entities: Record<string, any>,
	conversationId?: string
): Promise<ExecutionResult> {
	const sessionDraft = conversationId ? await conversationMemory.getContext(conversationId, 'pendingInvoice') : null;
	const draft = sessionDraft ?? (await conversationMemory.getShopPendingInvoice());

	if (!draft?.inputItems || !draft?.customerId) {
		return {
			success: false,
			message: 'Koi pending bill nahi hai GST toggle karne ke liye. Pehle bill banao.',
			error: 'NO_PENDING_INVOICE',
		};
	}

	const newWithGst = !draft.withGst;
	const preview = await invoiceService.previewInvoice(draft.customerId, draft.inputItems, newWithGst);

	const updatedDraft = {
		...draft,
		resolvedItems: preview.resolvedItems,
		subtotal: preview.subtotal,
		grandTotal: preview.grandTotal,
		withGst: newWithGst,
	};

	if (conversationId) await conversationMemory.setContext(conversationId, 'pendingInvoice', updatedDraft);
	if (draft.draftId) {
		await conversationMemory.updateShopPendingInvoice(draft.draftId, updatedDraft);
	} else {
		await conversationMemory.setShopPendingInvoice(null);
		await conversationMemory.addShopPendingInvoice(updatedDraft);
	}

	const itemsSummary = formatItemsSummary(preview.resolvedItems);
	return {
		success: true,
		message: `GST ${newWithGst ? 'add kar diya' : 'hata diya'}. Updated bill: ${itemsSummary}. Total ₹${preview.grandTotal}${newWithGst ? ' (GST included)' : ''}. Confirm karna hai?`,
		data: { ...preview, customerId: draft.customerId, customerName: draft.customerName, withGst: newWithGst },
	};
}

// ── PROVIDE_EMAIL / SEND_INVOICE ─────────────────────────────────────────────

export async function executeProvideEmail(
	entities: Record<string, any>,
	conversationId?: string
): Promise<ExecutionResult> {
	const rawEmail = (entities?.email || '').trim().toLowerCase();
	if (!rawEmail || !rawEmail.includes('@')) {
		return {
			success: false,
			message: 'Valid email address nahi mila. Please email dobara batao.',
			error: 'INVALID_EMAIL',
		};
	}

	const sessionPending = conversationId
		? await conversationMemory.getContext(conversationId, 'pendingInvoiceEmail')
		: null;
	const pending = sessionPending ?? (await conversationMemory.getShopPendingEmail());

	if (!pending) {
		const active = conversationId ? await conversationMemory.getActiveCustomer(conversationId) : null;
		if (!active) {
			return {
				success: false,
				message: 'Koi pending invoice ya active customer nahi hai jiske liye email save karein.',
				error: 'NO_ACTIVE_CUSTOMER',
			};
		}
		await customerService.updateCustomer(active.id, { email: rawEmail });
		return {
			success: true,
			message: `${active.name} ka email ${rawEmail} save ho gaya.`,
			data: { customerId: active.id, email: rawEmail },
		};
	}

	await customerService.updateCustomer(pending.customerId, { email: rawEmail });

	// Refresh presigned URL if PDF was already uploaded
	let freshPdfUrl: string | undefined = pending.pdfUrl || undefined;
	if (pending.pdfObjectKey) {
		try {
			freshPdfUrl = await minioClient.getPresignedUrl(pending.pdfObjectKey, 7 * 24 * 60 * 60);
			await invoiceService.savePdfUrl(pending.invoiceId, pending.pdfObjectKey, freshPdfUrl);
		} catch (err) {
			logger.error({ err, invoiceId: pending.invoiceId }, 'Failed to refresh invoice PDF presigned URL');
		}
	}

	const shopName = process.env.SHOP_NAME || 'Execora Shop';
	await emailService.sendInvoiceEmail(
		rawEmail,
		pending.customerName,
		pending.invoiceId,
		pending.items,
		pending.total,
		shopName,
		undefined,
		freshPdfUrl,
		pending.invoiceNo || pending.invoiceId
	);

	if (conversationId) await conversationMemory.setContext(conversationId, 'pendingInvoiceEmail', null);
	await conversationMemory.setShopPendingEmail(null);

	logger.info(
		{ conversationId, customerId: pending.customerId, email: rawEmail },
		'Invoice email sent after PROVIDE_EMAIL turn'
	);

	return {
		success: true,
		message: `Invoice email ${rawEmail} par bhej diya gaya. ${pending.customerName} ka email bhi save ho gaya.`,
		data: {
			invoiceId: pending.invoiceId,
			customerName: pending.customerName,
			email: rawEmail,
			total: pending.total,
		},
	};
}

// ── ADD_DISCOUNT ──────────────────────────────────────────────────────────────
// "10% discount karo" / "200 rupay kam karo bill mein"

export async function executeAddDiscount(
	entities: Record<string, any>,
	conversationId?: string
): Promise<ExecutionResult> {
	const sessionDraft = conversationId ? await conversationMemory.getContext(conversationId, 'pendingInvoice') : null;
	const draft = sessionDraft ?? (await conversationMemory.getShopPendingInvoice());

	if (!draft?.resolvedItems || !draft?.customerId) {
		return {
			success: false,
			message: 'Koi pending bill nahi hai discount ke liye. Pehle bill banao.',
			error: 'NO_PENDING_INVOICE',
		};
	}

	const discountPercent: number | undefined = entities?.discountPercent ?? entities?.percent;
	const discountAmount: number | undefined = entities?.discountAmount ?? entities?.amount;
	const targetProduct: string | undefined = entities?.product;

	if (!discountPercent && !discountAmount) {
		return {
			success: false,
			message: 'Discount amount ya percent batao. Jaise "10% discount" ya "₹50 kam karo".',
			error: 'MISSING_DISCOUNT',
		};
	}

	// ── Per-item discount (S9-04) ──────────────────────────────────────
	if (targetProduct && draft.resolvedItems?.length) {
		const normalizedTarget = targetProduct.toLowerCase().replace(/\s+/g, '');
		const matchedIdx = (draft.resolvedItems as any[]).findIndex((it: any) => {
			const name: string = (it.productName ?? it.name ?? '').toLowerCase().replace(/\s+/g, '');
			return name.includes(normalizedTarget) || normalizedTarget.includes(name.slice(0, 4));
		});
		if (matchedIdx === -1) {
			return {
				success: false,
				message: `"${targetProduct}" ye item pending bill mein nahi mila.`,
				error: 'ITEM_NOT_FOUND',
			};
		}
		const updatedItems = (draft.resolvedItems as any[]).map((it: any, idx: number) => {
			if (idx !== matchedIdx) return it;
			const qty: number = it.quantity ?? 1;
			const price: number = it.unitPrice ?? 0;
			const pct: number = discountPercent && discountPercent > 0 ? discountPercent : 0;
			const flat: number = discountAmount && discountAmount > 0 ? discountAmount : 0;
			const effective = pct > 0 ? price * (1 - pct / 100) : Math.max(0, price - flat / qty);
			const newTotal = Math.round(effective * qty * 100) / 100;
			return {
				...it,
				discountPercent: pct > 0 ? pct : undefined,
				discountAmount: flat > 0 ? flat : undefined,
				total: newTotal,
			};
		});
		const newSubtotal = (updatedItems as any[]).reduce((s: number, it: any) => s + (it.total ?? 0), 0);
		const newGrandTotal = Math.round(newSubtotal * 100) / 100;
		const discountLabel = discountPercent ? `${discountPercent}%` : `₹${discountAmount}`;
		const itemName = (draft.resolvedItems as any[])[matchedIdx]?.productName ?? targetProduct;
		const updatedDraft = {
			...draft,
			resolvedItems: updatedItems,
			subtotal: newSubtotal,
			grandTotal: newGrandTotal,
		};
		if (conversationId) await conversationMemory.setContext(conversationId, 'pendingInvoice', updatedDraft);
		if (draft.draftId) await conversationMemory.updateShopPendingInvoice(draft.draftId, updatedDraft);
		return {
			success: true,
			message: `${itemName} pe ${discountLabel} discount apply ho gaya. Naya total ₹${newGrandTotal}. Confirm karna hai?`,
			data: { ...updatedDraft, awaitingConfirm: true },
		};
	}

	// ── Whole-bill discount (original logic) ─────────────────────────────
	const subtotal = draft.subtotal as number;
	let discountAmt = 0;
	let discountLabel = '';
	if (discountAmount && discountAmount > 0) {
		discountAmt = Math.min(discountAmount, subtotal);
		discountLabel = `₹${discountAmt}`;
	} else if (discountPercent && discountPercent > 0) {
		discountAmt = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
		discountLabel = `${discountPercent}%`;
	}

	const newGrandTotal = Math.round((draft.grandTotal - discountAmt) * 100) / 100;
	const updatedDraft = { ...draft, discountAmt, discountPercent, grandTotal: newGrandTotal };

	if (conversationId) await conversationMemory.setContext(conversationId, 'pendingInvoice', updatedDraft);
	if (draft.draftId) await conversationMemory.updateShopPendingInvoice(draft.draftId, updatedDraft);

	return {
		success: true,
		message: `${discountLabel} discount apply ho gaya. Naya total ₹${newGrandTotal}. Confirm karna hai?`,
		data: { ...updatedDraft, discountAmt, discountLabel, awaitingConfirm: true },
	};
}

// ── SET_SUPPLY_TYPE ───────────────────────────────────────────────────────────
// "inter-state bill banao" / "IGST lagao" — switches supply type on pending draft

export async function executeSetSupplyType(
	entities: Record<string, any>,
	conversationId?: string
): Promise<ExecutionResult> {
	const sessionDraft = conversationId ? await conversationMemory.getContext(conversationId, 'pendingInvoice') : null;
	const draft = sessionDraft ?? (await conversationMemory.getShopPendingInvoice());

	if (!draft?.inputItems || !draft?.customerId) {
		return {
			success: false,
			message: 'Koi pending bill nahi hai supply type change karne ke liye.',
			error: 'NO_PENDING_INVOICE',
		};
	}

	const supplyType: 'INTRASTATE' | 'INTERSTATE' =
		entities?.supplyType === 'INTERSTATE' || entities?.interstate || entities?.igst ? 'INTERSTATE' : 'INTRASTATE';

	const withGst = true; // Supply type only matters when GST is on
	const preview = await invoiceService.previewInvoice(
		draft.customerId,
		draft.inputItems,
		withGst,
		supplyType,
		draft.discountPercent
	);

	const updatedDraft = {
		...draft,
		resolvedItems: preview.resolvedItems,
		subtotal: preview.subtotal,
		grandTotal: preview.grandTotal,
		withGst,
		supplyType,
	};
	if (conversationId) await conversationMemory.setContext(conversationId, 'pendingInvoice', updatedDraft);
	if (draft.draftId) await conversationMemory.updateShopPendingInvoice(draft.draftId, updatedDraft);

	const taxLabel = supplyType === 'INTERSTATE' ? 'IGST' : 'CGST+SGST';
	return {
		success: true,
		message: `${supplyType === 'INTERSTATE' ? 'Inter-state' : 'Intra-state'} billing set ho gaya (${taxLabel}). Total ₹${preview.grandTotal}. Confirm karna hai?`,
		data: { ...preview, supplyType, withGst, customerId: draft.customerId, customerName: draft.customerName },
	};
}

// ── SET_PRICE_TIER ─────────────────────────────────────────────────────────────
// S12-06: "wholesale price do", "dealer price do" — UI-only; frontend sets priceTierIdx
// entities.tier: 0=retail, 1=wholesale, 2=dealer/tier2, 3=tier3

export async function executeSetPriceTier(entities: Record<string, any>): Promise<ExecutionResult> {
	const raw = entities?.tier ?? entities?.priceTier ?? entities?.tierIndex;
	const tier = typeof raw === 'number' ? Math.max(0, Math.min(3, Math.round(raw))) : 1;
	const labels = ['retail', 'wholesale', 'dealer', 'tier3'];
	return {
		success: true,
		message: `${labels[tier]} price set ho gaya. Ab naye items is price pe add honge.`,
		data: { priceTier: tier },
	};
}

// ── RECORD_MIXED_PAYMENT ──────────────────────────────────────────────────────
// "Ram ne 500 cash aur 300 UPI diye" — split payment across methods

export async function executeRecordMixedPayment(
	entities: Record<string, any>,
	conversationId?: string
): Promise<ExecutionResult> {
	const resolution = await resolveCustomer(entities, conversationId);
	if (resolution.multiple) {
		return {
			success: false,
			message: `Multiple customers found. Please specify: ${(resolution.candidates || [])
				.slice(0, 3)
				.map((c) => c.name)
				.join(', ')}`,
			error: 'MULTIPLE_CUSTOMERS',
			data: { customers: (resolution.candidates || []).slice(0, 3) },
		};
	}
	if (!resolution.customer) {
		return {
			success: false,
			message: `Customer '${resolution.query || 'specified'}' not found`,
			error: 'CUSTOMER_NOT_FOUND',
		};
	}

	const rawSplits: any[] = Array.isArray(entities?.splits) ? entities.splits : [];
	if (rawSplits.length < 2) {
		return {
			success: false,
			message: 'Mixed payment ke liye kam se kam 2 payment methods batao. Jaise "500 cash + 300 UPI".',
			error: 'MISSING_SPLITS',
		};
	}

	const splits = rawSplits
		.map((s: any) => ({
			amount: Math.round(Number(s.amount) * 100) / 100,
			method: (['cash', 'upi', 'card', 'other'].includes(s.method) ? s.method : 'cash') as
				| 'cash'
				| 'upi'
				| 'card'
				| 'other',
		}))
		.filter((s) => s.amount > 0);

	const result = await ledgerService.recordMixedPayment(resolution.customer.id, splits);
	const breakdown = splits.map((s) => `₹${s.amount} ${s.method.toUpperCase()}`).join(' + ');

	return {
		success: true,
		message: `${resolution.customer.name} ka mixed payment record ho gaya: ${breakdown}. Total ₹${result.totalAmount}.`,
		data: {
			customerId: resolution.customer.id,
			customerName: resolution.customer.name,
			splits,
			totalAmount: result.totalAmount,
		},
	};
}
