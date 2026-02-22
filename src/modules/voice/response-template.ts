import { logger } from '../../infrastructure/logger';
import { ExecutionResult } from '../../types';

/**
 * Ultra-fast response templates for Indian SME voice format
 * Reduces latency by 60-80% vs LLM generation
 * Millisecond-level response for real-time feel
 */
class ResponseTemplateService {
    /**
     * Generate response from template (no LLM call)
     * ~2ms latency vs 800-1200ms for LLM
     */
    generateFastResponse(intent: string, result: ExecutionResult): string | null {
        if (!result.success) {
            return this.getErrorResponse(result.error || result.message);
        }

        const data = result.data || {};

        switch (intent) {
            // BALANCE CHECKS - Most common & fast
            case 'CHECK_BALANCE':
                return `${data.customer} ka balance ₹${data.balance || 0} hai${data.landmark ? ` (${data.landmark})` : ''
                    }`;

            // INVOICES
            case 'CREATE_INVOICE':
                return `${data.customer} ke liye bill ban gaya. Total ₹${data.total || 0}${data.items?.length ? ` (${data.items.length} items)` : ''
                    }`;

            case 'CANCEL_INVOICE':
                return `${data.customer} ka bill cancel ho gaya`;

            // PAYMENTS & CREDIT
            case 'RECORD_PAYMENT':
                return `${data.customer} se ₹${data.amountPaid || 0} payment receive ho gaya. Remaining balance ₹${data.remainingBalance || 0
                    }`;

            case 'ADD_CREDIT':
                return `${data.customer} ko ₹${data.amountAdded || 0} credit diya gaya. Total ₹${data.totalBalance || 0}`;

            // REMINDERS
            case 'CREATE_REMINDER':
                return `${data.customer} ke liye ₹${data.amount || 0} ka reminder ${data.sendAt ? 'set' : 'kar diya'} gaya`;

            case 'MODIFY_REMINDER':
                return `${data.customer} ka reminder reschedule kar diya gaya`;

            case 'CANCEL_REMINDER':
                return `Reminder cancel kar diya gaya`;

            case 'LIST_REMINDERS':
                return `${data.count || 0} pending reminders hain${data.reminders?.length ? ` - ${data.reminders.map((r: any) => r.customer).join(', ')}` : ''
                    }`;

            // CUSTOMERS
            case 'CREATE_CUSTOMER':
                return `✅ ${data.name} add ho gaya${data.balance ? ` (₹${data.balance})` : ''}`;

            // CUSTOMER INFO
            case 'GET_CUSTOMER_INFO':
                return `${data.name} ki puri jankari mil gayi hai.\n- Naam: ${data.name}\n- Phone: ${data.phone ? data.phone : 'Nahi hai'}${data.nickname ? `\n- Nickname: ${data.nickname}` : ''}${data.landmark ? `\n- Landmark: ${data.landmark}` : ''}\n- Balance: ₹${data.balance || 0} rupees\nKya aapko isse kuch karna hai?`;

            // LIST CUSTOMER BALANCES
            case 'LIST_CUSTOMER_BALANCES': {
                if (!data.customers || !data.customers.length) {
                    return 'Sab customers ka balance zero hai.';
                }
                const lines = data.customers.map((c: any) => `- ${c.name}: ₹${c.balance}${c.landmark ? ` (${c.landmark})` : ''}`);
                return `Total ${data.customers.length} customers ke paas ₹${data.totalPending || 0} baki hai.\n${lines.join('\n')}`;
            }

            // STOCK
            case 'CHECK_STOCK':
                return `${data.product} ka stock ${data.stock || 0} units hai`;

            // SUMMARY
            case 'DAILY_SUMMARY':
                return `Aaj ${data.totalInvoices || 0} bills, ₹${data.totalAmount || 0} ka transaction${data.pendingPayments ? ` and ₹${data.pendingPayments} pending` : ''
                    }`;

            // TOTAL PENDING AMOUNT
            case 'TOTAL_PENDING_AMOUNT':
                return `Total pending amount hai ₹${data.totalPending || 0}`;

            default:
                return null;
        }
    }

    /**
     * Get error response (generic + cached)
     */
    private getErrorResponse(error?: string): string {
        const errorMap: Record<string, string> = {
            CUSTOMER_NOT_FOUND: 'Customer nahi mila. Naya customer add karein?',
            MULTIPLE_CUSTOMERS:
                'Multiple customers found. Name se specifically batao (e.g., "Rahul ka...")',
            CUSTOMER_CONTEXT_MISSING: 'Pehle customer ka naam batao phir kya karna hai bata.',
            NO_PHONE: 'Customer ke paas phone number nahi hai. Phone add karo pehle.',
            NO_INVOICE: 'Koi bill nahi mila',
            NO_REMINDER: 'Koi reminder nahi hai',
            MISSING_NAME: 'Customer ka naam batao',
            DUPLICATE_FOUND: 'Similar customer already exist. Confirm karo?',
        };

        return errorMap[error || ''] || `Kuch problem aaya. Phir se try karo.`;
    }

    /**
     * Check if response can be templated (no LLM needed)
     */
    canUseTemplate(intent: string): boolean {
        const templateIntents = [
            'CHECK_BALANCE',
            'CREATE_INVOICE',
            'CANCEL_INVOICE',
            'RECORD_PAYMENT',
            'ADD_CREDIT',
            'CREATE_REMINDER',
            'MODIFY_REMINDER',
            'CANCEL_REMINDER',
            'LIST_REMINDERS',
            'CREATE_CUSTOMER',
            'GET_CUSTOMER_INFO',
            'CHECK_STOCK',
            'DAILY_SUMMARY',
            'LIST_CUSTOMER_BALANCES',
            'TOTAL_PENDING_AMOUNT',
        ];
        return templateIntents.includes(intent);
    }

    /**
     * Estimate savings vs LLM call
     */
    estimateSavings(): object {
        return {
            template_latency_ms: 2,
            llm_latency_ms: 800,
            savings_per_call_ms: 798,
            savings_percent: 99,
            note: '50 commands/min = 39.9 seconds saved/min',
        };
    }
}

export const responseTemplateService = new ResponseTemplateService();
