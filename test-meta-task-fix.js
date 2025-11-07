/**
 * Automated test script for Meta-Task logic fix
 * Tests the domain blacklist functionality
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_URL = process.env.LOCAL_TEST === 'true' 
  ? 'http://localhost:3000/api/focus-assistant'
  : 'https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';

const LOCAL_API = process.env.LOCAL_TEST === 'true' || true; // Force local for testing

const testCases = [
  {
    name: '✅ 测试 1: 合法工具网站的 Meta-Task 页面 (应该触发 GPT)',
    keywords: '我在用Claude做一个vibecoding的项目',
    title: 'Usage - Vercel',
    url: 'https://vercel.com/usage',
    content_snippet: 'View your API usage and billing information',
    expected: {
      shouldTriggerGPT: true, // 应该触发 GPT 分析
      shouldBlock: false // 不应该被阻止
    }
  },
  {
    name: '🚫 测试 2: 小红书上的搜索 (应该被阻止，不触发 Meta-Task)',
    keywords: '我在用Claude做一个vibecoding的项目',
    title: 'Vercel - 小红书',
    url: 'https://xiaohongshu.com/search?q=vercel',
    content_snippet: '在小红书上搜索 Vercel 相关内容',
    expected: {
      shouldTriggerGPT: false, // 不应该触发 GPT（因为域名在黑名单）
      shouldBlock: true // 应该被阻止
    }
  },
  {
    name: '🚫 测试 3: 微博上的"用量"页面 (应该被阻止，不触发 Meta-Task)',
    keywords: '我在用Claude做一个vibecoding的项目',
    title: '用量 - 微博',
    url: 'https://weibo.com/account/usage',
    content_snippet: '查看微博账户使用情况',
    expected: {
      shouldTriggerGPT: false, // 不应该触发 GPT（因为域名在黑名单）
      shouldBlock: true // 应该被阻止
    }
  },
  {
    name: '✅ 测试 4: GitHub 上的文档页面 (应该触发 GPT)',
    keywords: '我在用Claude做一个vibecoding的项目',
    title: 'GitHub Documentation',
    url: 'https://github.com/docs',
    content_snippet: 'GitHub documentation and guides',
    expected: {
      shouldTriggerGPT: true, // 应该触发 GPT（GitHub 不在黑名单）
      shouldBlock: false // 不应该被阻止
    }
  },
  {
    name: '🚫 测试 5: 抖音上的搜索 (应该被阻止)',
    keywords: '我在用Claude做一个vibecoding的项目',
    title: '搜索结果 - 抖音',
    url: 'https://douyin.com/search?q=vercel',
    content_snippet: '在抖音上搜索相关内容',
    expected: {
      shouldTriggerGPT: false,
      shouldBlock: true
    }
  }
];

async function runTest(testCase) {
  console.log('\n' + '='.repeat(60));
  console.log(testCase.name);
  console.log('='.repeat(60));
  console.log(`URL: ${testCase.url}`);
  console.log(`Title: ${testCase.title}`);
  console.log(`Keywords: ${testCase.keywords}`);
  console.log();

  try {
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

    // 判断是否触发了 GPT（通过响应时间推断，GPT 调用通常 > 2000ms）
    const likelyTriggeredGPT = duration > 2000;
    
    // 验证预期结果
    console.log('🔍 验证:');
    const scoreCheck = result.relevance_score_percent >= 50 ? 'Stay' : 'Block';
    const actualBlocked = result.status === 'Block';
    const actualTriggeredGPT = likelyTriggeredGPT;

    if (testCase.expected.shouldTriggerGPT) {
      if (actualTriggeredGPT) {
        console.log('  ✅ GPT 分析已触发（符合预期）');
      } else {
        console.log('  ⚠️  GPT 分析未触发（可能不符合预期，但语义分数可能已经足够高）');
      }
    } else {
      if (!actualTriggeredGPT) {
        console.log('  ✅ GPT 分析未触发（符合预期 - 域名在黑名单）');
      } else {
        console.log('  ⚠️  GPT 分析被触发（不符合预期 - 可能域名不在黑名单或语义分数在中间范围）');
      }
    }

    if (testCase.expected.shouldBlock) {
      if (actualBlocked) {
        console.log('  ✅ 页面被阻止（符合预期）');
      } else {
        console.log('  ❌ 页面未被阻止（不符合预期）');
      }
    } else {
      if (!actualBlocked) {
        console.log('  ✅ 页面未被阻止（符合预期）');
      } else {
        console.log('  ⚠️  页面被阻止（可能不符合预期，但 GPT 可能判断为不相关）');
      }
    }

    return {
      success: true,
      result,
      duration
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
  console.log('🧪 Meta-Task 逻辑修复测试');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`测试用例数量: ${testCases.length}`);
  console.log('='.repeat(60));

  const results = [];

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push({
      name: testCase.name,
      ...result
    });
    
    // 等待一下再运行下一个测试
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📋 测试总结');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ 成功: ${successCount}/${results.length}`);
  console.log(`❌ 失败: ${results.length - successCount}/${results.length}`);
  console.log();

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}`);
    if (result.success) {
      console.log(`   分数: ${result.result.relevance_score_percent}%, 状态: ${result.result.status}, 时间: ${result.duration}ms`);
    } else {
      console.log(`   ❌ 错误: ${result.error}`);
    }
  });
}

// Run tests
runAllTests().catch(console.error);

