const {
    businessEngine
} = require('./dist/modules/voice/engine');

async function test() {
    const timestamp = () => new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    console.log(`\n[${timestamp()}] 🚀 REAL-TIME TEST: DELETE_CUSTOMER_DATA\n`);
    console.log(`[${timestamp()}] ▶️ STEP 1: Trigger deletion request`);
    console.log(`[${timestamp()}] 👤 Customer: TestUser`);
    console.log(`[${timestamp()}] 📧 Email: bharatveeryadavg@gmail.com\n`);

    try {
        const step1 = await businessEngine.execute({
            intent: 'DELETE_CUSTOMER_DATA',
            entities: {
                name: 'TestUser'
            },
            confidence: 0.95,
            originalText: 'TestUser ka data delete karo',
        }, 'test-' + Date.now());

        console.log(`[${timestamp()}] ✅ Step 1 Response: ${step1.error || step1.success}`);
        if (step1.data && step1.data.otp) {
            console.log(`[${timestamp()}] 🔑 Generated OTP: ${step1.data.otp}`);
        }

        if (step1.error === 'CONFIRMATION_NEEDED') {
            console.log(`[${timestamp()}] 📧 OTP email sent\n`);
            console.log(`[${timestamp()}] ⏳ Waiting 3 seconds for email delivery...\n`);
            await new Promise(r => setTimeout(r, 3000));

            console.log(`[${timestamp()}] ▶️ STEP 2: Confirm deletion with OTP`);
            const step2 = await businessEngine.execute({
                intent: 'DELETE_CUSTOMER_DATA',
                entities: {
                    name: 'TestUser',
                    confirmation: `Delete mere data, OTP hai ${step1.data.otp}`,
                },
                confidence: 0.95,
                originalText: `Delete mere data, OTP hai ${step1.data.otp}`,
            }, 'test-' + Date.now());

            console.log(`[${timestamp()}] ✅ Step 2 Result: ${step2.success ? '✅ SUCCESS' : '❌ FAILED'}`);

            if (step2.success) {
                console.log(`[${timestamp()}] 🎉 DELETION COMPLETE!\n`);
                console.log(`[${timestamp()}] 📊 Records Deleted:`);
                if (step2.data && step2.data.deletedCounts) {
                    const c = step2.data.deletedCounts;
                    console.log(`     • Invoices: ${c.invoices}`);
                    console.log(`     • Ledger Entries: ${c.entries}`);
                    console.log(`     • Reminders: ${c.reminders}`);
                    console.log(`     • Messages: ${c.messages}`);
                    console.log(`     • Conversations: ${c.conversations}`);
                }
                console.log(`[${timestamp()}] 📧 Confirmation email sent`);
                console.log(`\n[${timestamp()}] ✨ TEST PASSED - All data deleted successfully!\n`);
            } else {
                console.log(`[${timestamp()}] ❌ Deletion error: ${step2.error}`);
            }
        } else if (step1.error === 'CUSTOMER_NOT_FOUND') {
            console.log(`[${timestamp()}] ❌ Customer not found`);
        }

    } catch (error) {
        console.error(`[${timestamp()}] ❌ Exception:`, error.message);
    }

    process.exit(0);
}

test();