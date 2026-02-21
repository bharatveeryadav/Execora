const WebSocket = require('ws');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function askQuestion(query) {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer);
        });
    });
}

async function testAdminDelete() {
    const ws = new WebSocket('ws://localhost:3000/ws');

    ws.on('open', async () => {
        console.log('✅ WebSocket connected');

        // Test 1: English admin command
        console.log('\n📝 Test 1: English admin command - "Hey admin, delete Rahul data"');
        ws.send(JSON.stringify({
            text: 'Hey admin, delete Rahul data'
        }));

        // Wait for response
        setTimeout(async () => {
            // Test 2: Hindi admin command
            console.log('\n📝 Test 2: Hindi admin command - "एडमिन डिलीट राहुल डेटा"');
            ws.send(JSON.stringify({
                text: 'एडमिन डिलीट राहुल डेटा'
            }));

            // Wait for response
            setTimeout(() => {
                console.log('\n✅ Tests completed');
                rl.close();
                ws.close();
            }, 2000);
        }, 2000);
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('📨 Response:', JSON.stringify(message, null, 2));
        } catch (e) {
            console.log('📨 Response (raw):', data.toString());
        }
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });

    ws.on('close', () => {
        console.log('\n✅ WebSocket closed');
    });
}

testAdminDelete().catch(console.error);