import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
	Mic,
	MicOff,
	Check,
	Edit2,
	X,
	Printer,
	MessageSquare,
	Download,
	Phone,
	Plus,
	Minus,
	Tag,
	Building2,
	Wallet,
	Users,
	Keyboard,
	ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { wsClient } from '@/lib/ws';
import { useCreateCustomer, useCreateInvoice, useCustomers, useProductByBarcode } from '@/hooks/useQueries';
import { formatCurrency, type Customer, invoiceApi, customerApi, aiApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useToast } from '@/hooks/use-toast';

type SpeechWindow = Window & {
	SpeechRecognition?: new () => {
		lang: string;
		onstart: (() => void) | null;
		onend: (() => void) | null;
		onerror: (() => void) | null;
		onresult: ((e: unknown) => void) | null;
		start: () => void;
		stop: () => void;
	};
	webkitSpeechRecognition?: new () => {
		lang: string;
		onstart: (() => void) | null;
		onend: (() => void) | null;
		onerror: (() => void) | null;
		onresult: ((e: unknown) => void) | null;
		start: () => void;
		stop: () => void;
	};
};

type Step = 'start' | 'listening' | 'processing' | 'confirmation' | 'manual' | 'customer' | 'final' | 'whatsapp';

// ── Price Tiers ───────────────────────────────────────────────────────────────
const DEFAULT_PRICE_TIERS = [
	{ name: 'Retail', disc: 0 },
	{ name: 'Wholesale', disc: 15 },
	{ name: 'Dealer', disc: 25 },
];

function loadPriceTiers(): typeof DEFAULT_PRICE_TIERS {
	try {
		return JSON.parse(localStorage.getItem('execora:pricetiers') ?? 'null') ?? DEFAULT_PRICE_TIERS;
	} catch {
		return DEFAULT_PRICE_TIERS;
	}
}
type SupplyType = 'INTRASTATE' | 'INTERSTATE';

interface InvoiceItem {
	name: string;
	qty: string;
	price: number;
	discount: number; // % per item 0-100
	total: number;
}

interface InvoiceCreationProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Open directly in manual billing mode for this customer (skips start screen) */
	repeatForCustomer?: Customer;
	/** Pre-fill items from a previous invoice (for "Repeat last order") */
	repeatItems?: Array<{ name: string; qty: string; price: number; discount: number; total: number }>;
	/** Skip start screen — go straight to manual items table with Walk-in customer pre-selected (1-tap billing) */
	startAsWalkIn?: boolean;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function calcDiscount(subtotal: number, pct: number, flat: number): number {
	if (flat > 0) return Math.min(flat, subtotal);
	if (pct > 0) return Math.round(subtotal * (pct / 100) * 100) / 100;
	return 0;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// ── component ─────────────────────────────────────────────────────────────────

const InvoiceCreation = ({
	open,
	onOpenChange,
	repeatForCustomer,
	repeatItems: repeatItemsProp,
	startAsWalkIn,
}: InvoiceCreationProps) => {
	const [step, setStep] = useState<Step>('start');
	const [progress, setProgress] = useState(0);
	const [items, setItems] = useState<InvoiceItem[]>([]);
	const [transcript, setTranscript] = useState('');
	const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
	const [createdInvoiceNo, setCreatedInvoiceNo] = useState('');
	const [whatsappSent, setWhatsappSent] = useState(false);
	const [isListening, setIsListening] = useState(false);
	const [customerSearch, setCustomerSearch] = useState('');
	const [error, setError] = useState('');
	const [creditLimitCtx, setCreditLimitCtx] = useState<null | {
		customerId: string;
		items: Array<{ productName: string; quantity: number }>;
		opts: Record<string, unknown>;
		customerName: string;
		limit: number;
		balance: number;
		invoiceAmount: number;
	}>(null);

	// ── billing options ──────────────────────────────────────────────────────
	const [withGst, setWithGst] = useState(false);
	const [supplyType, setSupplyType] = useState<SupplyType>('INTRASTATE');
	const [discountPct, setDiscountPct] = useState(0);
	const [discountFlat, setDiscountFlat] = useState(0);
	const [isProforma, setIsProforma] = useState(false);
	const [priceTierIdx, setPriceTierIdx] = useState<number | null>(null);
	const priceTiers = useMemo(() => loadPriceTiers(), []);
	const [buyerGstin, setBuyerGstin] = useState('');
	const [placeOfSupply, setPlaceOfSupply] = useState('');
	// Partial payment at billing (voice flow — single method)
	const [partialAmount, setPartialAmount] = useState(0);
	const [partialMethod, setPartialMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash');
	// Split payment (manual billing — cash + UPI + card individually)
	const [splitCash, setSplitCash] = useState(0);
	const [splitUpi, setSplitUpi] = useState(0);
	const [splitCard, setSplitCard] = useState(0);
	// Inline customer selection for manual step (no page-flip)
	const [inlineCustomer, setInlineCustomer] = useState<Customer | null>(null);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const recognitionRef = useRef<{ stop: () => void; onend: (() => void) | null } | null>(null);
	const canStreamAudioRef = useRef(false);

	const createInvoice = useCreateInvoice();
	const createCustomer = useCreateCustomer();
	const { data: customers = [] } = useCustomers(customerSearch);
	const qc = useQueryClient();
	const { toast } = useToast();
	const lookupByBarcode = useProductByBarcode();
	const [invoiceScannerOpen, setInvoiceScannerOpen] = useState(false);

	/** Scan barcode → look up product → add row to invoice items */
	const handleInvoiceBarcodeScan = async (code: string) => {
		setInvoiceScannerOpen(false);
		try {
			const res = await lookupByBarcode.mutateAsync(code);
			if (res?.product) {
				const p = res.product;
				const price = parseFloat(String(p.price));
				setItems((prev) => {
					// If item already in list, increment qty
					const existingIdx = prev.findIndex((it) => it.name === p.name);
					if (existingIdx >= 0) {
						return prev.map((it, i) => {
							if (i !== existingIdx) return it;
							const qty = parseInt(it.qty) + 1;
							return { ...it, qty: String(qty), total: Math.round(price * qty * 100) / 100 };
						});
					}
					// New item
					return [...prev, { name: p.name, qty: '1', price, discount: 0, total: price }];
				});
			}
		} catch {
			setError(`Product not found for barcode: ${code}`);
		}
	};

	// ── totals ────────────────────────────────────────────────────────────────
	const subtotal = items.reduce((s, i) => s + i.total, 0);
	const gstAmt = withGst ? Math.round(subtotal * 0.05) : 0; // simplified 5% preview
	const discountAmt = calcDiscount(subtotal, discountPct, discountFlat);
	const total = Math.round((subtotal + gstAmt - discountAmt) * 100) / 100;
	const balanceDue = Math.max(0, total - partialAmount);

	// ── audio cleanup ─────────────────────────────────────────────────────────
	const cleanupAudio = useCallback(() => {
		canStreamAudioRef.current = false;
		if (recognitionRef.current) {
			recognitionRef.current.onend = null;
			recognitionRef.current.stop();
			recognitionRef.current = null;
		}
		if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
		mediaRecorderRef.current = null;
		mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
		mediaStreamRef.current = null;
		setIsListening(false);
	}, []);

	// ── reset on open/close ───────────────────────────────────────────────────
	useEffect(() => {
		if (open) {
			setStep('start');
			setProgress(0);
			setItems([]);
			setTranscript('');
			setSelectedCustomer(null);
			setCreatedInvoiceNo('');
			setWhatsappSent(false);
			setError('');
			setWithGst(false);
			setSupplyType('INTRASTATE');
			setDiscountPct(0);
			setDiscountFlat(0);
			setPartialAmount(0);
			setPartialMethod('cash');
			setSplitCash(0);
			setSplitUpi(0);
			setSplitCard(0);
			setIsProforma(false);
			setPriceTierIdx(null);
			setBuyerGstin('');
			setPlaceOfSupply('');
			// Repeat / pre-fill mode
			if (repeatForCustomer) {
				setStep('manual');
				setInlineCustomer(repeatForCustomer);
				if (repeatItemsProp?.length) setItems(repeatItemsProp);
			} else if (startAsWalkIn) {
				// Jump straight to manual step — walk-in customer resolved async below
				setStep('manual');
				setInlineCustomer(null);
				setCustomerSearch('');
			} else {
				setInlineCustomer(null);
				setCustomerSearch('');
			}
		} else {
			cleanupAudio();
			wsClient.send('voice:stop');
		}
	}, [open, cleanupAudio]); // eslint-disable-line react-hooks/exhaustive-deps

	// ── Auto-select walk-in customer when opened in 1-tap mode ───────────────
	useEffect(() => {
		if (open && startAsWalkIn) {
			void handleWalkInCustomer();
		}
	}, [open, startAsWalkIn]); // eslint-disable-line react-hooks/exhaustive-deps

	// ── WebSocket events ──────────────────────────────────────────────────────
	useEffect(() => {
		if (!open) return;
		const offs = [
			wsClient.on('voice:response', (msg) => {
				const payload = msg as {
					data?: {
						text?: string;
						intent?: string;
						executionResult?: {
							data?: {
								resolvedItems?: {
									productName: string;
									quantity: number;
									unitPrice?: number;
									total?: number;
								}[];
								customerName?: string;
								discountAmt?: number;
								discountPercent?: number;
								withGst?: boolean;
								supplyType?: string;
								invoiceNo?: string;
								invoiceId?: string;
							};
						};
					};
					text?: string;
					intent?: string;
				};
				const text = payload.data?.text ?? payload.text ?? '';
				setTranscript(text);
				const intent = payload.data?.intent ?? payload.intent ?? '';
				const execData = payload.data?.executionResult?.data ?? {};

				// ── Intent-specific state updates (don't advance step) ────────────
				if (intent === 'ADD_DISCOUNT') {
					if (execData.discountPercent && execData.discountPercent > 0) {
						setDiscountPct(execData.discountPercent);
						setDiscountFlat(0);
					} else if (execData.discountAmt && execData.discountAmt > 0) {
						setDiscountFlat(execData.discountAmt);
						setDiscountPct(0);
					}
					return;
				}
				if (intent === 'TOGGLE_GST') {
					if (execData.withGst !== undefined) setWithGst(execData.withGst);
					return;
				}
				if (intent === 'SET_SUPPLY_TYPE') {
					if (execData.supplyType) setSupplyType(execData.supplyType as SupplyType);
					return;
				}
				// Belt-and-suspenders: advance to final if invoice:confirmed was missed
				if (intent === 'CONFIRM_INVOICE' || intent === 'SEND_INVOICE') {
					if (execData.invoiceNo || execData.invoiceId) {
						setCreatedInvoiceNo(execData.invoiceNo ?? execData.invoiceId ?? '');
						if (execData.customerName) {
							setSelectedCustomer({
								id: execData.invoiceId ?? '',
								name: execData.customerName,
								balance: 0,
							} as Customer);
						}
						setStep('final');
					}
					return;
				}

				// Default: populate items and show confirmation
				const resolvedItems = execData.resolvedItems;
				if (resolvedItems?.length) {
					setItems(
						resolvedItems.map((it) => {
							const pct: number = (it as any).discountPercent ?? 0;
							const qty = it.quantity;
							const price = it.unitPrice ?? 0;
							const baseTotal = it.total ?? price * qty;
							const total = pct > 0 ? Math.round(price * qty * (1 - pct / 100) * 100) / 100 : baseTotal;
							return { name: it.productName, qty: String(qty), price, discount: pct, total };
						})
					);
				}
				setStep('confirmation');
			}),
			wsClient.on('voice:thinking', () => {
				setStep('processing');
				setProgress(30);
			}),
			wsClient.on('voice:transcript', (msg) => {
				const payload = msg as { text?: string; isFinal?: boolean; data?: { text?: string } };
				const text = payload.data?.text ?? payload.text ?? '';
				if (text) setTranscript(text);
			}),
			wsClient.on('invoice:draft', (msg) => {
				const payload = msg as {
					data?: {
						resolvedItems?: { productName: string; quantity: number; unitPrice?: number; total?: number }[];
						items?: { productName: string; quantity: number; unitPrice?: number }[];
						withGst?: boolean;
						supplyType?: string;
						discountAmt?: number;
						discountPercent?: number;
					};
				};
				const d = payload.data ?? {};
				const rawItems = d.resolvedItems ?? d.items;
				if (rawItems?.length) {
					setItems(
						rawItems.map((it) => {
							const pct: number = (it as any).discountPercent ?? 0;
							const qty = it.quantity;
							const price = it.unitPrice ?? 0;
							const baseTotal = (it as { total?: number }).total ?? price * qty;
							const total = pct > 0 ? Math.round(price * qty * (1 - pct / 100) * 100) / 100 : baseTotal;
							return { name: it.productName, qty: String(qty), price, discount: pct, total };
						})
					);
				}
				// Sync billing options from the backend draft
				if (d.withGst !== undefined) setWithGst(d.withGst);
				if (d.supplyType) setSupplyType(d.supplyType as SupplyType);
				if (d.discountPercent && d.discountPercent > 0) {
					setDiscountPct(d.discountPercent);
					setDiscountFlat(0);
				} else if (d.discountAmt && d.discountAmt > 0) {
					setDiscountFlat(d.discountAmt);
					setDiscountPct(0);
				}
				setStep('confirmation');
			}),
			// invoice:confirmed arrives immediately after CONFIRM_INVOICE executes (before LLM)
			wsClient.on('invoice:confirmed', (msg) => {
				const payload = msg as { data?: { invoiceNo?: string; invoiceId?: string; customerName?: string } };
				const d = payload.data ?? {};
				if (d.invoiceNo) setCreatedInvoiceNo(d.invoiceNo);
				if (d.customerName) {
					setSelectedCustomer({ id: d.invoiceId ?? '', name: d.customerName, balance: 0 } as Customer);
				}
				setStep('final');
				void qc.invalidateQueries({ queryKey: ['invoices'] });
				void qc.invalidateQueries({ queryKey: ['customers'] });
				void qc.invalidateQueries({ queryKey: ['summary'] });
			}),
			// Backend error (STT unavailable, OpenAI timeout, business engine crash, etc.)
			// Without this the dialog stays stuck at "processing" forever.
			wsClient.on('error', (msg) => {
				const payload = msg as { data?: { error?: string; message?: string } };
				const errMsg =
					payload.data?.error ?? payload.data?.message ?? 'Something went wrong. Please try again.';
				setError(errMsg);
				setStep('start');
				setProgress(0);
				cleanupAudio();
			}),
		];
		return () => offs.forEach((off) => off());
	}, [open, qc, cleanupAudio]);

	// ── progress animation + stuck-at-processing timeout ─────────────────────
	useEffect(() => {
		if (step !== 'processing') return;
		const animId = setInterval(() => setProgress((p) => Math.min(95, p + 2)), 100);
		// If neither invoice:draft nor voice:response arrives within 20 s, reset
		const timeoutId = setTimeout(() => {
			setError('Processing took too long. Please try again.');
			setStep('start');
			setProgress(0);
			cleanupAudio();
		}, 20_000);
		return () => {
			clearInterval(animId);
			clearTimeout(timeoutId);
		};
	}, [step, cleanupAudio]);

	// ── voice input ───────────────────────────────────────────────────────────
	const startVoiceInput = useCallback(async () => {
		setError('');
		if (!wsClient.isConnected) {
			wsClient.connect();
			const ok = await wsClient.waitForOpen(1500);
			if (!ok) {
				setError('Could not connect to voice server.');
				return;
			}
		}

		// Helper: send voice:start and wait for the backend to confirm session ready
		const waitForSession = (audioFormat: 'pcm' | 'webm'): Promise<boolean> =>
			new Promise((resolve) => {
				const finish = (ok: boolean) => {
					clearTimeout(timer);
					offOk();
					offErr();
					resolve(ok);
				};
				const timer = setTimeout(() => finish(false), 5000);
				const offOk = wsClient.on('voice:started', () => finish(true));
				const offErr = wsClient.on('error', () => finish(false));
				wsClient.send('voice:start', { audioFormat, sampleRate: 16000 });
			});

		// ── SpeechRecognition fallback (no getUserMedia API) ─────────────────────
		if (!navigator.mediaDevices?.getUserMedia) {
			const speechWindow = window as unknown as SpeechWindow;
			const SR = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
			if (!SR) {
				setError('Voice not supported. Please type your invoice.');
				return;
			}
			const rec = new SR();
			rec.lang = navigator.language?.startsWith('hi') ? 'hi-IN' : navigator.language || 'hi-IN';
			rec.onend = () => {
				setIsListening(false);
				setStep('processing');
			};
			rec.onerror = () => {
				setIsListening(false);
				setError('Voice error. Please try again.');
				setStep('start');
			};
			rec.onresult = (e: unknown) => {
				const results = (e as { results?: ArrayLike<ArrayLike<{ transcript?: string }>> })?.results;
				const text = results?.[0]?.[0]?.transcript ?? '';
				if (!text) return;
				setTranscript(text);
				wsClient.send('voice:final', { text });
				setStep('processing');
				setProgress(30);
			};
			recognitionRef.current = rec;
			wsClient.send('voice:start', { audioFormat: 'webm', sampleRate: 16000 });
			setIsListening(true);
			setStep('listening');
			setProgress(0);
			rec.start();
			return;
		}

		let stream: MediaStream;
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
					channelCount: 1,
					sampleRate: { ideal: 16000, max: 48000 },
				},
			});
		} catch {
			setError('Microphone permission denied.');
			return;
		}
		mediaStreamRef.current = stream;

		// ── Path A: AudioWorklet PCM 16kHz — required by ElevenLabs, also works with Deepgram ──
		const supportsWorklet = typeof AudioContext !== 'undefined' && typeof AudioWorklet !== 'undefined';
		if (supportsWorklet) {
			try {
				const audioCtx = new AudioContext({ sampleRate: 16000 });
				const source = audioCtx.createMediaStreamSource(stream);
				await audioCtx.audioWorklet.addModule('/pcm-processor.worklet.js');
				const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');
				canStreamAudioRef.current = false;

				workletNode.port.onmessage = (e: MessageEvent<{ type: string; buffer: ArrayBuffer }>) => {
					if (e.data.type === 'audio' && canStreamAudioRef.current) wsClient.sendBinary(e.data.buffer);
				};

				const sessionReady = await waitForSession('pcm');
				if (!sessionReady) {
					await audioCtx.close();
					stream.getTracks().forEach((t) => t.stop());
					mediaStreamRef.current = null;
					setError("Voice session didn't start. Check server connection.");
					setStep('start');
					return;
				}

				source.connect(workletNode);
				canStreamAudioRef.current = true;
				setIsListening(true);
				setStep('listening');
				setProgress(0);

				// Expose stop() so cleanupAudio() can tear down the worklet pipeline
				const pcmStop = () => {
					canStreamAudioRef.current = false;
					source.disconnect();
					workletNode.disconnect();
					audioCtx.close().catch(() => {});
					setIsListening(false);
				};
				mediaRecorderRef.current = { stop: pcmStop, state: 'recording' } as unknown as MediaRecorder;
				return;
			} catch {
				// AudioWorklet failed (file missing, browser restriction) — fall through to MediaRecorder
				stream.getTracks().forEach((t) => t.stop());
				try {
					stream = await navigator.mediaDevices.getUserMedia({
						audio: {
							echoCancellation: true,
							noiseSuppression: true,
							autoGainControl: true,
							channelCount: 1,
						},
					});
					mediaStreamRef.current = stream;
				} catch {
					setError('Microphone permission denied.');
					return;
				}
			}
		}

		// ── Path B: MediaRecorder WebM — fallback, only works with Deepgram ─────
		const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : undefined;
		const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
		mediaRecorderRef.current = recorder;
		canStreamAudioRef.current = false;
		recorder.ondataavailable = (e: BlobEvent) => {
			if (e.data.size > 0 && wsClient.isConnected && canStreamAudioRef.current) wsClient.sendBinary(e.data);
		};
		recorder.onstop = () => {
			canStreamAudioRef.current = false;
			setIsListening(false);
		};

		const sessionReady = await waitForSession('webm');
		if (!sessionReady) {
			stream.getTracks().forEach((t) => t.stop());
			mediaStreamRef.current = null;
			mediaRecorderRef.current = null;
			setError("Voice session didn't start.");
			setStep('start');
			return;
		}

		canStreamAudioRef.current = true;
		recorder.start(250);
		setIsListening(true);
		setStep('listening');
		setProgress(0);
	}, []);

	const stopVoiceInput = useCallback(() => {
		cleanupAudio();
		wsClient.send('recording:stop');
		wsClient.send('voice:stop');
		setStep('processing');
		setProgress(30);
	}, [cleanupAudio]);

	// ── handlers ──────────────────────────────────────────────────────────────
	const handleConfirm = () => setStep('customer');

	const handleSelectCustomer = async (c: Customer) => {
		setSelectedCustomer(c);
		setStep('final');

		const invItems =
			items.length > 0
				? items.map((it) => ({ productName: it.name, quantity: parseInt(it.qty) || 1 }))
				: [{ productName: 'General Items', quantity: 1 }];

		const opts = {
			withGst: withGst || undefined,
			supplyType: supplyType !== 'INTRASTATE' ? supplyType : undefined,
			discountPercent: discountPct > 0 ? discountPct : undefined,
			discountAmount: discountPct === 0 && discountFlat > 0 ? discountFlat : undefined,
			buyerGstin: buyerGstin.trim() || undefined,
			placeOfSupply: placeOfSupply.trim() || undefined,
			initialPayment: partialAmount > 0 ? { amount: partialAmount, method: partialMethod } : undefined,
		};

		try {
			let res: { invoice?: { invoiceNo?: string } };
			if (isProforma) {
				res = await invoiceApi.proforma({ customerId: c.id, items: invItems, ...opts });
				setCreatedInvoiceNo(res.invoice?.invoiceNo ?? 'PRO-NEW');
			} else {
				res = await createInvoice.mutateAsync({ customerId: c.id, items: invItems, ...opts });
				setCreatedInvoiceNo(res.invoice?.invoiceNo ?? 'INV-NEW');
			}
			void qc.invalidateQueries({ queryKey: ['invoices'] });
		} catch (err: unknown) {
			const e = err as {
				body?: {
					error?: string;
					customerName?: string;
					limit?: number;
					currentBalance?: number;
					invoiceAmount?: number;
				};
			};
			if (e?.body?.error === 'CREDIT_LIMIT_EXCEEDED') {
				setStep('customer'); // go back so user can see
				setCreditLimitCtx({
					customerId: c.id,
					items: invItems,
					opts,
					customerName: e.body.customerName ?? c.name,
					limit: e.body.limit ?? 0,
					balance: e.body.currentBalance ?? 0,
					invoiceAmount: e.body.invoiceAmount ?? 0,
				});
			} else {
				setError('Invoice saved locally. Sync may be pending.');
			}
		}
	};

	const handleWhatsApp = () => {
		setStep('whatsapp');
		setTimeout(() => setWhatsappSent(true), 1500);
	};

	const handlePrintInvoice = () => {
		if (items.length === 0) {
			setError('Nothing to print. Add items first.');
			return;
		}

		const invoiceLabel = createdInvoiceNo || (isProforma ? 'PRO-DRAFT' : 'INV-DRAFT');
		const customerName = selectedCustomer?.name ?? 'Walk-in Customer';
		const customerPhone = selectedCustomer?.phone ?? '';
		const issueDate = new Date().toLocaleString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});

		const rows = items
			.map(
				(item, index) => `
				<tr>
					<td>${index + 1}</td>
					<td>${escapeHtml(item.name || 'Item')}</td>
					<td>${escapeHtml(item.qty)}</td>
					<td style="text-align:right">₹${Number(item.price || 0).toFixed(2)}</td>
					<td style="text-align:right">₹${Number(item.total || 0).toFixed(2)}</td>
				</tr>`
			)
			.join('');

		const printWindow = window.open('', '_blank', 'width=900,height=700');
		if (!printWindow) {
			setError('Unable to open print window. Please allow popups and try again.');
			return;
		}

		const html = `
		<!doctype html>
		<html>
		<head>
			<meta charset="utf-8" />
			<title>${isProforma ? 'Proforma' : 'Invoice'} ${escapeHtml(invoiceLabel)}</title>
			<style>
				body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
				h1 { margin: 0 0 6px; font-size: 20px; }
				p { margin: 2px 0; font-size: 12px; }
				table { width: 100%; border-collapse: collapse; margin-top: 14px; }
				th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
				th { background: #f3f4f6; text-align: left; }
				.right { text-align: right; }
				.summary { margin-top: 14px; width: 320px; margin-left: auto; }
				.summary td { border: none; padding: 4px 0; }
				.total { font-weight: 700; border-top: 1px solid #9ca3af; padding-top: 6px; }
				.note { margin-top: 16px; font-size: 11px; color: #6b7280; }
				@media print {
					body { margin: 10mm; }
				}
			</style>
		</head>
		<body>
			<h1>${isProforma ? 'Proforma / Quotation' : 'Tax Invoice'}</h1>
			<p><strong>No:</strong> ${escapeHtml(invoiceLabel)}</p>
			<p><strong>Date:</strong> ${issueDate}</p>
			<p><strong>Customer:</strong> ${escapeHtml(customerName)}${customerPhone ? ` (${escapeHtml(customerPhone)})` : ''}</p>
			${buyerGstin ? `<p><strong>GSTIN:</strong> ${escapeHtml(buyerGstin)}</p>` : ''}

			<table>
				<thead>
					<tr>
						<th style="width:44px">#</th>
						<th>Item</th>
						<th style="width:70px">Qty</th>
						<th style="width:110px" class="right">Rate</th>
						<th style="width:120px" class="right">Amount</th>
					</tr>
				</thead>
				<tbody>${rows}</tbody>
			</table>

			<table class="summary">
				<tr><td>Subtotal</td><td class="right">₹${subtotal.toFixed(2)}</td></tr>
				${withGst ? `<tr><td>GST</td><td class="right">₹${gstAmt.toFixed(2)}</td></tr>` : ''}
				${discountAmt > 0 ? `<tr><td>Discount</td><td class="right">-₹${discountAmt.toFixed(2)}</td></tr>` : ''}
				<tr><td class="total">Total</td><td class="right total">₹${total.toFixed(2)}</td></tr>
				${partialAmount > 0 ? `<tr><td>Paid</td><td class="right">₹${partialAmount.toFixed(2)}</td></tr>` : ''}
				${partialAmount > 0 ? `<tr><td><strong>Balance Due</strong></td><td class="right"><strong>₹${balanceDue.toFixed(2)}</strong></td></tr>` : ''}
			</table>

			<p class="note">Generated by Execora</p>
			<script>
				window.onload = () => {
					window.print();
					setTimeout(() => window.close(), 300);
				};
			</script>
		</body>
		</html>`;

		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();
	};

	const handleWalkInCustomer = async () => {
		setError('');
		try {
			// Always do a live search so stale cache never causes a false "not found"
			const { customers: found } = await customerApi.search('Walk-in', 20);
			const existing = found.find((c: Customer) => /walk\s*-?\s*in|cash\s*customer/i.test(c.name));
			if (existing) {
				await handleSelectCustomer(existing);
				return;
			}
			// Not found — create once
			const created = await createCustomer.mutateAsync({ name: 'Walk-in Customer' });
			const walkIn = (created as { customer: Customer }).customer;
			await handleSelectCustomer(walkIn);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			// If duplicate created in a race condition, search again and use it
			if (/duplicate|already exists|unique/i.test(msg)) {
				try {
					const { customers: retry } = await customerApi.search('Walk-in', 20);
					const found2 = retry.find((c: Customer) => /walk\s*-?\s*in|cash\s*customer/i.test(c.name));
					if (found2) {
						await handleSelectCustomer(found2);
						return;
					}
				} catch {
					/* fall through */
				}
			}
			setError(`Cash Sale failed: ${msg}`);
		}
	};

	// ── Inline confirm (manual billing — single screen, no page flip) ─────────
	const handleInlineConfirm = async () => {
		setError('');
		const splitTotal = splitCash + splitUpi + splitCard;
		const dominantMethod: 'cash' | 'upi' | 'card' | 'other' =
			splitUpi >= splitCash && splitUpi >= splitCard ? 'upi' : splitCard > splitCash ? 'card' : 'cash';
		const invItems =
			items.filter((it) => it.name.trim()).length > 0
				? items
						.filter((it) => it.name.trim())
						.map((it) => ({ productName: it.name, quantity: parseInt(it.qty) || 1 }))
				: [{ productName: 'General Items', quantity: 1 }];
		const opts = {
			withGst: withGst || undefined,
			supplyType: supplyType !== 'INTRASTATE' ? supplyType : undefined,
			discountPercent: discountPct > 0 ? discountPct : undefined,
			discountAmount: discountPct === 0 && discountFlat > 0 ? discountFlat : undefined,
			buyerGstin: buyerGstin.trim() || undefined,
			placeOfSupply: placeOfSupply.trim() || undefined,
			initialPayment: splitTotal > 0 ? { amount: splitTotal, method: dominantMethod } : undefined,
		};

		const getCustomer = async (): Promise<Customer> => {
			if (inlineCustomer) return inlineCustomer;
			const { customers: found } = await customerApi.search('Walk-in', 20);
			const existing = found.find((c: Customer) => /walk\s*-?\s*in|cash\s*customer/i.test(c.name));
			if (existing) return existing;
			const created = await createCustomer.mutateAsync({ name: 'Walk-in Customer' });
			return (created as { customer: Customer }).customer;
		};

		try {
			const c = await getCustomer();

			// ── AI anomaly check (non-blocking) ─────────────────────────────────
			// Only run when we have a real (non-walk-in) customer and a non-zero total
			if (inlineCustomer && total > 0) {
				try {
					const anomaly = await aiApi.checkAnomaly(inlineCustomer.id, total);
					if (anomaly.isAnomaly && anomaly.severity !== 'none') {
						const sevLabel =
							anomaly.severity === 'high'
								? '🔴 High'
								: anomaly.severity === 'medium'
									? '🟠 Medium'
									: '🟡 Low';
						toast({
							title: `${sevLabel} anomaly detected`,
							description: anomaly.message,
							variant: 'destructive',
						});
					}
				} catch {
					// Anomaly check failure must never block invoice creation
				}
			}

			setSelectedCustomer(c);
			setStep('final');
			let res: { invoice?: { invoiceNo?: string } };
			if (isProforma) {
				res = await invoiceApi.proforma({ customerId: c.id, items: invItems, ...opts });
				setCreatedInvoiceNo(res.invoice?.invoiceNo ?? 'PRO-NEW');
			} else {
				res = await createInvoice.mutateAsync({ customerId: c.id, items: invItems, ...opts });
				setCreatedInvoiceNo(res.invoice?.invoiceNo ?? 'INV-NEW');
			}
			void qc.invalidateQueries({ queryKey: ['invoices'] });
			void qc.invalidateQueries({ queryKey: ['customers'] });
			void qc.invalidateQueries({ queryKey: ['summary'] });
		} catch (err: unknown) {
			const e = err as {
				body?: {
					error?: string;
					customerName?: string;
					limit?: number;
					currentBalance?: number;
					invoiceAmount?: number;
				};
			};
			if (e?.body?.error === 'CREDIT_LIMIT_EXCEEDED') {
				setStep('manual');
				setCreditLimitCtx({
					customerId: c.id,
					items: invItems,
					opts,
					customerName: e.body.customerName ?? c.name,
					limit: e.body.limit ?? 0,
					balance: e.body.currentBalance ?? 0,
					invoiceAmount: e.body.invoiceAmount ?? 0,
				});
			} else {
				setError('Invoice save failed. Please try again.');
				setStep('manual');
			}
		}
	};

	// ── render ────────────────────────────────────────────────────────────────
	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-lg">
							🧾 {step === 'start' && (isProforma ? 'New Quotation / Proforma' : 'New Invoice')}
							{step === 'listening' && 'Listening...'}
							{step === 'processing' && 'Processing...'}
							{step === 'confirmation' && 'Confirm Items'}
							{step === 'customer' && 'Add Customer'}
							{step === 'final' && `${isProforma ? 'Proforma' : 'Invoice'} ${createdInvoiceNo || '#NEW'}`}
							{step === 'whatsapp' && 'Share via WhatsApp'}
						</DialogTitle>
					</DialogHeader>

					{error && (
						<div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
					)}

					{/* ── STEP 1: START ─────────────────────────────────────────────── */}
					{step === 'start' && (
						<div className="flex flex-col gap-5 py-4">
							{/* Billing option toggles */}
							<div className="grid grid-cols-2 gap-2 text-xs">
								<ToggleChip
									active={withGst}
									onClick={() => setWithGst((v) => !v)}
									icon="🧾"
									label="GST Invoice"
								/>
								<ToggleChip
									active={isProforma}
									onClick={() => setIsProforma((v) => !v)}
									icon="📋"
									label="Proforma / Quote"
								/>
								{withGst && (
									<ToggleChip
										active={supplyType === 'INTERSTATE'}
										onClick={() =>
											setSupplyType((s) => (s === 'INTRASTATE' ? 'INTERSTATE' : 'INTRASTATE'))
										}
										icon="🚛"
										label={
											supplyType === 'INTERSTATE'
												? 'IGST (Inter-state)'
												: 'CGST+SGST (Intra-state)'
										}
									/>
								)}
							</div>

							{/* Price Tier selector */}
							<div className="flex items-center gap-2">
								<Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span className="text-xs text-muted-foreground whitespace-nowrap">Price List</span>
								<div className="flex gap-1 flex-wrap">
									{priceTiers.map((tier, idx) => (
										<button
											key={tier.name}
											onClick={() => {
												if (priceTierIdx === idx) {
													setPriceTierIdx(null);
													setDiscountPct(0);
													setDiscountFlat(0);
												} else {
													setPriceTierIdx(idx);
													setDiscountPct(tier.disc);
													setDiscountFlat(0);
												}
											}}
											className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
												priceTierIdx === idx
													? 'border-primary bg-primary text-primary-foreground'
													: 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
											}`}
										>
											{tier.name}
											{tier.disc > 0 && <span className="opacity-60"> -{tier.disc}%</span>}
										</button>
									))}
								</div>
							</div>

							{/* Discount row */}
							<div className="flex items-center gap-2">
								<Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span className="text-xs text-muted-foreground w-20">Discount</span>
								<div className="flex gap-1 flex-1">
									<input
										type="number"
										min={0}
										max={100}
										placeholder="% off"
										value={discountPct || ''}
										onChange={(e) => {
											setDiscountPct(Number(e.target.value));
											setDiscountFlat(0);
										}}
										className="w-20 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
									/>
									<span className="text-xs text-muted-foreground self-center">or</span>
									<input
										type="number"
										min={0}
										placeholder="₹ flat"
										value={discountFlat || ''}
										onChange={(e) => {
											setDiscountFlat(Number(e.target.value));
											setDiscountPct(0);
										}}
										className="w-24 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>
							</div>

							{/* B2B GSTIN */}
							<div className="flex items-center gap-2">
								<Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
								<input
									placeholder="Buyer GSTIN (B2B, optional)"
									value={buyerGstin}
									onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
									maxLength={15}
									className="flex-1 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
								/>
								{withGst && (
									<input
										placeholder="State code"
										value={placeOfSupply}
										onChange={(e) => setPlaceOfSupply(e.target.value)}
										maxLength={2}
										className="w-20 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								)}
							</div>

							{/* Partial payment at billing */}
							{!isProforma && (
								<div className="flex items-center gap-2">
									<Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
									<span className="text-xs text-muted-foreground w-20">Paid now</span>
									<input
										type="number"
										min={0}
										placeholder="₹ amount"
										value={partialAmount || ''}
										onChange={(e) => setPartialAmount(Number(e.target.value))}
										className="w-24 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
									/>
									<select
										value={partialMethod}
										onChange={(e) => setPartialMethod(e.target.value as typeof partialMethod)}
										className="rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
									>
										<option value="cash">Cash</option>
										<option value="upi">UPI</option>
										<option value="card">Card</option>
										<option value="other">Other</option>
									</select>
								</div>
							)}

							{/* Input options */}
							<div className="flex flex-col items-center gap-3 pt-2">
								<p className="text-sm text-muted-foreground text-center">
									Tap mic or say{' '}
									<span className="font-medium text-foreground">"Hey Execora, naya bill banao"</span>
								</p>
								<button
									onClick={() => void startVoiceInput()}
									className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-transform hover:scale-105 active:scale-95"
								>
									<Mic className="h-9 w-9" />
								</button>
								<span className="text-xs text-muted-foreground">Tap to start voice input</span>
								<div className="flex w-full items-center gap-2">
									<div className="flex-1 border-t border-border" />
									<span className="text-xs text-muted-foreground">or</span>
									<div className="flex-1 border-t border-border" />
								</div>
								<Button
									variant="outline"
									className="w-full gap-2"
									onClick={() => {
										setItems([{ name: '', qty: '1', price: 0, discount: 0, total: 0 }]);
										setStep('manual');
									}}
								>
									<Keyboard className="h-4 w-4" /> Type Items Manually
								</Button>
							</div>
						</div>
					)}

					{/* ── STEP 2: LISTENING ─────────────────────────────────────────── */}
					{step === 'listening' && (
						<div className="space-y-4 py-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="relative flex h-3 w-3">
										<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
										<span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
									</span>
									<span className="text-sm font-medium text-destructive">Listening...</span>
								</div>
								{isListening && (
									<Button
										size="sm"
										variant="outline"
										onClick={stopVoiceInput}
										className="gap-1 text-xs"
									>
										<MicOff className="h-3 w-3" /> Stop
									</Button>
								)}
							</div>
							{transcript && (
								<div className="rounded-lg bg-muted p-4">
									<p className="text-sm italic">"{transcript}"</p>
								</div>
							)}
							<Progress value={progress} className="h-2" />
						</div>
					)}

					{/* ── STEP 3: PROCESSING ────────────────────────────────────────── */}
					{step === 'processing' && (
						<div className="space-y-4 py-4">
							<div className="flex items-center gap-3">
								<div className="relative flex h-5 w-5 shrink-0">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
									<span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
										🧠
									</span>
								</div>
								<div>
									<span className="text-sm font-medium">Execora is thinking…</span>
									<span className="ml-1 inline-flex gap-0.5">
										<span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
										<span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
										<span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
									</span>
								</div>
							</div>
							{transcript && (
								<div className="rounded-lg border-l-4 border-primary/40 bg-muted px-3 py-2.5">
									<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Heard</p>
									<p className="text-sm font-medium">"{transcript}"</p>
								</div>
							)}
							<Progress value={progress} className="h-1.5" />
						</div>
					)}

					{/* ── STEP 4: CONFIRMATION ──────────────────────────────────────── */}
					{step === 'confirmation' && (
						<div className="space-y-4">
							<p className="flex items-center gap-2 text-sm font-medium text-green-600">
								<Check className="h-4 w-4" />
								{transcript ? `I heard: "${transcript}"` : 'Items detected:'}
							</p>

							{items.length > 0 ? (
								<EditableItemTable
									items={items}
									setItems={setItems}
									withGst={withGst}
									discountAmt={discountAmt}
									discountPct={discountPct}
									discountFlat={discountFlat}
									partialAmount={partialAmount}
								/>
							) : (
								<div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
									No items detected. Proceed to assign customer.
								</div>
							)}

							{/* Quick-edit discount */}
							<div className="flex items-center gap-2">
								<Tag className="h-3.5 w-3.5 text-muted-foreground" />
								<input
									type="number"
									min={0}
									max={100}
									placeholder="Discount %"
									value={discountPct || ''}
									onChange={(e) => {
										setDiscountPct(Number(e.target.value));
										setDiscountFlat(0);
									}}
									className="w-20 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
								/>
								<span className="text-xs text-muted-foreground">or</span>
								<input
									type="number"
									min={0}
									placeholder="₹ flat"
									value={discountFlat || ''}
									onChange={(e) => {
										setDiscountFlat(Number(e.target.value));
										setDiscountPct(0);
									}}
									className="w-24 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
								/>
							</div>

							<div className="rounded-lg bg-muted px-3 py-2 text-sm">
								<span className="text-muted-foreground">Customer: </span>
								<span className="font-medium">Not specified</span>
								{isProforma && (
									<span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
										Proforma
									</span>
								)}
							</div>

							<div className="flex gap-2">
								<Button onClick={handleConfirm} className="flex-1 gap-1.5">
									<Check className="h-4 w-4" /> Confirm
								</Button>
								<Button variant="outline" className="gap-1.5" onClick={() => setStep('start')}>
									<Edit2 className="h-4 w-4" /> Retry
								</Button>
								<Button variant="outline" className="gap-1.5" onClick={() => onOpenChange(false)}>
									<X className="h-4 w-4" /> Cancel
								</Button>
							</div>
						</div>
					)}

					{/* ── STEP: MANUAL BILLING — single screen, no page flips ──────── */}
					{step === 'manual' && (
						<div className="space-y-3">
							{/* Inline customer — search & select without leaving the screen */}
							<div className="rounded-lg border bg-muted/30 px-3 py-2.5">
								{inlineCustomer ? (
									<div className="flex items-center justify-between">
										<div>
											<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
												Customer
											</p>
											<p className="text-sm font-semibold">{inlineCustomer.name}</p>
											{inlineCustomer.phone && (
												<p className="text-xs text-muted-foreground">
													📞 {inlineCustomer.phone}
												</p>
											)}
										</div>
										<button
											onClick={() => {
												setInlineCustomer(null);
												setCustomerSearch('');
											}}
											className="text-xs text-primary hover:underline"
										>
											Change
										</button>
									</div>
								) : (
									<div className="space-y-1.5">
										<input
											type="text"
											placeholder="Customer name / phone (blank = walk-in)…"
											value={customerSearch}
											onChange={(e) => setCustomerSearch(e.target.value)}
											className="w-full rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
										/>
										{customerSearch ? (
											<div className="max-h-28 overflow-y-auto rounded border divide-y">
												{customers.slice(0, 5).map((c) => (
													<button
														key={c.id}
														onClick={() => {
															setInlineCustomer(c);
															setCustomerSearch('');
														}}
														className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs hover:bg-muted text-left"
													>
														<span className="font-medium">{c.name}</span>
														{c.phone && (
															<span className="text-muted-foreground">{c.phone}</span>
														)}
													</button>
												))}
												{customers.length === 0 && (
													<p className="px-2.5 py-2 text-xs text-muted-foreground">
														No customer found
													</p>
												)}
											</div>
										) : (
											<p className="text-[10px] text-muted-foreground">
												Leave blank for walk-in / cash sale
											</p>
										)}
									</div>
								)}
							</div>

							{/* Items */}
							<div className="flex items-center justify-between">
								<p className="text-xs text-muted-foreground">
									Add items · Tap <strong>+ Add row</strong> or scan barcode
								</p>
								<button
									type="button"
									onClick={() => setInvoiceScannerOpen(true)}
									className="flex items-center gap-1.5 rounded-md border border-primary px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
									disabled={lookupByBarcode.isPending}
								>
									<ScanLine className="h-3.5 w-3.5" />
									{lookupByBarcode.isPending ? 'Scanning…' : 'Scan'}
								</button>
							</div>
							<EditableItemTable
								items={items}
								setItems={setItems}
								withGst={withGst}
								discountAmt={discountAmt}
								discountPct={discountPct}
								discountFlat={discountFlat}
								partialAmount={splitCash + splitUpi + splitCard}
								showPriceEdit
							/>

							{/* Discount */}
							<div className="flex items-center gap-2">
								<Tag className="h-3.5 w-3.5 text-muted-foreground" />
								<input
									type="number"
									min={0}
									max={100}
									placeholder="Discount %"
									value={discountPct || ''}
									onChange={(e) => {
										setDiscountPct(Number(e.target.value));
										setDiscountFlat(0);
									}}
									className="w-20 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
								/>
								<span className="text-xs text-muted-foreground">or</span>
								<input
									type="number"
									min={0}
									placeholder="₹ flat"
									value={discountFlat || ''}
									onChange={(e) => {
										setDiscountFlat(Number(e.target.value));
										setDiscountPct(0);
									}}
									className="w-24 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
								/>
							</div>

							{/* Split payment — cash + UPI + card in parallel, no single-method dropdown */}
							{!isProforma && (
								<div className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-2">
									<p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
										<Wallet className="h-3 w-3" /> Payment received now (optional)
									</p>
									<div className="grid grid-cols-3 gap-2">
										<div>
											<label className="text-[10px] text-muted-foreground">💵 Cash</label>
											<input
												type="number"
												min={0}
												placeholder="₹0"
												value={splitCash || ''}
												onChange={(e) => setSplitCash(Number(e.target.value))}
												className="mt-0.5 w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
											/>
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground">📱 UPI</label>
											<input
												type="number"
												min={0}
												placeholder="₹0"
												value={splitUpi || ''}
												onChange={(e) => setSplitUpi(Number(e.target.value))}
												className="mt-0.5 w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
											/>
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground">💳 Card</label>
											<input
												type="number"
												min={0}
												placeholder="₹0"
												value={splitCard || ''}
												onChange={(e) => setSplitCard(Number(e.target.value))}
												className="mt-0.5 w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
											/>
										</div>
									</div>
									{splitCash + splitUpi + splitCard > 0 && (
										<p className="text-xs font-medium text-green-600">
											✓ Paid: {formatCurrency(splitCash + splitUpi + splitCard)}
											{total > 0 && splitCash + splitUpi + splitCard < total && (
												<span className="ml-1 text-muted-foreground">
													· Balance due:{' '}
													{formatCurrency(
														Math.max(0, total - splitCash - splitUpi - splitCard)
													)}
												</span>
											)}
										</p>
									)}
								</div>
							)}

							{/* Single confirm button — no second page */}
							<Button
								className="w-full gap-1.5"
								onClick={() => void handleInlineConfirm()}
								disabled={
									items.every((i) => !i.name.trim()) ||
									createCustomer.isPending ||
									createInvoice.isPending
								}
							>
								<Check className="h-4 w-4" />
								{createCustomer.isPending || createInvoice.isPending
									? 'Saving…'
									: inlineCustomer
										? `${isProforma ? 'Create Quote' : 'Create Bill'} · ${inlineCustomer.name.split(' ')[0]}`
										: `${isProforma ? 'Create Quote' : 'Cash Sale'} · Walk-in`}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="w-full text-xs"
								onClick={() => setStep('start')}
							>
								← Back to options
							</Button>
						</div>
					)}

					{step === 'customer' && (
						<div className="space-y-4">
							<Button
								className="w-full justify-start gap-2"
								variant="default"
								onClick={() => void handleWalkInCustomer()}
								disabled={createCustomer.isPending || createInvoice.isPending}
							>
								<Wallet className="h-4 w-4" />
								{createCustomer.isPending
									? 'Preparing walk-in customer...'
									: 'Walk-in / Cash Customer (Quick Bill)'}
							</Button>

							<input
								type="text"
								placeholder="Search customer name or phone…"
								value={customerSearch}
								onChange={(e) => setCustomerSearch(e.target.value)}
								className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							/>
							<div className="max-h-48 space-y-2 overflow-y-auto">
								{customers.slice(0, 8).map((c) => (
									<Card
										key={c.id}
										className="cursor-pointer border-primary/20 hover:border-primary/50 transition-colors"
										onClick={() => void handleSelectCustomer(c)}
									>
										<CardContent className="p-3">
											<div className="flex items-center justify-between">
												<div>
													<p className="text-sm font-semibold">{c.name}</p>
													{c.phone && (
														<p className="flex items-center gap-1 text-xs text-muted-foreground">
															<Phone className="h-3 w-3" /> {c.phone}
														</p>
													)}
												</div>
												{parseFloat(String(c.balance)) > 0 && (
													<p className="text-xs text-destructive font-medium">
														Owes {formatCurrency(parseFloat(String(c.balance)))}
													</p>
												)}
											</div>
										</CardContent>
									</Card>
								))}
								{customers.length === 0 && customerSearch && (
									<p className="text-center text-sm text-muted-foreground py-4">No customer found</p>
								)}
							</div>
						</div>
					)}

					{/* ── STEP 6: FINAL ────────────────────────────────────────────── */}
					{step === 'final' && (
						<div className="space-y-4">
							<div className="flex items-center justify-between text-xs text-muted-foreground">
								<span>
									{new Date().toLocaleString('en-IN', {
										day: '2-digit',
										month: 'short',
										year: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
									})}
								</span>
								<span
									className={`rounded px-2 py-0.5 ${isProforma ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-warning/10 text-warning'}`}
								>
									{createInvoice.isPending ? '⏳ Saving...' : isProforma ? '📋 Proforma' : '✅ Saved'}
								</span>
							</div>

							{selectedCustomer && (
								<div className="rounded-lg bg-muted px-3 py-2 text-sm">
									<p className="font-medium">{selectedCustomer.name}</p>
									{selectedCustomer.phone && (
										<p className="text-muted-foreground">📞 {selectedCustomer.phone}</p>
									)}
									{buyerGstin && <p className="text-xs text-muted-foreground">GSTIN: {buyerGstin}</p>}
								</div>
							)}

							{items.length > 0 && (
								<InvoiceSummaryTable
									items={items}
									subtotal={subtotal}
									gstAmt={gstAmt}
									discountAmt={discountAmt}
									total={total}
									partialAmount={partialAmount}
									balanceDue={balanceDue}
									withGst={withGst}
									isProforma={isProforma}
								/>
							)}

							{partialAmount > 0 && (
								<div className="rounded-lg bg-green-50 px-3 py-2 text-xs dark:bg-green-950/30">
									<span className="text-green-700 dark:text-green-400 font-medium">
										✓ Paid: {formatCurrency(partialAmount)} ({partialMethod.toUpperCase()})
									</span>
									{balanceDue > 0 && (
										<span className="ml-2 text-destructive">
											· Balance due: {formatCurrency(balanceDue)}
										</span>
									)}
								</div>
							)}

							<div className="grid grid-cols-2 gap-2">
								<Button variant="outline" className="gap-1.5 text-xs" onClick={handlePrintInvoice}>
									<Printer className="h-4 w-4" /> Print
								</Button>
								{selectedCustomer?.phone ? (
									<Button onClick={handleWhatsApp} className="gap-1.5 text-xs">
										<MessageSquare className="h-4 w-4" /> WhatsApp
									</Button>
								) : (
									<Button className="gap-1.5 text-xs" onClick={() => onOpenChange(false)}>
										<Check className="h-4 w-4" /> Done
									</Button>
								)}
								<Button
									variant="outline"
									className="gap-1.5 text-xs"
									onClick={() => onOpenChange(false)}
								>
									<Download className="h-4 w-4" /> Close
								</Button>
								<Button variant="outline" className="gap-1.5 text-xs" onClick={() => setStep('start')}>
									<Edit2 className="h-4 w-4" /> New Invoice
								</Button>
							</div>
						</div>
					)}

					{/* ── STEP 7: WHATSAPP ─────────────────────────────────────────── */}
					{step === 'whatsapp' && selectedCustomer && (
						<div className="space-y-4">
							<div className="rounded-lg bg-muted px-3 py-2 text-sm">
								<p className="text-muted-foreground">
									To:{' '}
									<span className="font-medium text-foreground">
										{selectedCustomer.name} ({selectedCustomer.phone})
									</span>{' '}
									✓
								</p>
							</div>
							<div className="rounded-lg border p-3">
								<p className="text-sm italic">
									"{selectedCustomer.name.split(' ')[0]} ji, aapka {isProforma ? 'quotation' : 'bill'}{' '}
									{formatCurrency(total)} ka. Dhanyavaad!"
								</p>
								<button className="mt-1 text-xs text-primary hover:underline">Edit Message</button>
							</div>
							{!whatsappSent ? (
								<Button className="w-full gap-1.5" asChild>
									<a
										href={`https://wa.me/91${selectedCustomer.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`${selectedCustomer.name.split(' ')[0]} ji, aapka ${isProforma ? 'quotation' : 'bill'} ${formatCurrency(total)} ka. Dhanyavaad! — Execora`)}`}
										target="_blank"
										rel="noreferrer"
										onClick={() => setTimeout(() => setWhatsappSent(true), 500)}
									>
										<MessageSquare className="h-4 w-4" /> Send via WhatsApp
									</a>
								</Button>
							) : (
								<div className="rounded-lg bg-green-50 p-3 text-sm dark:bg-green-950/30">
									<p className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
										<Check className="h-4 w-4" /> Shared successfully!
									</p>
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Barcode scanner overlay — rendered outside Dialog to avoid z-index clipping */}
			{invoiceScannerOpen && (
				<BarcodeScanner
					hint="Point camera at product barcode to add to bill"
					onScan={handleInvoiceBarcodeScan}
					onClose={() => setInvoiceScannerOpen(false)}
				/>
			)}

			{/* Credit Limit Override Dialog */}
			<AlertDialog
				open={!!creditLimitCtx}
				onOpenChange={(o) => {
					if (!o) setCreditLimitCtx(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>⚠️ Credit Limit Exceeded</AlertDialogTitle>
						<AlertDialogDescription>
							<strong>{creditLimitCtx?.customerName}</strong> has a credit limit of{' '}
							<strong>₹{(creditLimitCtx?.limit ?? 0).toLocaleString('en-IN')}</strong>.<br />
							Current balance: <strong>₹{(creditLimitCtx?.balance ?? 0).toLocaleString('en-IN')}</strong>
							<br />
							This invoice:{' '}
							<strong>₹{(creditLimitCtx?.invoiceAmount ?? 0).toLocaleString('en-IN')}</strong>
							<br />
							New balance would be{' '}
							<strong className="text-destructive">
								₹
								{((creditLimitCtx?.balance ?? 0) + (creditLimitCtx?.invoiceAmount ?? 0)).toLocaleString(
									'en-IN'
								)}
							</strong>{' '}
							(over limit by ₹
							{Math.round(
								(creditLimitCtx?.balance ?? 0) +
									(creditLimitCtx?.invoiceAmount ?? 0) -
									(creditLimitCtx?.limit ?? 0)
							).toLocaleString('en-IN')}
							).
							<br />
							<br />
							Do you want to proceed anyway?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setCreditLimitCtx(null)}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={async () => {
								if (!creditLimitCtx) return;
								const ctx = creditLimitCtx;
								setCreditLimitCtx(null);
								try {
									const res = await createInvoice.mutateAsync({
										customerId: ctx.customerId,
										items: ctx.items,
										...ctx.opts,
										overrideCreditLimit: true,
									} as Parameters<typeof createInvoice.mutateAsync>[0]);
									setCreatedInvoiceNo(res.invoice?.invoiceNo ?? 'INV-NEW');
									setStep('final');
									void qc.invalidateQueries({ queryKey: ['invoices'] });
									void qc.invalidateQueries({ queryKey: ['customers'] });
									void qc.invalidateQueries({ queryKey: ['summary'] });
								} catch {
									setError('Invoice save failed. Please try again.');
								}
							}}
						>
							Proceed Anyway
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

function ToggleChip({
	active,
	onClick,
	icon,
	label,
}: {
	active: boolean;
	onClick: () => void;
	icon: string;
	label: string;
}) {
	return (
		<button
			onClick={onClick}
			className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
				active
					? 'border-primary bg-primary/10 text-primary'
					: 'border-border text-muted-foreground hover:border-primary/50'
			}`}
		>
			<span>{icon}</span> {label}
		</button>
	);
}

function EditableItemTable({
	items,
	setItems,
	withGst,
	discountAmt,
	discountPct,
	discountFlat,
	partialAmount,
	showPriceEdit = false,
}: {
	items: { name: string; qty: string; price: number; discount: number; total: number }[];
	setItems: React.Dispatch<
		React.SetStateAction<{ name: string; qty: string; price: number; discount: number; total: number }[]>
	>;
	withGst: boolean;
	discountAmt: number;
	discountPct: number;
	discountFlat: number;
	partialAmount: number;
	showPriceEdit?: boolean;
}) {
	const subtotal = items.reduce((s, i) => s + i.total, 0);
	const gstAmt = withGst ? Math.round(subtotal * 0.05) : 0;
	const total = Math.max(0, subtotal + gstAmt - discountAmt);
	const balanceDue = Math.max(0, total - partialAmount);

	const updateName = (idx: number, name: string) => {
		setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, name } : it)));
	};

	const updatePrice = (idx: number, price: number) => {
		setItems((prev) =>
			prev.map((it, i) => {
				if (i !== idx) return it;
				const qty = parseInt(it.qty) || 1;
				const effective = price * (1 - (it.discount || 0) / 100);
				return { ...it, price, total: Math.round(effective * qty * 100) / 100 };
			})
		);
	};

	const updateQty = (idx: number, val: string) => {
		setItems((prev) =>
			prev.map((it, i) => {
				if (i !== idx) return it;
				const qty = Math.max(1, parseInt(val) || 1);
				const effective = it.price * (1 - (it.discount || 0) / 100);
				return { ...it, qty: String(qty), total: Math.round(effective * qty * 100) / 100 };
			})
		);
	};

	const updateDiscount = (idx: number, pct: number) => {
		setItems((prev) =>
			prev.map((it, i) => {
				if (i !== idx) return it;
				const discount = Math.min(100, Math.max(0, pct || 0));
				const qty = parseInt(it.qty) || 1;
				const effective = it.price * (1 - discount / 100);
				return { ...it, discount, total: Math.round(effective * qty * 100) / 100 };
			})
		);
	};

	const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

	const addItem = () => setItems((prev) => [...prev, { name: '', qty: '1', price: 0, discount: 0, total: 0 }]);

	const colCount = showPriceEdit ? 5 : 4;
	return (
		<div className="overflow-hidden rounded-lg border text-sm">
			<table className="w-full">
				<thead className="bg-muted/50">
					<tr>
						<th className="px-3 py-2 text-left font-medium">Item</th>
						{showPriceEdit && <th className="px-1 py-2 text-right font-medium w-20">Price</th>}
						<th className="px-2 py-2 text-center font-medium w-20">Qty</th>
						<th className="px-1 py-2 text-center font-medium w-14">Disc%</th>
						<th className="px-3 py-2 text-right font-medium">Total</th>
						<th className="w-7" />
					</tr>
				</thead>
				<tbody>
					{items.map((item, idx) => (
						<tr key={idx} className="border-t">
							<td className="px-3 py-1.5">
								{showPriceEdit ? (
									<input
										type="text"
										value={item.name}
										onChange={(e) => updateName(idx, e.target.value)}
										placeholder="Item name…"
										className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								) : (
									item.name || <em className="text-muted-foreground">unnamed</em>
								)}
							</td>
							{showPriceEdit && (
								<td className="px-1 py-1.5 text-right">
									<input
										type="number"
										min={0}
										value={item.price || ''}
										onChange={(e) => updatePrice(idx, Number(e.target.value))}
										placeholder="0"
										className="w-16 rounded border px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</td>
							)}
							<td className="px-2 py-1.5 text-center">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => updateQty(idx, String(Math.max(1, parseInt(item.qty) - 1)))}
										className="rounded p-0.5 hover:bg-muted"
									>
										<Minus className="h-3 w-3" />
									</button>
									<span className="w-6 text-center">{item.qty}</span>
									<button
										onClick={() => updateQty(idx, String(parseInt(item.qty) + 1))}
										className="rounded p-0.5 hover:bg-muted"
									>
										<Plus className="h-3 w-3" />
									</button>
								</div>
							</td>
							<td className="px-1 py-1.5 text-center">
								<input
									type="number"
									min={0}
									max={100}
									value={item.discount || ''}
									onChange={(e) => updateDiscount(idx, Number(e.target.value))}
									placeholder="0"
									className="w-12 rounded border px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
								/>
							</td>
							<td className="px-3 py-1.5 text-right">
								₹{item.total}
								{item.discount > 0 && (
									<span className="block text-[10px] text-green-600 leading-none">
										-{item.discount}%
									</span>
								)}
							</td>
							<td className="pr-2 text-center">
								<button
									onClick={() => removeItem(idx)}
									className="text-muted-foreground hover:text-destructive"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr className="border-t bg-muted/20">
						<td colSpan={colCount} className="px-3 py-1">
							<button
								onClick={addItem}
								className="flex items-center gap-1 text-xs text-primary hover:underline"
							>
								<Plus className="h-3 w-3" /> Add row
							</button>
						</td>
					</tr>
					<tr className="bg-muted/30">
						<td colSpan={colCount - 1} className="px-3 py-1.5 text-right text-xs text-muted-foreground">
							Subtotal
						</td>
						<td colSpan={1} className="px-3 py-1.5 text-right text-xs">
							₹{subtotal}
						</td>
					</tr>
					{withGst && (
						<tr className="bg-muted/30">
							<td colSpan={colCount - 1} className="px-3 py-1 text-right text-xs text-muted-foreground">
								GST (5%)
							</td>
							<td colSpan={1} className="px-3 py-1 text-right text-xs">
								₹{gstAmt}
							</td>
						</tr>
					)}
					{discountAmt > 0 && (
						<tr className="bg-muted/30">
							<td colSpan={colCount - 1} className="px-3 py-1 text-right text-xs text-green-600">
								Discount {discountPct > 0 ? `(${discountPct}%)` : discountFlat > 0 ? '(flat)' : ''}
							</td>
							<td colSpan={1} className="px-3 py-1 text-right text-xs text-green-600">
								-₹{discountAmt}
							</td>
						</tr>
					)}
					<tr className="border-t bg-muted/50 font-semibold">
						<td colSpan={colCount - 1} className="px-3 py-2 text-right">
							Total
						</td>
						<td colSpan={1} className="px-3 py-2 text-right">
							₹{total}
						</td>
					</tr>
					{partialAmount > 0 && (
						<tr className="bg-green-50/50 dark:bg-green-950/20">
							<td colSpan={colCount - 1} className="px-3 py-1 text-right text-xs text-muted-foreground">
								Paid now
							</td>
							<td colSpan={1} className="px-3 py-1 text-right text-xs text-green-600">
								₹{partialAmount}
							</td>
						</tr>
					)}
					{partialAmount > 0 && (
						<tr className="bg-muted/30">
							<td colSpan={colCount - 1} className="px-3 py-1.5 text-right text-xs font-medium">
								Balance Due
							</td>
							<td colSpan={1} className="px-3 py-1.5 text-right text-xs font-medium text-destructive">
								₹{balanceDue}
							</td>
						</tr>
					)}
				</tfoot>
			</table>
		</div>
	);
}

function InvoiceSummaryTable({
	items,
	subtotal,
	gstAmt,
	discountAmt,
	total,
	partialAmount,
	balanceDue,
	withGst,
	isProforma,
}: {
	items: { name: string; qty: string; price: number; total: number }[];
	subtotal: number;
	gstAmt: number;
	discountAmt: number;
	total: number;
	partialAmount: number;
	balanceDue: number;
	withGst: boolean;
	isProforma: boolean;
}) {
	return (
		<div className="overflow-hidden rounded-lg border text-sm">
			<table className="w-full">
				<thead className="bg-muted/50">
					<tr>
						<th className="px-3 py-2 text-left font-medium">Item</th>
						<th className="px-3 py-2 text-left font-medium">Qty</th>
						<th className="px-3 py-2 text-right font-medium">Price</th>
						<th className="px-3 py-2 text-right font-medium">Total</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item, idx) => (
						<tr key={`${item.name}-${idx}`} className="border-t">
							<td className="px-3 py-2">{item.name}</td>
							<td className="px-3 py-2">{item.qty}</td>
							<td className="px-3 py-2 text-right">₹{item.price}</td>
							<td className="px-3 py-2 text-right">₹{item.total}</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr className="border-t bg-muted/30">
						<td colSpan={3} className="px-3 py-1.5 text-right text-muted-foreground">
							Subtotal
						</td>
						<td className="px-3 py-1.5 text-right">₹{subtotal}</td>
					</tr>
					{withGst && (
						<tr className="bg-muted/30">
							<td colSpan={3} className="px-3 py-1 text-right text-muted-foreground">
								GST (5%)
							</td>
							<td className="px-3 py-1 text-right">₹{gstAmt}</td>
						</tr>
					)}
					{discountAmt > 0 && (
						<tr className="bg-muted/30">
							<td colSpan={3} className="px-3 py-1 text-right text-green-600">
								Discount
							</td>
							<td className="px-3 py-1 text-right text-green-600">-₹{discountAmt}</td>
						</tr>
					)}
					<tr className="border-t bg-muted/50 font-semibold">
						<td colSpan={3} className="px-3 py-2 text-right">
							{isProforma ? 'Quotation Total' : 'Total'}
						</td>
						<td className="px-3 py-2 text-right">₹{total}</td>
					</tr>
					{partialAmount > 0 && (
						<tr className="bg-green-50/50 dark:bg-green-950/20">
							<td colSpan={3} className="px-3 py-1 text-right text-xs text-muted-foreground">
								Paid
							</td>
							<td className="px-3 py-1 text-right text-xs text-green-600">₹{partialAmount}</td>
						</tr>
					)}
					{partialAmount > 0 && balanceDue > 0 && (
						<tr className="bg-muted/30">
							<td colSpan={3} className="px-3 py-1.5 text-right font-medium text-xs">
								Balance Due
							</td>
							<td className="px-3 py-1.5 text-right font-medium text-xs text-destructive">
								₹{balanceDue}
							</td>
						</tr>
					)}
				</tfoot>
			</table>
		</div>
	);
}

export default InvoiceCreation;
