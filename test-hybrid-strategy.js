/**
 * Test script for Hybrid Judgment Strategy
 * Interactive test tool - allows user to input focus keywords and URL
 * Tests the three-tier logic: Fast Pass, Fast Block, and GPT Deep Analysis
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

// Determine API URL: use local if LOCAL_TEST env var is set, otherwise use deployed URL
const API_URL = process.env.LOCAL_TEST === 'true' 
  ? 'http://localhost:3000/api/focus-assistant'
  : 'https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';

if (process.env.LOCAL_TEST === 'true') {
  console.log('🔧 Using LOCAL API (http://localhost:3000)');
  console.log('   Make sure to run "npm run local" first!\n');
} else {
  console.log('🌐 Using DEPLOYED API\n');
}

/**
 * Prompt user for input
 */
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Get user input interactively
 */
async function getUserInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log('='.repeat(60));
    console.log('📝 请输入测试信息');
    console.log('='.repeat(60));
    console.log();

    // Get focus keywords
    const keywords = await askQuestion(rl, '🎯 专注主题 (keywords): ');
    if (!keywords) {
      console.error('❌ 专注主题不能为空！');
      rl.close();
      process.exit(1);
    }

    // Get URL
    const url = await askQuestion(rl, '🔗 当前网址 (URL): ');
    if (!url) {
      console.error('❌ 网址不能为空！');
      rl.close();
      process.exit(1);
    }

    // Validate URL format
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      console.warn('⚠️  警告: URL 格式可能不正确，但将继续测试');
      urlObj = null;
    }

    // Get page title (optional)
    const title = await askQuestion(rl, '📄 页面标题 (title, 可选，直接回车跳过): ') || '';

    // Get content snippet (optional)
    const content_snippet = await askQuestion(rl, '📝 页面内容片段 (content_snippet, 可选，直接回车跳过): ') || '';

    rl.close();

    // Generate default title if not provided
    let defaultTitle = 'Untitled Page';
    if (urlObj) {
      defaultTitle = `Page from ${urlObj.hostname}`;
    } else if (url) {
      // Try to extract domain from URL string
      const match = url.match(/https?:\/\/([^\/]+)/);
      if (match) {
        defaultTitle = `Page from ${match[1]}`;
      }
    }

    return {
      keywords,
      url,
      title: title || defaultTitle,
      content_snippet: content_snippet || ''
    };
  } catch (error) {
    rl.close();
    throw error;
  }
}

/**
 * Run the test with user input
 */
async function testHybridStrategy(testCase) {
  console.log();
  console.log('='.repeat(60));
  console.log('🧪 开始测试');
  console.log('='.repeat(60));
  console.log();

  console.log('测试用例:');
  console.log(`  🎯 专注主题: ${testCase.keywords}`);
  console.log(`  📄 页面标题: ${testCase.title}`);
  console.log(`  🔗 网址: ${testCase.url}`);
  if (testCase.content_snippet) {
    const snippet = testCase.content_snippet.length > 100 
      ? testCase.content_snippet.substring(0, 100) + '...'
      : testCase.content_snippet;
    console.log(`  📝 内容片段: ${snippet}`);
  }
  console.log();

  try {
    console.log('📤 正在发送请求到 API...');
    const startTime = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase),
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log('='.repeat(60));
    console.log('📥 API 响应结果:');
    console.log('='.repeat(60));
    console.log();
    console.log(`📊 相关性分数: ${result.relevance_score_percent}%`);
    console.log(`🎯 状态: ${result.status}`);
    console.log(`⏱️  响应时间: ${duration}ms`);
    console.log();

    // Analysis
    console.log('='.repeat(60));
    console.log('📊 分析结果:');
    console.log('='.repeat(60));
    console.log();
    
    if (result.relevance_score_percent >= 75) {
      console.log('✅ Fast Pass (高相关性) - 未调用 GPT');
      console.log('   → 页面与专注主题高度相关，建议保持专注');
    } else if (result.relevance_score_percent <= 35) {
      console.log('✅ Fast Block (低相关性) - 未调用 GPT');
      console.log('   → 页面与专注主题不相关，建议阻止');
    } else {
      console.log('✅ GPT 深度分析 (模糊相关性) - 已调用 GPT');
      console.log('   → 最终分数是语义分数和 GPT 分数的平均值');
    }

    console.log();
    
    // Status interpretation
    console.log('='.repeat(60));
    console.log('💡 判断结果:');
    console.log('='.repeat(60));
    console.log();
    if (result.status === 'Stay') {
      console.log('✅ 建议: 保持专注 (Stay)');
      console.log('   该页面与你的专注主题相关，可以继续浏览');
    } else if (result.status === 'Block') {
      console.log('🚫 建议: 阻止访问 (Block)');
      console.log('   该页面与你的专注主题不相关，建议阻止');
    } else {
      console.log(`⚠️  状态: ${result.status}`);
    }
    console.log();
    console.log(`📝 原因: "${result.reason}"`);
    console.log();
    console.log('//');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Get user input
    const testCase = await getUserInput();
    
    // Run test
    await testHybridStrategy(testCase);
    
    console.log('='.repeat(60));
    console.log('✅ 测试完成');
    console.log('='.repeat(60));
    console.log('//');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run interactive test
main();

