/**
 * Manual test for sending invoice email to specific addresses.
 * Usage: node scripts/manual-tests/test-send-invoice-email.js
 */

const {
    invoiceService
} = require('../../dist/modules/invoice/invoice.service');
const {
    prisma
} = require('../../dist/infrastructure/database');

async function main() {
    // Test emails
    const emails = [
        'bharatveer100@gmail.com',
        'bharatveeryadavg@gmail.com',
    ];

    // Find a recent invoice for any customer (or create a dummy one)
    let invoice = await prisma.invoice.findFirst({
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            customer: true,
            items: true
        },
    });

    if (!invoice) {
        // Create a dummy customer and invoice if none exist
        const customer = await prisma.customer.create({
            data: {
                name: 'TestUser',
                phone: '9999999999',
                email: emails[0],
                balance: 0,
            },
        });
        invoice = await prisma.invoice.create({
            data: {
                customerId: customer.id,
                total: 100,
                status: 'CONFIRMED',
                items: {
                    create: [{
                        productId: 'prod-001',
                        quantity: 1,
                        price: 100,
                        total: 100
                    }],
                },
            },
            include: {
                customer: true,
                items: true
            },
        });
    }

    for (const email of emails) {
        console.log(`\n\u2709\ufe0f Sending invoice ${invoice.id} to ${email}...`);
        try {
            const result = await invoiceService.sendInvoiceByEmail(invoice.id, email);
            if (result && (result.sent || result.scheduled)) {
                console.log(`\u2705 Email sent/scheduled to ${email}`);
            } else {
                console.error(`\u274c Failed to send email to ${email}`);
            }
        } catch (err) {
            console.error(`\u274c Error sending to ${email}:`, err.message);
        }
    }

    process.exit(0);
}

main();