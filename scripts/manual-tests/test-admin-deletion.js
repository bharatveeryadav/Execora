const {
    businessEngine
} = require('./dist/modules/voice/engine');
const {
    prisma
} = require('./dist/infrastructure/database');

async function testAdminOnlyDeletion() {
    const timestamp = () => new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    try {
        // Create test customer
        console.log(`\n[${timestamp()}] 📋 Creating test customer...`);
        const customer = await prisma.customer.create({
            data: {
                name: 'AdminTestCustomer',
                phone: '9999999999',
                email: 'bharatveeryadavg@gmail.com',
                balance: 0,
            },
        });
        console.log(`[${timestamp()}] ✅ Customer created: ${customer.name}`);

        console.log(`\n[${timestamp()}] 🔐 TEST 1: User (Non-Admin) attempts deletion\n`);
        const userAttempt = await businessEngine.execute({
            intent: 'DELETE_CUSTOMER_DATA',
            entities: {
                name: customer.name,
                operatorRole: 'user',
                // No adminEmail - user role
            },
            confidence: 0.95,
            originalText: 'Delete customer data',
        }, 'test-' + Date.now());

        console.log(`[${timestamp()}] Result: ${userAttempt.success ? '✅ SUCCESS' : '❌ BLOCKED'}`);
        console.log(`[${timestamp()}] Error: ${userAttempt.error}`);
        console.log(`[${timestamp()}] Message: ${userAttempt.message}\n`);

        if (userAttempt.error === 'UNAUTHORIZED_DELETE_OPERATION') {
            console.log(`[${timestamp()}] ✅ SECURITY CHECK PASSED - Non-admin blocked from deletion!\n`);
        }

        console.log(`[${timestamp()}] 🔐 TEST 2: Admin executes deletion with OTP\n`);

        // Step 1: Admin requests deletion
        console.log(`[${timestamp()}] ▶️ Step 1: Admin triggers deletion...`);
        const adminStep1 = await businessEngine.execute({
            intent: 'DELETE_CUSTOMER_DATA',
            entities: {
                name: customer.name,
                operatorRole: 'admin',
                adminEmail: 'bharatveeryadavg@gmail.com',
            },
            confidence: 0.95,
            originalText: `Delete customer ${customer.name}`,
        }, 'admin-test-' + Date.now());

        console.log(`[${timestamp()}] Response: ${adminStep1.error || adminStep1.success}`);
        if (adminStep1.data && adminStep1.data.otp) {
            console.log(`[${timestamp()}] 🔑 OTP Generated: ${adminStep1.data.otp}`);
            console.log(`[${timestamp()}] 📧 OTP sent to admin email: ${adminStep1.data.adminEmail}`);
        }

        if (adminStep1.error === 'ADMIN_VERIFICATION_NEEDED') {
            console.log(`[${timestamp()}] ✅ OTP verification required (as expected)\n`);

            // Wait for email delivery
            await new Promise(r => setTimeout(r, 2000));

            // Step 2: Admin confirms with OTP
            console.log(`[${timestamp()}] ▶️ Step 2: Admin verifies with OTP...`);
            const adminStep2 = await businessEngine.execute({
                intent: 'DELETE_CUSTOMER_DATA',
                entities: {
                    name: customer.name,
                    operatorRole: 'admin',
                    adminEmail: 'bharatveeryadavg@gmail.com',
                    confirmation: `Delete customer ${customer.name}, OTP hai ${adminStep1.data.otp}`,
                },
                confidence: 0.95,
                originalText: `Delete customer ${customer.name}, OTP hai ${adminStep1.data.otp}`,
            }, 'admin-test-' + Date.now());

            console.log(`[${timestamp()}] ✅ Result: ${adminStep2.success ? '✅ SUCCESS' : '❌ FAILED'}`);
            if (adminStep2.success) {
                console.log(`[${timestamp()}] 🎉 DELETION COMPLETE`);
                console.log(`[${timestamp()}] 📊 Deleted Records: ${adminStep2.data ? JSON.stringify(adminStep2.data.deletedRecounts) : 'N/A'}`);
                console.log(`\n[${timestamp()}] ✅ ADMIN-ONLY DELETION SYSTEM VERIFIED!\n`);
            }
        }

    } catch (error) {
        console.error(`[${timestamp()}] ❌ Error:`, error.message);
    }

    process.exit(0);
}

testAdminOnlyDeletion();