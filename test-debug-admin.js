const WebSocket = require('ws');

let testNum = 0;

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function testCommand(command) {
  testNum++;
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:3000/ws');
    let allMessages = [];
    const timeout = setTimeout(() => {
      ws.close();
      logResults(testNum, command, allMessages);
      resolve();
    }, 3500);

    ws.on('open', () => {
      ws.send(JSON.stringify({ 
        type: 'voice:final', 
        data: { text: command, ttsProvider: 'browser' } 
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        allMessages.push(msg);
        if (msg.type === 'voice:response' || msg.type === 'error') {
          clearTimeout(timeout);
          ws.close();
          logResults(testNum, command, allMessages);
          resolve();
        }
      } catch (e) {}
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function logResults(testNum, command, messages) {
  console.log(`\n${testNum}. "${command}"`);
  if (!messages.length) {
    console.log('   ❌ NO RESPONSE');
    return;
  }
  
  messages.forEach(msg => {
    if (msg.type === 'voice:intent' && msg.data) {
      console.log(`   • Intent: ${msg.data.intent}`);
      console.log(`     Role: ${msg.data.entities.operatorRole || 'user'}`);
    }
    if (msg.type === 'voice:response' && msg.data && msg.data.executionResult) {
      const r = msg.data.executionResult;
      console.log(`   • Result: ${r.success ? '✅ SUCCESS' : '❌ BLOCKED'}`);
      console.log(`     ${r.message}`);
    }
  });
}

async function run() {
  console.log('🔍 Admin Delete Debug Tests');
  console.log('='.repeat(50));
  
  await testCommand('Hey admin, delete Rahul data');
  await delay(500);
  
  await testCommand('एडमिन डिलीट राहुल डेटा');
  await delay(500);
  
  await testCommand('Delete Rahul data');
  
  console.log('\n' + '='.repeat(50));
}

run().catch(console.error);
