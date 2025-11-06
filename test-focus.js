/**
 * Test script for Focus Assistant API
 * Run with: node test-focus.js
 */

const testData = {
  keywords: "我正在利用cursor vibe coding做一个帮助stay focus的小插件",
  title: "小胖da - 小红书",
  url: "https://www.xiaohongshu.com/explore/69018b620000000004022c4b?xsec_token=ABJYfL4IHVWPRpgvMYm7wMeuPuVDZm_ctFbhocnE7J7a8=&xsec_source=pc_search&source=unknown"
};

// Try local first, then Vercel
const testUrls = [
  'http://localhost:3000/api/focus-assistant',
  'https://real-focus-a79c571mm-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant',
  'https://ai-focus-two.vercel.app/api/focus-assistant'
];

async function testAPI(url) {
  try {
    console.log(`\n🧪 Testing: ${url}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Test Data:');
    console.log(`  Keywords: ${testData.keywords}`);
    console.log(`  Title: ${testData.title}`);
    console.log(`  URL: ${testData.url}`);
    console.log('\n📤 Sending request...\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const data = await response.json();

    console.log('📥 Response:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`HTTP Status: ${response.status}`);

    if (response.ok) {
      console.log('✅ Test successful!');
      console.log('\n📊 Analysis Result:');
      console.log(`  Relevance Score: ${data.relevance_score_percent}%`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Reason: ${data.reason}`);
      return true;
    } else {
      console.log(`❌ Test failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Focus Assistant API Tests\n');
  
  for (const url of testUrls) {
    const success = await testAPI(url);
    if (success) {
      break; // Stop after first successful test
    }
    console.log('\n⏭️  Trying next URL...\n');
  }
}

runTests();

