import { prisma } from '@execora/infrastructure';
import { logger } from '@execora/infrastructure';
import { reminderQueue } from '@execora/infrastructure';
import { tenantContext } from '@execora/infrastructure';
import { scheduleNextReminderOccurrence, markReminderSent, markReminderFailed } from '@execora/infrastructure';
import { ReminderJobData } from '@execora/types';
import { addDays, addHours, addMinutes, addMonths, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { config } from '@execora/infrastructure';

type RecurringPattern =
	| { type: 'interval_minutes'; value: number }
	| { type: 'daily_time'; hour: number; minute: number }
	| { type: 'monthly_date'; day: number; hour: number; minute: number }
	| { type: 'every_n_months'; months: number; day: number; hour: number; minute: number };

type ParsedSchedule = {
	scheduledTime: Date;
	recurringPattern?: RecurringPattern;
};

class ReminderService {
	private normalizeSpokenNumbers(input: string): string {
		const devanagariDigits: Record<string, string> = {
			'०': '0',
			'१': '1',
			'२': '2',
			'३': '3',
			'४': '4',
			'५': '5',
			'६': '6',
			'७': '7',
			'८': '8',
			'९': '9',
		};

		let text = input.replace(/[०-९]/g, (ch) => devanagariDigits[ch] ?? ch);

		const numberWords: Array<[RegExp, string]> = [
			[/\b(ek|एक)\b/g, '1'],
			[/\b(do|दो)\b/g, '2'],
			[/\b(teen|तीन)\b/g, '3'],
			[/\b(char|chaar|चार)\b/g, '4'],
			[/\b(paanch|पांच|पाँच)\b/g, '5'],
			[/\b(chhe|cheh|छह)\b/g, '6'],
			[/\b(saat|सात)\b/g, '7'],
			[/\b(aath|आठ)\b/g, '8'],
			[/\b(nau|नौ)\b/g, '9'],
			[/\b(das|दस)\b/g, '10'],
		];

		for (const [pattern, value] of numberWords) {
			text = text.replace(pattern, value);
		}

		return text;
	}

	private parseHourMinute(raw: string): { hour: number; minute: number } | null {
		const withColon = raw.match(/(\d{1,2}):(\d{1,2})\s*(am|pm)?/);
		const withMarker = raw.match(/(\d{1,2})\s*(am|pm|baje)/);
		const m = withColon || withMarker;
		if (!m) return null;

		let hour = Number(m[1]);
		const minute = withColon && m[2] ? Number(m[2]) : 0;
		// withColon: meridiem is m[3] (group after "HH:MM")
		// withMarker: meridiem is m[2] (group after the hour digit)
		const meridiem = (withColon ? m[3] || '' : m[2] || '').toLowerCase();

		if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
			return null;
		}

		if (meridiem === 'am') {
			if (hour === 12) hour = 0;
		} else if (meridiem === 'pm') {
			if (hour < 12) hour += 12;
		} else if (meridiem === 'baje') {
			// Keep existing product behavior: plain "3 baje" is treated as afternoon slot.
			if (hour < 12) hour += 12;
		}

		return { hour, minute };
	}

	private nextDailyAt(now: Date, hour: number, minute: number): Date {
		let next = setHours(now, hour);
		next = setMinutes(next, minute);
		next = setSeconds(next, 0);
		next = setMilliseconds(next, 0);
		if (next <= now) next = addDays(next, 1);
		return next;
	}

	private nextMonthlyDate(now: Date, day: number, hour: number, minute: number): Date {
		const clampedDay = Math.max(1, Math.min(31, day));
		let year = now.getFullYear();
		let month = now.getMonth();

		for (let i = 0; i < 24; i++) {
			const lastDay = new Date(year, month + 1, 0).getDate();
			const targetDay = Math.min(clampedDay, lastDay);
			const candidate = new Date(year, month, targetDay, hour, minute, 0, 0);
			if (candidate > now) return candidate;
			month += 1;
			if (month > 11) {
				month = 0;
				year += 1;
			}
		}

		return addMonths(now, 1);
	}

	private parseSchedule(dateTimeStr: string): ParsedSchedule {
		const now = new Date();

		// ── ISO datetime strings bypass natural-language parsing ──────────────────
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateTimeStr.trim())) {
			const d = new Date(dateTimeStr);
			if (!isNaN(d.getTime())) return { scheduledTime: d };
		}

		const lowerStr = this.normalizeSpokenNumbers(dateTimeStr.toLowerCase().trim());

		// हर/each/every N minutes
		const everyMinutes = lowerStr.match(
			/(?:har|each|every)\s*(?:ek\s*)?(\d+)\s*(?:minute|min|minutes|mins|minutee|minit)/
		);
		if (everyMinutes) {
			const minutes = Math.max(1, Number(everyMinutes[1]));
			return {
				scheduledTime: addMinutes(now, minutes),
				recurringPattern: { type: 'interval_minutes', value: minutes },
			};
		}

		// "N minute me/baad" -> one-time relative schedule
		const inMinutes = lowerStr.match(
			/(\d+)\s*(?:minute|min|minutes|mins|minit)\s*(?:me|mein|baad|bad|later|after)/
		);
		if (inMinutes) {
			const minutes = Math.max(1, Number(inMinutes[1]));
			return { scheduledTime: addMinutes(now, minutes) };
		}

		// रोज/daily at time
		if (/(?:daily|roz|roj|har din|every day)/.test(lowerStr)) {
			const hm = this.parseHourMinute(lowerStr) || { hour: 19, minute: 0 };
			return {
				scheduledTime: this.nextDailyAt(now, hm.hour, hm.minute),
				recurringPattern: { type: 'daily_time', hour: hm.hour, minute: hm.minute },
			};
		}

		// हर महीने X date
		const monthly = lowerStr.match(
			/(?:har|each|every)\s*(?:mahine|mahina|mhine|month)\s*(\d{1,2})\s*(?:date|tareekh|tarikh|ko)?/
		);
		if (monthly) {
			const day = Math.max(1, Math.min(31, Number(monthly[1])));
			const hm = this.parseHourMinute(lowerStr) || { hour: 9, minute: 0 };
			return {
				scheduledTime: this.nextMonthlyDate(now, day, hm.hour, hm.minute),
				recurringPattern: { type: 'monthly_date', day, hour: hm.hour, minute: hm.minute },
			};
		}

		// every N months
		const everyNMonths = lowerStr.match(/(?:har|each|every)\s*(\d+)\s*(?:mahine|mahina|month|months)/);
		if (everyNMonths) {
			const months = Math.max(1, Number(everyNMonths[1]));
			const hm = this.parseHourMinute(lowerStr);
			const base = hm ? this.nextDailyAt(now, hm.hour, hm.minute) : now;
			const first = addMonths(base, months);
			return {
				scheduledTime: first,
				recurringPattern: {
					type: 'every_n_months',
					months,
					day: first.getDate(),
					hour: first.getHours(),
					minute: first.getMinutes(),
				},
			};
		}

		return { scheduledTime: this.parseDateTime(dateTimeStr) };
	}

	private async enqueueReminderJob(payload: ReminderJobData, scheduledTime: Date): Promise<void> {
		const delay = scheduledTime.getTime() - Date.now();
		const jobId = `reminder-${payload.reminderId}-${scheduledTime.getTime()}`;
		await reminderQueue.add('send-reminder', payload, {
			delay: delay > 0 ? delay : 0,
			jobId,
		});
	}

	private async removeQueuedJobsForReminder(reminderId: string): Promise<void> {
		try {
			const legacyJob = await reminderQueue.getJob(`reminder-${reminderId}`);
			if (legacyJob) await legacyJob.remove();
		} catch (err) {
			logger.warn({ err, reminderId }, 'Legacy reminder job not found');
		}

		try {
			const queueAny = reminderQueue as any;
			if (typeof queueAny.removeJobs === 'function') {
				await queueAny.removeJobs(`reminder-${reminderId}-*`);
			}
		} catch (err) {
			logger.warn({ err, reminderId }, 'Failed to remove reminder jobs by pattern');
		}
	}

	/**
	 * Parse natural language date/time to actual datetime
	 */
	private parseDateTime(dateTimeStr: string): Date {
		const now = new Date();
		const lowerStr = dateTimeStr.toLowerCase();

		// "kal" / "tomorrow"
		if (lowerStr.includes('kal') || lowerStr.includes('tomorrow')) {
			let date = addDays(now, 1);

			// Extract time if mentioned
			const timeMatch = lowerStr.match(/(\d+)\s*(baje|pm|am)/);
			if (timeMatch) {
				const parsed = this.parseHourMinute(timeMatch[0]);
				const hour = parsed?.hour ?? 19;
				date = setHours(date, hour);
				date = setMinutes(date, 0);
			} else {
				// Default to 7 PM
				date = setHours(date, 19);
				date = setMinutes(date, 0);
			}

			return fromZonedTime(date, config.timezone);
		}

		// "aaj" / "today"
		if (lowerStr.includes('aaj') || lowerStr.includes('today')) {
			let date = now;

			const timeMatch = lowerStr.match(/(\d+)\s*(baje|pm|am)/);
			if (timeMatch) {
				const parsed = this.parseHourMinute(timeMatch[0]);
				const hour = parsed?.hour ?? now.getHours();
				date = setHours(date, hour);
				date = setMinutes(date, 0);
			}

			return fromZonedTime(date, config.timezone);
		}

		// Specific hour today
		const hourMatch = lowerStr.match(/(\d+)\s*(baje|pm|am)/);
		if (hourMatch) {
			const parsed = this.parseHourMinute(hourMatch[0]);
			const hour = parsed?.hour ?? now.getHours();
			let date = setHours(now, hour);
			date = setMinutes(date, 0);

			if (date < now) {
				date = addDays(date, 1);
			}

			return fromZonedTime(date, config.timezone);
		}

		// Default: 1 hour from now
		return addHours(now, 1);
	}

	/**
	 * Schedule a payment reminder
	 */
	async scheduleReminder(customerId: string, amount: number, dateTimeStr: string, customMessage?: string) {
		try {
			if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
				throw new Error('Customer ID is required');
			}
			if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
				throw new Error('Reminder amount must be a positive number');
			}
			if (!dateTimeStr || typeof dateTimeStr !== 'string' || !dateTimeStr.trim()) {
				throw new Error('Date/time is required for scheduling a reminder');
			}

			const customer = await prisma.customer.findUnique({
				where: { id: customerId },
			});

			if (!customer) throw new Error('Customer not found');

			// Build available channels based on customer contact info
			const availableChannels: string[] = [];
			if (customer.phone) availableChannels.push('whatsapp');
			if (customer.email) availableChannels.push('email');
			// If no contact info yet, schedule with both — contact will be added later
			const channels = availableChannels.length > 0 ? availableChannels : ['whatsapp', 'email'];

			const { scheduledTime, recurringPattern } = this.parseSchedule(dateTimeStr);

			const message =
				customMessage ||
				`Namaste ${customer.name} ji,\n\n₹${amount} payment pending hai. Kripya payment kar dein. 🙏\n\nDhanyavad`;

			// Create reminder — amount stored in notes for job re-queuing
			const reminder = await prisma.reminder.create({
				data: {
					tenantId: tenantContext.get().tenantId,
					customerId,
					reminderType: 'payment_due',
					scheduledTime,
					recurringPattern: recurringPattern as any,
					customMessage: message,
					channels,
					status: 'pending',
					notes: amount.toString(),
				} as any,
				include: {
					customer: true,
				},
			});

			try {
				await this.enqueueReminderJob(
					{
						reminderId: reminder.id,
						customerId: customer.id,
						customerName: customer.name,
						phone: customer.phone || '',
						amount,
						message,
					} as ReminderJobData,
					scheduledTime
				);
			} catch (queueError) {
				await prisma.reminder
					.update({
						where: { id: reminder.id },
						data: { status: 'failed' },
					})
					.catch((updateErr) => {
						logger.error(
							{ updateErr, reminderId: reminder.id },
							'Failed to mark reminder as failed after queue error'
						);
					});
				throw queueError;
			}

			logger.info({ reminderId: reminder.id, customerId, scheduledTime, recurringPattern }, 'Reminder scheduled');
			return reminder;
		} catch (error) {
			logger.error({ error, customerId, amount, dateTimeStr }, 'Schedule reminder failed');
			throw error;
		}
	}

	/**
	 * Cancel a scheduled reminder
	 */
	async cancelReminder(reminderId: string) {
		try {
			const reminder = await prisma.reminder.update({
				where: { id: reminderId },
				data: { status: 'cancelled' },
			});

			await this.removeQueuedJobsForReminder(reminderId);

			logger.info({ reminderId }, 'Reminder cancelled');
			return reminder;
		} catch (error) {
			logger.error({ error, reminderId }, 'Cancel reminder failed');
			throw error;
		}
	}

	/**
	 * Modify reminder time
	 */
	async modifyReminderTime(reminderId: string, newDateTimeStr: string) {
		try {
			const newScheduledTime = this.parseDateTime(newDateTimeStr);

			const reminder = await prisma.reminder.update({
				where: { id: reminderId },
				data: { scheduledTime: newScheduledTime },
				include: {
					customer: true,
				},
			});

			await this.removeQueuedJobsForReminder(reminderId);

			const amount = parseFloat((reminder as any).notes || '0');
			const message = (reminder as any).customMessage || 'Payment reminder';

			await this.enqueueReminderJob(
				{
					reminderId: reminder.id,
					customerId: reminder.customerId!,
					customerName: (reminder as any).customer?.name || '',
					phone: (reminder as any).customer?.phone || '',
					amount,
					message,
				} as ReminderJobData,
				newScheduledTime
			);

			logger.info({ reminderId, newScheduledTime }, 'Reminder time modified');
			return reminder;
		} catch (error) {
			logger.error({ error, reminderId, newDateTimeStr }, 'Modify reminder failed');
			throw error;
		}
	}

	/**
	 * Get pending reminders
	 */
	async getPendingReminders(customerId?: string) {
		return await prisma.reminder.findMany({
			where: {
				status: 'pending',
				...(customerId && { customerId }),
			},
			orderBy: { scheduledTime: 'asc' },
			include: {
				customer: {
					select: { name: true, phone: true },
				},
			},
		});
	}

	/**
	 * Get customer reminders
	 */
	async getCustomerReminders(customerId: string, limit: number = 10) {
		return await prisma.reminder.findMany({
			where: { customerId },
			orderBy: { createdAt: 'desc' },
			take: limit,
			include: {
				customer: {
					select: { name: true, phone: true },
				},
			},
		});
	}

	/**
	 * Mark reminder as sent
	 */
	async markAsSent(reminderId: string, options?: { keepPending?: boolean }) {
		return markReminderSent(reminderId, options);
	}

	/**
	 * Mark reminder as failed
	 */
	async markAsFailed(reminderId: string) {
		return markReminderFailed(reminderId);
	}

	/**
	 * Get reminders due now
	 */
	async getDueReminders() {
		return await prisma.reminder.findMany({
			where: {
				status: 'pending',
				scheduledTime: { lte: new Date() },
			},
			include: { customer: true },
		});
	}

	async scheduleNextOccurrence(reminderId: string) {
		return scheduleNextReminderOccurrence(reminderId);
	}

	/**
	 * Bulk-schedule reminders for multiple customers (e.g. all with overdue balance).
	 * daysOffset: how many days from now to schedule (default 0 = today 6pm IST).
	 */
	async bulkScheduleReminders(data: { customerIds: string[]; message?: string; daysOffset?: number }) {
		const { customerIds, message, daysOffset = 0 } = data;

		// Schedule time: today (+ daysOffset) at 18:00 IST
		const tz = config.timezone ?? 'Asia/Kolkata';
		const base = new Date();
		base.setDate(base.getDate() + daysOffset);
		base.setHours(0, 0, 0, 0);
		const scheduledTime = fromZonedTime(
			new Date(base.getFullYear(), base.getMonth(), base.getDate(), 18, 0, 0),
			tz
		);

		// Fetch customers to get their current balance
		const customers = await prisma.customer.findMany({
			where: { id: { in: customerIds }, balance: { gt: 0 } },
			select: { id: true, balance: true },
		});

		const results = await Promise.allSettled(
			customers.map((c) =>
				this.scheduleReminder(c.id, parseFloat(c.balance.toString()), scheduledTime.toISOString(), message)
			)
		);

		const succeeded = results.filter((r) => r.status === 'fulfilled');
		const failed = results.filter((r) => r.status === 'rejected');

		if (failed.length > 0) {
			logger.warn(
				{ failed: failed.length, succeeded: succeeded.length },
				'Some bulk reminders failed to schedule'
			);
		}

		const reminders = succeeded
			.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
			.map((r) => r.value);

		logger.info({ count: reminders.length, daysOffset }, 'Bulk reminders scheduled');
		return reminders;
	}
}

export const reminderService = new ReminderService();
