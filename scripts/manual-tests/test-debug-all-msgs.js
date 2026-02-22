const WebSocket = require('ws');

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let testNum = 0;

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
        allMessages.push(msg.type);
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

function logResults(testNum, command, types) {
  console.log(`\nTest ${testNum}: "${command}"`);
  if (!types.length) {
    console.log('  ❌ NO MESSAGES');
  } else {
    console.log(`  Messages: ${types.join(' → ')}`);
  }
}

async function run() {
  console.log('🔍 Debug: All WebSocket Messages');
  console.log('='.repeat(50));
  
  await testCommand('Hey admin, delete Rahul data');
  await delay(300);
  
  await testCommand('एडमिन डिलीट राहुल डेटा');
  await delay(300);
  
  await testCommand('Delete Rahul data');
  
  console.log('\n' + '='.repeat(50));
}

run().catch(console.error);
