const {
    emailService
} = require('./dist/infrastructure/email');

(async () => {
    try {
        console.log('🚀 Testing Email OTP Service...\n');

        console.log('📧 Initializing email service...');
        await emailService.initialize();

        console.log('✅ Email service initialized');
        console.log('   Is enabled:', emailService.isEnabled());

        console.log('\n📤 Sending test OTP email to bharatveeryadavg@gmail.com...');
        await emailService.sendDeletionOtpEmail('bharatveeryadavg@gmail.com', 'Nitin', '123456');

        console.log('✅ Test OTP email sent successfully!');
        console.log('\n📧 Check your inbox at bharatveeryadavg@gmail.com');
        console.log('   Subject: Execora - Data Deletion OTP');
        console.log('   OTP displayed in email: 123456');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) console.error('   Code:', error.code);
        console.error('   Full error:', error);
    }
    process.exit(0);
})();