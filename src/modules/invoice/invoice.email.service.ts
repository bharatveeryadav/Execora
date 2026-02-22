import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { emailService } from '../../integrations/email';
import { invoiceService } from './invoice.service';
import { reminderService } from '../reminder/reminder.service';
import { config } from '../../config';

export class InvoiceEmailService {
    /**
     * Send invoice to customer via email
     */
    async sendInvoiceEmail(invoiceId: string, toEmail: string, sendAt?: Date) {
        // Fetch invoice details
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                customer: true,
                items: { include: { product: true } },
            },
        });
        if (!invoice) throw new Error('Invoice not found');
        if (!toEmail) throw new Error('Recipient email required');

        // Render invoice HTML (simple version)
        const html = this.renderInvoiceHtml(invoice);
        const subject = `Invoice #${invoice.id.substring(0, 8)} from ${config.email.from}`;

        if (sendAt && sendAt > new Date()) {
            // Schedule reminder
            await reminderService.scheduleReminder(
                invoice.customerId,
                parseFloat(invoice.total.toString()),
                sendAt.toISOString(),
                `Invoice reminder: Please check your email for Invoice #${invoice.id.substring(0, 8)}`
            );
            logger.info({ invoiceId, toEmail, sendAt }, 'Invoice email scheduled for later');
            return { scheduled: true };
        } else {
            // Send immediately
            await emailService.sendMail({
                to: toEmail,
                subject,
                html,
            });
            logger.info({ invoiceId, toEmail }, 'Invoice email sent');
            return { sent: true };
        }
    }

    /**
     * Render invoice HTML (basic)
     */
    renderInvoiceHtml(invoice: any) {
        return `
      <h2>Invoice #${invoice.id.substring(0, 8)}</h2>
      <p><strong>Customer:</strong> ${invoice.customer.name} (${invoice.customer.email || ''})</p>
      <p><strong>Date:</strong> ${invoice.createdAt}</p>
      <table border="1" cellpadding="5" cellspacing="0">
        <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>
          ${invoice.items
                .map(
                    (item: any) =>
                        `<tr><td>${item.product.name}</td><td>${item.quantity}</td><td>${item.price}</td><td>${item.total}</td></tr>`
                )
                .join('')}
        </tbody>
      </table>
      <p><strong>Total:</strong> ₹${invoice.total}</p>
    `;
    }
}

export const invoiceEmailService = new InvoiceEmailService();
