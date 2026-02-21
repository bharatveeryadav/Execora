const {
    prisma
} = require('./dist/infrastructure/database');

(async () => {
    try {
        // Create a new test customer with email
        const customer = await prisma.customer.create({
            data: {
                name: 'TestUser',
                phone: '9876543210',
                email: 'bharatveeryadavg@gmail.com',
                balance: 0,
            },
        });

        console.log('✅ New customer created:');
        console.log('   ID:', customer.id);
        console.log('   Name:', customer.name);
        console.log('   Email:', customer.email);
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();