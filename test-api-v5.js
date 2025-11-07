/**
 * Test script for Focus Assistant API V5.0
 * Tests the new hybrid evaluation logic (Embedding + GPT)
 */

const testCases = [
  {
    name: "高相似度场景 - Figma设计工具",
    keywords: "Figma, UI设计, 原型设计",
    title: "Figma: The Collaborative Interface Design Tool",
    url: "https://www.figma.com",
    content_snippet: "Figma is a collaborative web application for interface design. Create, prototype, and gather feedback all in one place."
  },
  {
    name: "模糊场景 - 设计相关文章",
    keywords: "Figma, UI设计",
    title: "10 Best Design Tools in 2024",
    url: "https://example.com/design-tools",
    content_snippet: "This article discusses various design tools including Figma, Sketch, and Adobe XD. Learn which tool is best for your workflow."
  },
  {
    name: "低相似度场景 - 社交媒体",
    keywords: "Figma, UI设计",
    title: "小胖da - 小红书",
    url: "https://www.xiaohongshu.com/explore/69018b620000000004022c4b",
    content_snippet: "从ChatGPT到Gemini，Ai老用户已经放弃gpt…有时候，放弃不是背叛，是对效率的诚实。"
  },
  {
    name: "高相似度场景 - 编程工具",
    keywords: "cursor, coding, AI编程",
    title: "Cursor - The AI Code Editor",
    url: "https://cursor.sh",
    content_snippet: "Cursor is an AI-powered code editor that helps you write code faster. Built for pair programming with AI."
  },
  {
    name: "模糊场景 - 技术博客",
    keywords: "cursor, coding",
    title: "How to Use AI in Your Development Workflow",
    url: "https://example.com/ai-dev",
    content_snippet: "This blog post explores various AI tools for developers, including Cursor, GitHub Copilot, and other coding assistants."
  },
  {
    name: "低相似度场景 - 新闻网站",
    keywords: "cursor, coding",
    title: "Breaking News: Latest Tech Updates",
    url: "https://example.com/news",
    content_snippet: "Stay updated with the latest technology news, celebrity gossip, and trending topics. Read more about what's happening in the world."
  }
];

const API_URL = 'https://real-focus-a79c571mm-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';

async function testAPI(testCase) {
  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Keywords: ${testCase.keywords}`);
    console.log(`Title: ${testCase.title}`);
    console.log(`URL: ${testCase.url}`);
    console.log(`Content: ${testCase.content_snippet.substring(0, 100)}...`);
    console.log('\n📤 Sending request...\n');

    const startTime = Date.now();
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: testCase.keywords,
        title: testCase.title,
        url: testCase.url,
        content_snippet: testCase.content_snippet
      })
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error: ${response.status}`);
      console.error(`Response: ${errorText}`);
      return;
    }

    const data = await response.json();

    console.log('📥 Response:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(data, null, 2));
    console.log(`\n⏱️  Response Time: ${responseTime}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Analysis
    console.log('\n📊 Analysis:');
    console.log(`  Relevance Score: ${data.relevance_score_percent}%`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Reason: ${data.reason}`);
    
    // Expected behavior hints
    if (data.relevance_score_percent >= 90) {
      console.log('  ✅ High relevance - Likely used Embedding only (fast)');
    } else if (data.relevance_score_percent < 50) {
      console.log('  ❌ Low relevance - Likely used Embedding only (fast)');
    } else {
      console.log('  ⚠️  Medium relevance - May have used GPT deep analysis (slower)');
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Focus Assistant API V5.0 Tests');
  console.log('Testing hybrid evaluation logic (Embedding + GPT)\n');
  
  for (let i = 0; i < testCases.length; i++) {
    await testAPI(testCases[i]);
    
    // Wait between tests to avoid rate limiting
    if (i < testCases.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n✅ All tests completed!');
}

// Run tests
runAllTests();


