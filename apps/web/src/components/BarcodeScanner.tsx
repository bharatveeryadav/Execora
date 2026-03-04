/**
 * BarcodeScanner — mobile-first camera barcode/QR scanner
 *
 * Uses ZXing (via @zxing/browser) to decode EAN-8, EAN-13, QR, Code128, etc.
 * Falls back gracefully: if camera is unavailable, shows a manual barcode input.
 *
 * Features (matching Vyapar / Marg):
 *  - Rear camera preferred (for mobile product scanning)
 *  - Debounced decode (150 ms) so single physical barcode fires once
 *  - Manual keyboard input (works with USB barcode scanners — they act like keyboards)
 *  - Torch/flash toggle on supported devices
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { X, ScanLine, Zap, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BarcodeScannerProps {
	onScan: (barcode: string) => void;
	onClose: () => void;
	/** Hint shown below the viewfinder */
	hint?: string;
}

export default function BarcodeScanner({ onScan, onClose, hint }: BarcodeScannerProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const readerRef = useRef<BrowserMultiFormatReader | null>(null);
	const lastCodeRef = useRef<string>('');
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [cameraError, setCameraError] = useState<string | null>(null);
	const [torch, setTorch] = useState(false);
	const [manualMode, setManualMode] = useState(false);
	const [manualInput, setManualInput] = useState('');
	const [scanning, setScanning] = useState(false);

	// ── Torch toggle ───────────────────────────────────────────────────────────
	const toggleTorch = useCallback(async () => {
		try {
			const stream = videoRef.current?.srcObject as MediaStream | null;
			const track = stream?.getVideoTracks()[0];
			if (!track) return;
			// @ts-expect-error — applyConstraints with torch is supported on Chrome Android
			await track.applyConstraints({ advanced: [{ torch: !torch }] });
			setTorch((t) => !t);
		} catch {
			// torch not supported on this device — silently ignore
		}
	}, [torch]);

	// ── Start scanning ─────────────────────────────────────────────────────────
	useEffect(() => {
		if (manualMode) return;

		const reader = new BrowserMultiFormatReader();
		readerRef.current = reader;

		let stopped = false;

		(async () => {
			try {
				const devices = await BrowserMultiFormatReader.listVideoInputDevices();
				// Prefer back camera on mobile
				const backCam = devices.find(
					(d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
				);
				const deviceId = backCam?.deviceId ?? devices[0]?.deviceId ?? undefined;

				if (!deviceId && devices.length === 0) {
					setCameraError('No camera found');
					setManualMode(true);
					return;
				}

				setScanning(true);

				await reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
					if (stopped) return;
					if (result) {
						const code = result.getText();
						// Debounce: ignore repeated reads of the same code within 300 ms
						if (code === lastCodeRef.current) return;
						if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
						debounceTimerRef.current = setTimeout(() => {
							lastCodeRef.current = code;
							onScan(code);
						}, 150);
					} else if (err && !(err instanceof NotFoundException)) {
						// Non-critical decode errors are normal between frames
					}
				});
			} catch (e: unknown) {
				if (!stopped) {
					const msg = e instanceof Error ? e.message : 'Camera error';
					setCameraError(msg.includes('Permission') ? 'Camera permission denied' : msg);
					setManualMode(true);
				}
			}
		})();

		return () => {
			stopped = true;
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
			try {
				reader.reset();
			} catch {
				/* ignore */
			}
		};
	}, [manualMode, onScan]);

	const handleManualSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const code = manualInput.trim();
		if (code) {
			onScan(code);
			setManualInput('');
		}
	};

	return (
		<div className="fixed inset-0 z-[60] flex flex-col bg-black/90" onClick={(e) => e.stopPropagation()}>
			{/* ── Header ── */}
			<div className="flex items-center justify-between px-4 py-3">
				<div className="flex items-center gap-2 text-white">
					<ScanLine className="h-5 w-5 text-green-400" />
					<span className="font-semibold">Scan Barcode</span>
				</div>
				<div className="flex items-center gap-2">
					{!manualMode && !cameraError && (
						<button
							onClick={toggleTorch}
							className={`rounded-full p-2 ${torch ? 'bg-yellow-400 text-black' : 'text-white'}`}
							title="Toggle flash"
						>
							<Zap className="h-5 w-5" />
						</button>
					)}
					<button
						onClick={() => setManualMode((m) => !m)}
						className="rounded-full p-2 text-white hover:bg-white/10"
						title={manualMode ? 'Switch to camera' : 'Type barcode manually'}
					>
						<Keyboard className="h-5 w-5" />
					</button>
					<button onClick={onClose} className="rounded-full p-2 text-white hover:bg-white/10">
						<X className="h-5 w-5" />
					</button>
				</div>
			</div>

			{/* ── Camera or Manual ── */}
			{manualMode ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
					<p className="text-center text-sm text-gray-300">
						{cameraError
							? `⚠️ ${cameraError}. Type barcode number below:`
							: 'Type or scan using a USB barcode reader:'}
					</p>
					<form onSubmit={handleManualSubmit} className="flex w-full max-w-sm gap-2">
						<Input
							autoFocus
							value={manualInput}
							onChange={(e) => setManualInput(e.target.value)}
							placeholder="e.g. 8901234567890"
							className="flex-1 bg-white text-black placeholder:text-gray-500"
						/>
						<Button type="submit" disabled={!manualInput.trim()}>
							Go
						</Button>
					</form>
					{!cameraError && (
						<button
							onClick={() => setManualMode(false)}
							className="text-xs text-gray-400 underline hover:text-white"
						>
							← Back to camera
						</button>
					)}
				</div>
			) : (
				<div className="relative flex flex-1 items-center justify-center overflow-hidden">
					{/* Video viewfinder */}
					<video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
					{/* Scanning overlay */}
					{scanning && (
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
							{/* Corner brackets */}
							<div className="relative h-56 w-56">
								{/* top-left */}
								<span className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-green-400 rounded-tl-md" />
								{/* top-right */}
								<span className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-green-400 rounded-tr-md" />
								{/* bottom-left */}
								<span className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-green-400 rounded-bl-md" />
								{/* bottom-right */}
								<span className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-green-400 rounded-br-md" />
								{/* Scanning line animation */}
								<div className="absolute inset-x-0 top-0 h-0.5 animate-[scanline_2s_ease-in-out_infinite] bg-green-400 shadow-[0_0_8px_#4ade80]" />
							</div>
						</div>
					)}
					{/* Hint text */}
					<div className="absolute bottom-6 left-0 right-0 text-center">
						<p className="text-xs text-gray-300">{hint ?? 'Point camera at product barcode'}</p>
					</div>
				</div>
			)}
		</div>
	);
}
