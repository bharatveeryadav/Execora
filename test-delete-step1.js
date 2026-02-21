#!/usr/bin/env node

/**
 * Step 1: Trigger deletion request for "Nitin"
 * This will send OTP to email
 */

const {
    businessEngine
} = require('./dist/modules/voice/engine');

async function testDeleteFlow() {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 STEP 1: Requesting data deletion for Nitin');
        console.log('='.repeat(60) + '\n');

        const conversationId = 'test-delete-' + Date.now();

        // Step 1: Request deletion (will trigger OTP send)
        const step1Intent = {
            intent: 'DELETE_CUSTOMER_DATA',
            entities: {
                name: 'Nitin',
            },
            confidence: 0.95,
            originalText: 'Nitin ka data delete karo',
        };

        console.log('Intent:', JSON.stringify(step1Intent, null, 2));
        console.log('\n📤 Executing...\n');

        const result1 = await businessEngine.execute(step1Intent, conversationId);

        console.log('Response:');
        console.log(JSON.stringify(result1, null, 2));

        if (result1.error === 'CONFIRMATION_NEEDED') {
            console.log('\n✅ Step 1 Complete!');
            console.log('📧 OTP email has been sent to: bharatveeryadavg@gmail.com');
            console.log('🔑 Test OTP (for testing only): ' + result1.data.otp);
            console.log('\n' + '='.repeat(60));
            console.log('📋 Next Step: Check your email for OTP and provide it');
            console.log('='.repeat(60) + '\n');
            console.log('To complete the deletion, you would then provide the OTP like:');
            console.log('  "Delete mere data, OTP hai ' + result1.data.otp + '"');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }

    process.exit(0);
}

testDeleteFlow();