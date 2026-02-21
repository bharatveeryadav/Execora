const WebSocket = require('ws');

function testVoiceCommand(command) {
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:3000/ws');
    let responses = [];
    let timeout = setTimeout(() => {
      ws.close();
      resolve(responses);
    }, 4000);

    ws.on('open', () => {
      console.log(`📨 "${command}"`);
      ws.send(JSON.stringify({ 
        type: 'voice:final', 
        data: { text: command, ttsProvider: 'browser' } 
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        responses.push(msg);
        console.log(`   📍 ${msg.type}`);
        
        if (msg.type === 'voice:response' || msg.type === 'error') {
          clearTimeout(timeout);
          ws.close();
          
          if (msg.type === 'voice:response' && msg.data) {
            const result = msg.data.executionResult;
            if (result) {
              console.log(`   ✓  Result: ${result.success ? 'SUCCESS' : 'BLOCKED'}`);
              if (result.message) console.log(`       ${result.message}`);
              if (result.error) console.log(`       Error: ${result.error}`);
            }
          }
          resolve(responses);
        }
      } catch (e) {}
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      resolve(responses);
    });
  });
}

async function run() {
  console.log('\n🚀 ADMIN DELETE FEATURE TESTS');
  console.log('='.repeat(55));
  
  console.log('\n📝 TEST 1: English admin command');
  await testVoiceCommand('Hey admin, delete Rahul data');
  
  console.log('\n📝 TEST 2: Hindi admin command');
  await testVoiceCommand('एडमिन डिलीट राहुल डेटा');
  
  console.log('\n📝 TEST 3: Non-admin delete (should be blocked)');
  await testVoiceCommand('Delete Rahul data');
  
  console.log('\n' + '='.repeat(55));
  console.log('✅ All tests completed!\n');
}

run().catch(console.error);
