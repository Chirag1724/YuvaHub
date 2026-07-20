async function testSocketFallback() {
  console.log('🧪 Starting automatic test for REST Socket Fallback (/api/messages)...\n');
  
  const testPayload = {
    eventName: 'TEST_FALLBACK_EVENT',
    data: {
      message: 'This is an automatic test payload',
      timestamp: Date.now()
    }
  };

  try {
    // We assume the dev server is running locally on port 5173
    // You can adjust the port if your server runs elsewhere
    const targetUrl = 'http://localhost:5173/api/messages';
    
    console.log(`Sending POST request to ${targetUrl}`);
    console.log('Payload:', testPayload);
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('\n✅ TEST PASSED: The fallback endpoint successfully received and processed the event.');
      console.log('Server response:', result);
    } else {
      console.error('\n❌ TEST FAILED: The fallback endpoint returned an error or unexpected response.');
      console.error('Status:', response.status);
      console.error('Response:', result);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ TEST FAILED: Could not connect to the fallback endpoint.');
    console.error('Error details:', error.message);
    console.log('\n💡 Make sure your development server (npm run dev) is running before executing this test.');
    process.exit(1);
  }
}

testSocketFallback();
