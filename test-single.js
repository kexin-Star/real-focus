/**
 * Single test case for debugging
 */

const testData = {
  keywords: "Figma, UI设计, 原型设计",
  title: "Figma: The Collaborative Interface Design Tool",
  url: "https://www.figma.com",
  content_snippet: "Figma is a collaborative web application for interface design. Create, prototype, and gather feedback all in one place."
};

const API_URL = 'https://real-focus-a79c571mm-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';

async function test() {
  console.log('🧪 Testing Single Case\n');
  console.log('Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n📤 Sending request...\n');

  const startTime = Date.now();
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    console.log('📥 Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log(`\n⏱️  Response Time: ${responseTime}ms`);
    console.log(`\n✅ Test completed!`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();


