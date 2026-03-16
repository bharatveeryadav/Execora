/**
 * Feedback — NPS (0–10) + optional text feedback.
 */
import { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { feedbackApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const NPS_LABELS: Record<number, string> = {
	0: 'Not at all likely',
	1: '',
	2: '',
	3: '',
	4: '',
	5: 'Neutral',
	6: '',
	7: '',
	8: '',
	9: '',
	10: 'Extremely likely',
};

export default function Feedback() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const [npsScore, setNpsScore] = useState<number | null>(null);
	const [text, setText] = useState('');
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (npsScore === null) return;
		setLoading(true);
		try {
			await feedbackApi.submit({ npsScore, text: text.trim() || undefined });
			setSubmitted(true);
			toast({ title: 'Thank you!', description: 'Your feedback helps us improve.' });
		} catch {
			toast({ title: 'Failed to submit', variant: 'destructive' });
		} finally {
			setLoading(false);
		}
	}

	if (submitted) {
		return (
			<div className="min-h-screen bg-background pb-24">
				<header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
					<Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</header>
				<main className="mx-auto max-w-md space-y-6 p-6">
					<Card className="border-none shadow-sm">
						<CardContent className="flex flex-col items-center gap-4 py-12 text-center">
							<p className="text-4xl">🙏</p>
							<h2 className="text-center text-lg font-semibold">Thank you for your feedback!</h2>
							<p className="text-sm text-muted-foreground">
								We value your input and use it to make Execora better.
							</p>
							<Button variant="outline" onClick={() => navigate(-1)}>
								Back
							</Button>
						</CardContent>
					</Card>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background pb-24">
			<header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<h1 className="text-lg font-bold">Feedback</h1>
				</div>
			</header>

			<main className="mx-auto max-w-md space-y-6 p-6">
				<Card className="border-none shadow-sm">
					<CardContent className="p-6">
						<p className="mb-6 text-sm text-muted-foreground">
							How likely are you to recommend Execora to a friend or colleague?
						</p>

						<form onSubmit={handleSubmit} className="space-y-6">
							{/* NPS 0–10 */}
							<div className="space-y-3">
								<div className="flex flex-wrap justify-between gap-1">
									{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
										<button
											key={n}
											type="button"
											onClick={() => setNpsScore(n)}
											className={`h-10 w-10 rounded-full text-sm font-semibold transition-colors ${
												npsScore === n
													? 'bg-primary text-primary-foreground'
													: 'bg-muted hover:bg-muted/80 text-muted-foreground'
											}`}
										>
											{n}
										</button>
									))}
								</div>
								{npsScore !== null && NPS_LABELS[npsScore] && (
									<p className="text-center text-xs text-muted-foreground">
										{NPS_LABELS[npsScore]}
									</p>
								)}
							</div>

							{/* Optional text */}
							<div className="space-y-2">
								<label className="text-sm font-medium">Anything else? (optional)</label>
								<Textarea
									value={text}
									onChange={(e) => setText(e.target.value)}
									placeholder="What do you love? What could be better?"
									rows={4}
									className="resize-none"
									maxLength={2000}
								/>
								<p className="text-[10px] text-muted-foreground">{text.length}/2000</p>
							</div>

							<Button type="submit" disabled={npsScore === null || loading} className="w-full">
								<Send className="mr-2 h-4 w-4" />
								{loading ? 'Submitting…' : 'Submit Feedback'}
							</Button>
						</form>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
