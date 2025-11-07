/**
 * Test script to verify Hybrid Reasoning threshold update
 * Tests the two pages that were incorrectly judged as irrelevant
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_URL = process.env.LOCAL_TEST === 'true' 
  ? 'http://localhost:3000/api/focus-assistant'
  : 'https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';

const keywords = '我在用cursor vibecoding做一个google extension用来帮助用户正常使用浏览器查询学习内容的同时保持专注';

const testCases = [
  {
    name: '测试 1: Gemini AI 工具',
    title: 'Gemini - Google AI',
    url: 'https://gemini.google.com/app/fbb32d5518bd52b6',
    content_snippet: 'Gemini is Google\'s AI assistant that can help with coding, development, and learning. Use Gemini to get help with programming tasks, code generation, and technical questions.',
    expectedBehavior: '应该识别为工具链域名，强制进入 GPT 分析，返回 70-85%, Stay',
    expectedMin: 70
  },
  {
    name: '测试 2: Vercel 错误文档',
    title: 'Error List - Vercel Documentation',
    url: 'https://vercel.com/docs/errors/error-list#recursive-invocation-of-commands',
    content_snippet: 'Vercel error documentation. Recursive invocation of commands error. Troubleshooting guide for Vercel deployment issues.',
    expectedBehavior: '应该识别为工具链域名，强制进入 GPT 分析，返回 70-85%, Stay',
    expectedMin: 70
  },
  {
    name: '测试 3: 普通社交页面（低相关性）',
    title: '小红书 - 发现',
    url: 'https://www.xiaohongshu.com/explore/123',
    content_snippet: 'Social media content, entertainment, trending topics',
    expectedBehavior: '如果语义分数 <= 20，应该 Fast Block，返回 15%, Block',
    expectedMax: 20
  }
];

async function runTest(testCase, index) {
  console.log('\n' + '='.repeat(70));
  console.log(`${index + 1}. ${testCase.name}`);
  console.log('='.repeat(70));
  console.log(`URL: ${testCase.url}`);
  console.log(`Title: ${testCase.title}`);
  console.log(`预期行为: ${testCase.expectedBehavior}`);
  console.log();

  try {
    const startTime = Date.now();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords,
        title: testCase.title,
        url: testCase.url,
        content_snippet: testCase.content_snippet
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log('📊 测试结果:');
    console.log(`  相关性分数: ${result.relevance_score_percent}%`);
    console.log(`  状态: ${result.status}`);
    console.log(`  原因: ${result.reason}`);
    console.log(`  响应时间: ${duration}ms`);
    console.log();

    // 验证结果
    console.log('🔍 验证:');
    let passed = true;
    
    if (testCase.expectedMin !== undefined) {
      if (result.relevance_score_percent >= testCase.expectedMin) {
        console.log(`  ✅ 相关性分数 ${result.relevance_score_percent}% >= ${testCase.expectedMin}% (符合预期)`);
      } else {
        console.log(`  ❌ 相关性分数 ${result.relevance_score_percent}% < ${testCase.expectedMin}% (不符合预期)`);
        passed = false;
      }
    }
    
    if (testCase.expectedMax !== undefined) {
      if (result.relevance_score_percent <= testCase.expectedMax) {
        console.log(`  ✅ 相关性分数 ${result.relevance_score_percent}% <= ${testCase.expectedMax}% (符合预期)`);
      } else {
        console.log(`  ❌ 相关性分数 ${result.relevance_score_percent}% > ${testCase.expectedMax}% (不符合预期)`);
        passed = false;
      }
    }

    // 检查是否调用了 GPT（通过响应时间判断，GPT 调用通常 > 1000ms）
    if (duration > 1000) {
      console.log(`  ✅ 检测到 GPT 调用（响应时间 ${duration}ms > 1000ms）`);
    } else {
      console.log(`  ⚠️  可能未调用 GPT（响应时间 ${duration}ms < 1000ms）`);
    }

    return {
      success: passed,
      result,
      duration,
      usedGPT: duration > 1000
    };

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log('🧪 Hybrid Reasoning 阈值调整验证测试');
  console.log('='.repeat(70));
  console.log(`API URL: ${API_URL}`);
  console.log(`专注主题: ${keywords}`);
  console.log(`测试用例数量: ${testCases.length}`);
  console.log('='.repeat(70));

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = await runTest(testCase, i);
    results.push({
      name: testCase.name,
      ...result
    });
    
    // 等待一下再运行下一个测试
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 总结
  console.log('\n' + '='.repeat(70));
  console.log('📋 测试总结');
  console.log('='.repeat(70));
  
  const successCount = results.filter(r => r.success).length;
  const gptCount = results.filter(r => r.usedGPT).length;
  
  console.log(`✅ 通过: ${successCount}/${results.length}`);
  console.log(`❌ 失败: ${results.length - successCount}/${results.length}`);
  console.log(`🤖 GPT 调用: ${gptCount}/${results.length}`);
  console.log();

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const gptStatus = result.usedGPT ? '🤖' : '⚡';
    console.log(`${status} ${gptStatus} ${index + 1}. ${result.name}`);
    if (result.result) {
      console.log(`   分数: ${result.result.relevance_score_percent}%, 状态: ${result.result.status}, 时间: ${result.duration}ms`);
    } else if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('💡 关键验证点:');
  console.log('='.repeat(70));
  console.log('1. 工具链域名（Gemini, Vercel）应该强制进入 GPT 分析');
  console.log('2. 工具链域名应该返回 70-85% 的相关性分数');
  console.log('3. 普通低相关性页面（<=20%）应该 Fast Block，不调用 GPT');
  console.log('='.repeat(70));
}

// Run tests
runAllTests().catch(console.error);

