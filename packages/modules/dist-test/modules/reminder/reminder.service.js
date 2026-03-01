"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderService = void 0;
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
const infrastructure_3 = require("@execora/infrastructure");
const infrastructure_4 = require("@execora/infrastructure");
const infrastructure_5 = require("@execora/infrastructure");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const infrastructure_6 = require("@execora/infrastructure");
class ReminderService {
    normalizeSpokenNumbers(input) {
        const devanagariDigits = {
            '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
            '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
        };
        let text = input.replace(/[०-९]/g, (ch) => devanagariDigits[ch] ?? ch);
        const numberWords = [
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
    parseHourMinute(raw) {
        const withColon = raw.match(/(\d{1,2}):(\d{1,2})\s*(am|pm)?/);
        const withMarker = raw.match(/(\d{1,2})\s*(am|pm|baje)/);
        const m = withColon || withMarker;
        if (!m)
            return null;
        let hour = Number(m[1]);
        const minute = withColon && m[2] ? Number(m[2]) : 0;
        // withColon: meridiem is m[3] (group after "HH:MM")
        // withMarker: meridiem is m[2] (group after the hour digit)
        const meridiem = (withColon ? (m[3] || '') : (m[2] || '')).toLowerCase();
        if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return null;
        }
        if (meridiem === 'am') {
            if (hour === 12)
                hour = 0;
        }
        else if (meridiem === 'pm') {
            if (hour < 12)
                hour += 12;
        }
        else if (meridiem === 'baje') {
            // Keep existing product behavior: plain "3 baje" is treated as afternoon slot.
            if (hour < 12)
                hour += 12;
        }
        return { hour, minute };
    }
    nextDailyAt(now, hour, minute) {
        let next = (0, date_fns_1.setHours)(now, hour);
        next = (0, date_fns_1.setMinutes)(next, minute);
        next = (0, date_fns_1.setSeconds)(next, 0);
        next = (0, date_fns_1.setMilliseconds)(next, 0);
        if (next <= now)
            next = (0, date_fns_1.addDays)(next, 1);
        return next;
    }
    nextMonthlyDate(now, day, hour, minute) {
        const clampedDay = Math.max(1, Math.min(31, day));
        let year = now.getFullYear();
        let month = now.getMonth();
        for (let i = 0; i < 24; i++) {
            const lastDay = new Date(year, month + 1, 0).getDate();
            const targetDay = Math.min(clampedDay, lastDay);
            const candidate = new Date(year, month, targetDay, hour, minute, 0, 0);
            if (candidate > now)
                return candidate;
            month += 1;
            if (month > 11) {
                month = 0;
                year += 1;
            }
        }
        return (0, date_fns_1.addMonths)(now, 1);
    }
    parseSchedule(dateTimeStr) {
        const now = new Date();
        const lowerStr = this.normalizeSpokenNumbers(dateTimeStr.toLowerCase().trim());
        // हर/each/every N minutes
        const everyMinutes = lowerStr.match(/(?:har|each|every)\s*(?:ek\s*)?(\d+)\s*(?:minute|min|minutes|mins|minutee|minit)/);
        if (everyMinutes) {
            const minutes = Math.max(1, Number(everyMinutes[1]));
            return {
                scheduledTime: (0, date_fns_1.addMinutes)(now, minutes),
                recurringPattern: { type: 'interval_minutes', value: minutes },
            };
        }
        // "N minute me/baad" -> one-time relative schedule
        const inMinutes = lowerStr.match(/(\d+)\s*(?:minute|min|minutes|mins|minit)\s*(?:me|mein|baad|bad|later|after)/);
        if (inMinutes) {
            const minutes = Math.max(1, Number(inMinutes[1]));
            return { scheduledTime: (0, date_fns_1.addMinutes)(now, minutes) };
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
        const monthly = lowerStr.match(/(?:har|each|every)\s*(?:mahine|mahina|mhine|month)\s*(\d{1,2})\s*(?:date|tareekh|tarikh|ko)?/);
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
            const first = (0, date_fns_1.addMonths)(base, months);
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
    async enqueueReminderJob(payload, scheduledTime) {
        const delay = scheduledTime.getTime() - Date.now();
        const jobId = `reminder-${payload.reminderId}-${scheduledTime.getTime()}`;
        await infrastructure_3.reminderQueue.add('send-reminder', payload, {
            delay: delay > 0 ? delay : 0,
            jobId,
        });
    }
    async removeQueuedJobsForReminder(reminderId) {
        try {
            const legacyJob = await infrastructure_3.reminderQueue.getJob(`reminder-${reminderId}`);
            if (legacyJob)
                await legacyJob.remove();
        }
        catch (err) {
            infrastructure_2.logger.warn({ err, reminderId }, 'Legacy reminder job not found');
        }
        try {
            const queueAny = infrastructure_3.reminderQueue;
            if (typeof queueAny.removeJobs === 'function') {
                await queueAny.removeJobs(`reminder-${reminderId}-*`);
            }
        }
        catch (err) {
            infrastructure_2.logger.warn({ err, reminderId }, 'Failed to remove reminder jobs by pattern');
        }
    }
    /**
     * Parse natural language date/time to actual datetime
     */
    parseDateTime(dateTimeStr) {
        const now = new Date();
        const lowerStr = dateTimeStr.toLowerCase();
        // "kal" / "tomorrow"
        if (lowerStr.includes('kal') || lowerStr.includes('tomorrow')) {
            let date = (0, date_fns_1.addDays)(now, 1);
            // Extract time if mentioned
            const timeMatch = lowerStr.match(/(\d+)\s*(baje|pm|am)/);
            if (timeMatch) {
                const parsed = this.parseHourMinute(timeMatch[0]);
                const hour = parsed?.hour ?? 19;
                date = (0, date_fns_1.setHours)(date, hour);
                date = (0, date_fns_1.setMinutes)(date, 0);
            }
            else {
                // Default to 7 PM
                date = (0, date_fns_1.setHours)(date, 19);
                date = (0, date_fns_1.setMinutes)(date, 0);
            }
            return (0, date_fns_tz_1.fromZonedTime)(date, infrastructure_6.config.timezone);
        }
        // "aaj" / "today"
        if (lowerStr.includes('aaj') || lowerStr.includes('today')) {
            let date = now;
            const timeMatch = lowerStr.match(/(\d+)\s*(baje|pm|am)/);
            if (timeMatch) {
                const parsed = this.parseHourMinute(timeMatch[0]);
                const hour = parsed?.hour ?? now.getHours();
                date = (0, date_fns_1.setHours)(date, hour);
                date = (0, date_fns_1.setMinutes)(date, 0);
            }
            return (0, date_fns_tz_1.fromZonedTime)(date, infrastructure_6.config.timezone);
        }
        // Specific hour today
        const hourMatch = lowerStr.match(/(\d+)\s*(baje|pm|am)/);
        if (hourMatch) {
            const parsed = this.parseHourMinute(hourMatch[0]);
            const hour = parsed?.hour ?? now.getHours();
            let date = (0, date_fns_1.setHours)(now, hour);
            date = (0, date_fns_1.setMinutes)(date, 0);
            if (date < now) {
                date = (0, date_fns_1.addDays)(date, 1);
            }
            return (0, date_fns_tz_1.fromZonedTime)(date, infrastructure_6.config.timezone);
        }
        // Default: 1 hour from now
        return (0, date_fns_1.addHours)(now, 1);
    }
    /**
     * Schedule a payment reminder
     */
    async scheduleReminder(customerId, amount, dateTimeStr, customMessage) {
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
            const customer = await infrastructure_1.prisma.customer.findUnique({
                where: { id: customerId },
            });
            if (!customer)
                throw new Error('Customer not found');
            if (!customer.phone)
                throw new Error('Customer phone number not found');
            const { scheduledTime, recurringPattern } = this.parseSchedule(dateTimeStr);
            const message = customMessage ||
                `Namaste ${customer.name} ji,\n\n₹${amount} payment pending hai. Kripya payment kar dein. 🙏\n\nDhanyavad`;
            // Create reminder — amount stored in notes for job re-queuing
            const reminder = await infrastructure_1.prisma.reminder.create({
                data: {
                    tenantId: infrastructure_4.tenantContext.get().tenantId,
                    customerId,
                    reminderType: 'payment_due',
                    scheduledTime,
                    recurringPattern: recurringPattern,
                    customMessage: message,
                    channels: ['whatsapp', 'email'],
                    status: 'pending',
                    notes: amount.toString(),
                },
                include: {
                    customer: true,
                },
            });
            try {
                await this.enqueueReminderJob({
                    reminderId: reminder.id,
                    customerId: customer.id,
                    customerName: customer.name,
                    phone: customer.phone,
                    amount,
                    message,
                }, scheduledTime);
            }
            catch (queueError) {
                await infrastructure_1.prisma.reminder.update({
                    where: { id: reminder.id },
                    data: { status: 'failed' },
                }).catch((updateErr) => {
                    infrastructure_2.logger.error({ updateErr, reminderId: reminder.id }, 'Failed to mark reminder as failed after queue error');
                });
                throw queueError;
            }
            infrastructure_2.logger.info({ reminderId: reminder.id, customerId, scheduledTime, recurringPattern }, 'Reminder scheduled');
            return reminder;
        }
        catch (error) {
            infrastructure_2.logger.error({ error, customerId, amount, dateTimeStr }, 'Schedule reminder failed');
            throw error;
        }
    }
    /**
     * Cancel a scheduled reminder
     */
    async cancelReminder(reminderId) {
        try {
            const reminder = await infrastructure_1.prisma.reminder.update({
                where: { id: reminderId },
                data: { status: 'cancelled' },
            });
            await this.removeQueuedJobsForReminder(reminderId);
            infrastructure_2.logger.info({ reminderId }, 'Reminder cancelled');
            return reminder;
        }
        catch (error) {
            infrastructure_2.logger.error({ error, reminderId }, 'Cancel reminder failed');
            throw error;
        }
    }
    /**
     * Modify reminder time
     */
    async modifyReminderTime(reminderId, newDateTimeStr) {
        try {
            const newScheduledTime = this.parseDateTime(newDateTimeStr);
            const reminder = await infrastructure_1.prisma.reminder.update({
                where: { id: reminderId },
                data: { scheduledTime: newScheduledTime },
                include: {
                    customer: true,
                },
            });
            await this.removeQueuedJobsForReminder(reminderId);
            const amount = parseFloat(reminder.notes || '0');
            const message = reminder.customMessage || 'Payment reminder';
            await this.enqueueReminderJob({
                reminderId: reminder.id,
                customerId: reminder.customerId,
                customerName: reminder.customer?.name || '',
                phone: reminder.customer?.phone || '',
                amount,
                message,
            }, newScheduledTime);
            infrastructure_2.logger.info({ reminderId, newScheduledTime }, 'Reminder time modified');
            return reminder;
        }
        catch (error) {
            infrastructure_2.logger.error({ error, reminderId, newDateTimeStr }, 'Modify reminder failed');
            throw error;
        }
    }
    /**
     * Get pending reminders
     */
    async getPendingReminders(customerId) {
        return await infrastructure_1.prisma.reminder.findMany({
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
    async getCustomerReminders(customerId, limit = 10) {
        return await infrastructure_1.prisma.reminder.findMany({
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
    async markAsSent(reminderId, options) {
        return (0, infrastructure_5.markReminderSent)(reminderId, options);
    }
    /**
     * Mark reminder as failed
     */
    async markAsFailed(reminderId) {
        return (0, infrastructure_5.markReminderFailed)(reminderId);
    }
    /**
     * Get reminders due now
     */
    async getDueReminders() {
        return await infrastructure_1.prisma.reminder.findMany({
            where: {
                status: 'pending',
                scheduledTime: { lte: new Date() },
            },
            include: { customer: true },
        });
    }
    async scheduleNextOccurrence(reminderId) {
        return (0, infrastructure_5.scheduleNextReminderOccurrence)(reminderId);
    }
}
exports.reminderService = new ReminderService();
//# sourceMappingURL=reminder.service.js.map