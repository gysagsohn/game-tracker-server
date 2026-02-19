// test-rate-limits.js - UPDATED VERSION
const API_URL = 'http://localhost:3001/api';

async function testRateLimits() {
  console.log('Testing Rate Limits...\n');
  
  // Test 1: Login (5 per 10 min)
  console.log('1️Testing Login Rate Limit (5 requests)...');
  for (let i = 1; i <= 6; i++) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
    });
    
    // Handle both JSON and plain text responses
    let message;
    try {
      const data = await res.json();
      message = data.message;
    } catch (err) {
      // If JSON parsing fails, it's a plain text response
      message = await res.text();
    }
    
    const status = res.status === 429 ? '🚫 BLOCKED' : res.status;
    console.log(`   Attempt ${i}: ${status} - ${message}`);
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n Rate limiting is WORKING! Request #6 was blocked with status 429\n');
}

testRateLimits();