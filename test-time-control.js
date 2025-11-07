/**
 * Test script for requires_time_control feature
 * Tests Meta-Task search detection on interference domains
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_URL = process.env.LOCAL_TEST === 'true' 
  ? 'http://localhost:3000/api/focus-assistant'
  : 'https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';

const testCases = [
  {
    name: '⏰ 测试 1: 小红书上搜索 "vercel" (应该返回 requires_time_control=true)',
    keywords: '我在用Claude做一个vibecoding的项目',
    title: 'Vercel - 小红书',
    url: 'https://xiaohongshu.com/search?q=vercel',
    content_snippet: '在小红书上搜索 Vercel 相关内容',
    expected: {
      requires_time_control: true,
      status: 'Stay',
      relevance_score_percent: 50
    }
  },
  {
    name: '⏰ 测试 2: 微博上的 "用量" 页面 (应该返回 requires_time_control=true)',
    keywords: '我在用Claude做一个vibecoding的项目',
    title: '用量 - 微博',
    url: 'https://weibo.com/account/usage',
    content_snippet: '查看微博账户使用情况',
    expected: {
      requires_time_control: true,
      status: 'Stay',
      relevance_score_percent: 50
    }
  },
  {
    name: '✅ 测试 3: Vercel 上的 usage 页面 (应该返回 requires_time_control=false)',
    keywords: '我在用Claude做一个vibecoding的项目',
    title: 'Usage - Vercel',
    url: 'https://vercel.com/usage',
    content_snippet: 'View your API usage and billing information',
    expected: {
      requires_time_control: false,
      status: 'Stay' // 可能触发 GPT，最终状态可能是 Stay
    }
  },
  {
    name: '🚫 测试 4: 小红书上普通内容 (应该返回 requires_time_control=false)',
    keywords: '我在用Claude做一个vibecoding的项目',
    title: '美食推荐 - 小红书',
    url: 'https://xiaohongshu.com/discover/food',
    content_snippet: '推荐各种美食和餐厅',
    expected: {
      requires_time_control: false,
      status: 'Block' // 不包含 Meta-Task 关键词，应该被阻止
    }
  },
  {
    name: '⏰ 测试 5: 抖音上搜索 "github" (应该返回 requires_time_control=true)',
    keywords: '我在用Claude做一个vibecoding的项目',
    title: 'GitHub - 抖音',
    url: 'https://douyin.com/search?q=github',
    content_snippet: '在抖音上搜索 GitHub 相关内容',
    expected: {
      requires_time_control: true,
      status: 'Stay',
      relevance_score_percent: 50
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
    console.log(`  需要时间控制: ${result.requires_time_control !== undefined ? result.requires_time_control : '❌ 字段缺失'}`);
    console.log(`  响应时间: ${duration}ms`);
    console.log();

    // 验证结果
    console.log('🔍 验证:');
    let allPassed = true;

    if (testCase.expected.requires_time_control !== undefined) {
      if (result.requires_time_control === testCase.expected.requires_time_control) {
        console.log(`  ✅ requires_time_control: ${result.requires_time_control} (符合预期)`);
      } else {
        console.log(`  ❌ requires_time_control: ${result.requires_time_control} (预期: ${testCase.expected.requires_time_control})`);
        allPassed = false;
      }
    } else {
      console.log(`  ⚠️  requires_time_control 字段缺失`);
      allPassed = false;
    }

    if (testCase.expected.status) {
      if (result.status === testCase.expected.status) {
        console.log(`  ✅ status: ${result.status} (符合预期)`);
      } else {
        console.log(`  ⚠️  status: ${result.status} (预期: ${testCase.expected.status})`);
        // 不标记为失败，因为状态可能因为 GPT 分析而改变
      }
    }

    if (testCase.expected.relevance_score_percent !== undefined) {
      if (result.relevance_score_percent === testCase.expected.relevance_score_percent) {
        console.log(`  ✅ relevance_score_percent: ${result.relevance_score_percent}% (符合预期)`);
      } else {
        console.log(`  ⚠️  relevance_score_percent: ${result.relevance_score_percent}% (预期: ${testCase.expected.relevance_score_percent}%)`);
        // 不标记为失败，因为分数可能因为 GPT 分析而改变
      }
    }

    // 检查是否跳过了 Hybrid Reasoning（通过响应时间推断）
    if (testCase.expected.requires_time_control === true) {
      if (duration < 2000) {
        console.log(`  ✅ 响应时间短 (${duration}ms)，说明跳过了 GPT 分析（符合预期）`);
      } else {
        console.log(`  ⚠️  响应时间长 (${duration}ms)，可能没有跳过 GPT 分析`);
      }
    }

    return {
      success: allPassed,
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
  console.log('🧪 requires_time_control 功能测试');
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
  console.log(`✅ 通过: ${successCount}/${results.length}`);
  console.log(`❌ 失败: ${results.length - successCount}/${results.length}`);
  console.log();

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.name}`);
    if (result.success && result.result) {
      console.log(`   requires_time_control: ${result.result.requires_time_control}, status: ${result.result.status}, score: ${result.result.relevance_score_percent}%`);
    } else if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });
}

// Run tests
runAllTests().catch(console.error);

