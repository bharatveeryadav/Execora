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
      resolve(allMessages);
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
          resolve(allMessages);
        }
      } catch (e) {}
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(allMessages);
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
      console.log(`   ✓ Intent: ${msg.data.intent}`);
      console.log(`     Role: ${msg.data.entities.operatorRole || 'user'}`);
    }
    if (msg.type === 'voice:response' && msg.data && msg.data.executionResult) {
      const r = msg.data.executionResult;
      console.log(`   ✓ Result: ${r.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`     Message: ${r.message}`);
      if (r.data) {
        console.log(`     OTP: ${r.data.otp || 'N/A'}`);
      }
    }
  });
}

async function run() {
  console.log('🧪 Testing Admin Delete Flow');
  console.log('='.repeat(60));
  
  console.log('\n📝 Test 1: Admin says delete (Step 1 - Send OTP)');
  const msg1 = await testCommand('Hey admin, delete Rahul data');
  
  await delay(1000);
  
  // Extract OTP if available
  let otp = null;
  for (const msg of msg1) {
    if (msg.type === 'voice:response' && msg.data && msg.data.executionResult && msg.data.executionResult.data) {
      otp = msg.data.executionResult.data.otp;
      break;
    }
  }
  
  if (otp) {
    console.log(`\n📝 Test 2: Admin provides OTP ${otp} (Step 2 - Delete)`);
    await testCommand(`My OTP is ${otp}`);
  } else {
    console.log(`\n⚠️  No OTP returned in step 1`);
  }
  
  console.log('\n' + '='.repeat(60));
}

run().catch(console.error);
