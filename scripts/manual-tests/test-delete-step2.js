#!/usr/bin/env node

/**
 * Step 2: Confirm deletion with OTP
 * This will complete the deletion process
 */

const {
    businessEngine
} = require('./dist/modules/voice/engine');

async function completeDeleteFlow() {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('🔑 STEP 2: Confirming deletion with OTP');
        console.log('='.repeat(60) + '\n');

        const conversationId = 'test-delete-' + Date.now();

        // Step 2: Confirm with OTP (will delete all data)
        const step2Intent = {
            intent: 'DELETE_CUSTOMER_DATA',
            entities: {
                name: 'Nitin',
                confirmation: 'Delete mere data, OTP hai 386333', // The actual OTP from email
            },
            confidence: 0.95,
            originalText: 'Delete mere data, OTP hai 386333',
        };

        console.log('Intent:', JSON.stringify(step2Intent, null, 2));
        console.log('\n📤 Executing deletion...\n');

        const result2 = await businessEngine.execute(step2Intent, conversationId);

        console.log('Response:');
        console.log(JSON.stringify(result2, null, 2));

        if (result2.success) {
            console.log('\n' + '✅'.repeat(30));
            console.log('\n🎉 DELETION COMPLETE!');
            console.log('\n📊 Records Deleted:');
            if (result2.data && result2.data.deletedCounts) {
                const counts = result2.data.deletedCounts;
                console.log(`   • Invoices: ${counts.invoices}`);
                console.log(`   • Ledger Entries: ${counts.entries}`);
                console.log(`   • Reminders: ${counts.reminders}`);
                console.log(`   • Messages: ${counts.messages}`);
                console.log(`   • Conversations: ${counts.conversations}`);
            }
            console.log('\n📧 Confirmation email has been sent');
            console.log('\n' + '✅'.repeat(30));
        } else if (result2.error === 'OTP_MISSING') {
            console.log('\n⚠️ OTP not provided or invalid');
            console.log('Please extract the OTP from the email and provide it');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }

    process.exit(0);
}

completeDeleteFlow();