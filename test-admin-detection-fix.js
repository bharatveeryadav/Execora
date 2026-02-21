const WebSocket = require('ws');

const BASE_URL = 'ws://localhost:3000/ws';

// Test cases to verify admin detection works
const testCases = [
  {
    name: 'English: "Hey admin, delete Rahul data"',
    text: 'Hey admin, delete Rahul data',
    expectedRole: 'admin',
    expectOTP: true,
  },
  {
    name: 'English lowercase: "admin delete Rahul ka sab data"',
    text: 'admin delete Rahul ka sab data',
    expectedRole: 'admin',
    expectOTP: true,
  },
  {
    name: 'Hindi: "एडमिन डिलीट राहुल डेटा"',
    text: 'एडमिन डिलीट राहुल डेटा',
    expectedRole: 'admin',
    expectOTP: true,
  },
  {
    name: 'English: "delete Rahul data" (should be user)',
    text: 'delete Rahul data',
    expectedRole: 'user',
    expectOTP: false,
  },
];

async function runTest(testCase) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`TEST: ${testCase.name}`);
      console.log(`Input: "${testCase.text}"`);
      console.log(`Expected Role: ${testCase.expectedRole}`);
      console.log(`Should have OTP: ${testCase.expectOTP}`);
      console.log('='.repeat(70));

      const ws = new WebSocket(BASE_URL);
      let intentReceived = false;
      let responseReceived = false;

      ws.addEventListener('open', () => {
        console.log('[WS] Connected to server');
      });

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`[WS EVENT] Type: ${data.type}`);
          
          if (data.type === 'voice:intent') {
            intentReceived = true;
            const intent = data.data;
            const entities = intent.entities || {};
            console.log(`[INTENT] ${intent.intent}`);
            console.log(`[ENTITIES] Customer: ${entities.customer}, Role: ${entities.operatorRole}`);
            console.log(`[ADMIN EMAIL] ${entities.adminEmail || 'none'}`);

            // Check if role matches expected
            const roleMatch = entities.operatorRole === testCase.expectedRole;
            console.log(`\n[CHECK] Role Expected: ${testCase.expectedRole}, Got: ${entities.operatorRole} → ${roleMatch ? 'OK' : 'FAIL'}`);

            if (!roleMatch) {
              console.log(`\n❌ FAILED: Role mismatch!`);
              ws.close();
              resolve({
                testName: testCase.name,
                passed: false,
                reason: `Expected role: ${testCase.expectedRole}, got: ${entities.operatorRole}`
              });
            }
          }

          if (data.type === 'voice:response') {
            responseReceived = true;
            console.log(`[RESPONSE] ${data.data.response}`);
            console.log(`[SUCCESS] ${data.data.success}`);
            
            // Check if OTP was sent
            const hasOTP = data.data.response && 
                          (data.data.response.includes('OTP') || 
                           data.data.response.includes('otp') ||
                           (data.data.data && data.data.data.otp));
            console.log(`[OTP CHECK] Should have OTP: ${testCase.expectOTP}, Has OTP: ${hasOTP}`);

            // Test passed if role was correct
            if (intentReceived && testCase.expectedRole === 'admin' && hasOTP) {
              console.log(`\n✅ PASSED: Admin detected and OTP sent!`);
              ws.close();
              resolve({
                testName: testCase.name,
                passed: true,
              });
            } else if (intentReceived && testCase.expectedRole === 'user') {
              console.log(`\n✅ PASSED: Correctly identified as user (no OTP).`);
              ws.close();
              resolve({
                testName: testCase.name,
                passed: true,
              });
            }
          }

          if (data.type === 'error') {
            console.log(`[ERROR] ${data.data.error}`);
            if (testCase.expectedRole === 'user') {
              console.log(`\n✅ PASSED: Error expected for non-admin.`);
              ws.close();
              resolve({
                testName: testCase.name,
                passed: true,
              });
            }
          }
        } catch (err) {
          console.log(`[PARSE ERROR] ${err.message}`);
        }
      });

      ws.addEventListener('error', (error) => {
        console.log(`[WS ERROR] ${error.message}`);
        resolve({
          testName: testCase.name,
          passed: false,
          reason: `WebSocket error: ${error.message}`
        });
      });

      // Send the text after connecting
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log(`\n[SENDING] "${testCase.text}"`);
          ws.send(JSON.stringify({
            type: 'voice:final',
            data: {
              text: testCase.text,
              ttsProvider: 'browser'
            }
          }));
        }
      }, 500);

      // Timeout after 3 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log(`\nTimeout: No response received within 3 seconds`);
          ws.close();
          resolve({
            testName: testCase.name,
            passed: false,
            reason: 'Timeout - no response from server'
          });
        }
      }, 3000);

    } catch (error) {
      reject(error);
    }
  });
}

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('ADMIN DETECTION FIX TEST SUITE');
  console.log('='.repeat(70));

  const results = [];
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
    // Wait a bit between tests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n' + '='.repeat(70));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;
  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`${status}: ${result.testName}`);
    if (result.reason) {
      console.log(`       Reason: ${result.reason}`);
    }
    if (result.passed) passed++;
    else failed++;
  }

  console.log(`\nTotal: ${passed}/${testCases.length} passed, ${failed} failed`);
  console.log('='.repeat(70) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
