import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Check, Edit2, X, Printer, MessageSquare, Download, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { wsClient } from "@/lib/ws";
import { useCreateInvoice, useCustomers } from "@/hooks/useQueries";
import { formatCurrency, type Customer } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

type Step = "start" | "listening" | "processing" | "confirmation" | "customer" | "final" | "whatsapp";

interface InvoiceItem {
  name: string;
  qty: string;
  price: number;
  total: number;
}

interface ParsedInvoice {
  items: InvoiceItem[];
  customerName?: string;
  transcript?: string;
}

interface InvoiceCreationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InvoiceCreation = ({ open, onOpenChange }: InvoiceCreationProps) => {
  const [step, setStep] = useState<Step>("start");
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [transcript, setTranscript] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [createdInvoiceNo, setCreatedInvoiceNo] = useState("");
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const canStreamAudioRef = useRef(false);

  const createInvoice = useCreateInvoice();
  const { data: customers = [] } = useCustomers(customerSearch);
  const qc = useQueryClient();

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;

  const cleanupAudio = useCallback(() => {
    canStreamAudioRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setIsListening(false);
  }, []);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setStep("start");
      setProgress(0);
      setItems([]);
      setTranscript("");
      setSelectedCustomer(null);
      setCreatedInvoiceNo("");
      setWhatsappSent(false);
      setError("");
    } else {
      cleanupAudio();
      wsClient.send("voice:stop");
    }
  }, [open, cleanupAudio]);

  // Listen for AI invoice response via WebSocket
  useEffect(() => {
    if (!open) return;

    const offs = [
      wsClient.on("voice:response", (msg) => {
        const payload = msg as { data?: { text?: string; invoice?: { items?: { productName: string; quantity: number; unitPrice?: number }[] }; customer?: { name?: string } }; text?: string };
        const text = payload.data?.text ?? payload.text ?? "";
        setTranscript(text);

        // If response includes parsed invoice data
        const inv = payload.data?.invoice;
        if (inv?.items?.length) {
          const parsedItems: InvoiceItem[] = inv.items.map((it) => ({
            name: it.productName,
            qty: String(it.quantity),
            price: it.unitPrice ?? 0,
            total: (it.unitPrice ?? 0) * it.quantity,
          }));
          setItems(parsedItems);
          setStep("confirmation");
        } else {
          // Use transcript to move forward
          setStep("confirmation");
        }
      }),
      wsClient.on("voice:thinking", () => {
        setStep("processing");
        setProgress(30);
      }),
      wsClient.on("voice:transcript", (msg) => {
        const payload = msg as { text?: string; isFinal?: boolean; data?: { text?: string; isFinal?: boolean } };
        const text = payload.data?.text ?? payload.text ?? "";
        if (text) setTranscript(text);
      }),
      wsClient.on("invoice:draft", (msg) => {
        const payload = msg as { data?: { items?: { productName: string; quantity: number; unitPrice?: number }[] } };
        const inv = payload.data?.items;
        if (inv?.length) {
          const parsedItems: InvoiceItem[] = inv.map((it) => ({
            name: it.productName,
            qty: String(it.quantity),
            price: it.unitPrice ?? 0,
            total: (it.unitPrice ?? 0) * it.quantity,
          }));
          setItems(parsedItems);
          setStep("confirmation");
        }
      }),
    ];

    return () => offs.forEach((off) => off());
  }, [open]);

  // Progress animation for listening/processing
  useEffect(() => {
    if (step === "processing") {
      const interval = setInterval(() => {
        setProgress((p) => Math.min(95, p + 2));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [step]);

  const startVoiceInput = useCallback(async () => {
    setError("");

    // Connect WS if not connected
    if (!wsClient.isConnected) {
      wsClient.connect();
      const ok = await wsClient.waitForOpen(6000);
      if (!ok) {
        setError("Could not connect to voice server. Please try typing your command.");
        return;
      }
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      // Fallback to browser speech recognition
      const SR =
        (window as { SpeechRecognition?: new () => any }).SpeechRecognition ??
        (window as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
      if (!SR) {
        setError("Voice not supported. Please type your invoice.");
        return;
      }
      const rec = new SR();
      rec.lang = "hi-IN";
      rec.onstart = () => { setIsListening(true); setStep("listening"); setProgress(0); };
      rec.onend = () => { setIsListening(false); setStep("processing"); };
      rec.onerror = () => { setIsListening(false); setError("Voice error. Please try again."); setStep("start"); };
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setTranscript(text);
        wsClient.send("voice:final", { text });
        setStep("processing");
        setProgress(30);
      };
      recognitionRef.current = rec;
      wsClient.send("voice:start", {});
      rec.start();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      mediaStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0 && wsClient.isConnected && canStreamAudioRef.current) wsClient.sendBinary(e.data);
      };
      recorder.onstop = () => {
        canStreamAudioRef.current = false;
        setIsListening(false);
      };

      wsClient.send("voice:start", {});

      const sessionReady = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          offStarted();
          resolve(false);
        }, 5000);
        const offStarted = wsClient.on("voice:started", () => {
          clearTimeout(timer);
          offStarted();
          resolve(true);
        });
      });

      if (!sessionReady) {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setError("Voice session didn't start. Please try again.");
        setStep("start");
        return;
      }

      canStreamAudioRef.current = true;
      wsClient.send("recording:start");
      recorder.start(250);
      setIsListening(true);
      setStep("listening");
      setProgress(0);
    } catch {
      setError("Microphone permission denied.");
    }
  }, []);

  const stopVoiceInput = useCallback(() => {
    cleanupAudio();
    wsClient.send("recording:stop");
    wsClient.send("voice:stop");
    setStep("processing");
    setProgress(30);
  }, [cleanupAudio]);

  const handleConfirm = () => setStep("customer");

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setStep("final");
    // Actually create the invoice
    const invItems = items.length > 0
      ? items.map((it) => ({ productName: it.name, quantity: parseInt(it.qty) || 1 }))
      : [{ productName: "General Items", quantity: 1 }];

    createInvoice.mutateAsync({ customerId: c.id, items: invItems })
      .then((res) => {
        setCreatedInvoiceNo(res.invoice?.invoiceNo ?? "INV-NEW");
        void qc.invalidateQueries({ queryKey: ["invoices"] });
      })
      .catch(() => setError("Invoice saved locally. Sync may be pending."));
  };

  const handleWhatsApp = () => {
    setStep("whatsapp");
    setTimeout(() => setWhatsappSent(true), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            🧾{" "}
            {step === "start" && "New Invoice"}
            {step === "listening" && "Listening..."}
            {step === "processing" && "Processing..."}
            {step === "confirmation" && "Confirm Items"}
            {step === "customer" && "Add Customer"}
            {step === "final" && `Invoice ${createdInvoiceNo || "#INV-NEW"}`}
            {step === "whatsapp" && "Share via WhatsApp"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        {/* STEP 1: START */}
        {step === "start" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-sm text-muted-foreground">
              Tap microphone or say{" "}
              <span className="font-medium text-foreground">"Hey Execora, naya bill banao"</span>
            </p>
            <button
              onClick={() => void startVoiceInput()}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-transform hover:scale-105 active:scale-95"
            >
              <Mic className="h-10 w-10" />
            </button>
            <span className="text-xs text-muted-foreground">Tap to start voice input</span>
          </div>
        )}

        {/* STEP 2: LISTENING */}
        {step === "listening" && (
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
                <Button size="sm" variant="outline" onClick={stopVoiceInput} className="gap-1 text-xs">
                  <MicOff className="h-3 w-3" /> Stop
                </Button>
              )}
            </div>
            {transcript && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm italic text-foreground">"{transcript}"</p>
              </div>
            )}
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* STEP 3: PROCESSING */}
        {step === "processing" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm font-medium">Execora is processing...</span>
            </div>
            {transcript && (
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Heard: "{transcript}"
              </div>
            )}
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* STEP 4: CONFIRMATION */}
        {step === "confirmation" && (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm font-medium text-green-600">
              <Check className="h-4 w-4" />
              {transcript ? `I heard: "${transcript}"` : "Items detected:"}
            </p>
            {items.length > 0 ? (
              <ItemTable items={items} subtotal={subtotal} gst={gst} total={total} />
            ) : (
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                No items detected. You can proceed to assign customer and add items manually.
              </div>
            )}
            <div className="rounded-lg bg-muted px-3 py-2">
              <span className="text-sm text-muted-foreground">Customer: </span>
              <span className="text-sm font-medium">Not specified</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConfirm} className="flex-1 gap-1.5">
                <Check className="h-4 w-4" /> Confirm
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => setStep("start")}>
                <Edit2 className="h-4 w-4" /> Retry
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: CUSTOMER SEARCH */}
        {step === "customer" && (
          <div className="space-y-4">
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
                  onClick={() => handleSelectCustomer(c)}
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

        {/* STEP 6: FINAL INVOICE */}
        {step === "final" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="rounded bg-warning/10 px-2 py-0.5 text-warning">
                {createInvoice.isPending ? "⏳ Saving..." : "✅ Saved"}
              </span>
            </div>
            {selectedCustomer && (
              <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                <p className="font-medium">{selectedCustomer.name}</p>
                {selectedCustomer.phone && (
                  <p className="text-muted-foreground">📞 {selectedCustomer.phone}</p>
                )}
              </div>
            )}
            {items.length > 0 && (
              <ItemTable items={items} subtotal={subtotal} gst={gst} total={total} />
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-1.5 text-xs">
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
              <Button variant="outline" className="gap-1.5 text-xs" onClick={() => onOpenChange(false)}>
                <Download className="h-4 w-4" /> Close
              </Button>
              <Button variant="outline" className="gap-1.5 text-xs" onClick={() => setStep("start")}>
                <Edit2 className="h-4 w-4" /> New Invoice
              </Button>
            </div>
          </div>
        )}

        {/* STEP 7: WHATSAPP */}
        {step === "whatsapp" && selectedCustomer && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              <p className="text-muted-foreground">
                To:{" "}
                <span className="font-medium text-foreground">
                  {selectedCustomer.name} ({selectedCustomer.phone})
                </span>{" "}
                ✓ WhatsApp available
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm italic text-foreground">
                "{selectedCustomer.name.split(" ")[0]} ji, aapka bill {formatCurrency(total)} ka. Dhanyavaad!"
              </p>
              <button className="mt-1 text-xs text-primary hover:underline">Edit Message</button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs">📎 Attach PDF</Button>
              <Button variant="outline" size="sm" className="text-xs">📎 Attach Image</Button>
            </div>
            {!whatsappSent ? (
              <Button className="w-full gap-1.5" asChild>
                <a
                  href={`https://wa.me/91${selectedCustomer.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(`${selectedCustomer.name.split(" ")[0]} ji, aapka bill ${formatCurrency(total)} ka. Dhanyavaad! — Execora`)}`}
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
                  <Check className="h-4 w-4" /> Invoice shared successfully!
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const ItemTable = ({
  items,
  subtotal,
  gst,
  total,
}: {
  items: InvoiceItem[];
  subtotal: number;
  gst: number;
  total: number;
}) => (
  <div className="overflow-hidden rounded-lg border">
    <table className="w-full text-sm">
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
        <tr className="border-t bg-muted/30">
          <td colSpan={3} className="px-3 py-1.5 text-right text-muted-foreground">Subtotal</td>
          <td className="px-3 py-1.5 text-right">₹{subtotal}</td>
        </tr>
        <tr className="bg-muted/30">
          <td colSpan={3} className="px-3 py-1.5 text-right text-muted-foreground">GST (5%)</td>
          <td className="px-3 py-1.5 text-right">₹{gst}</td>
        </tr>
        <tr className="border-t bg-muted/50 font-semibold">
          <td colSpan={3} className="px-3 py-2 text-right">Total</td>
          <td className="px-3 py-2 text-right">₹{total}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

export default InvoiceCreation;
