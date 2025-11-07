/**
 * Test script for Google SERP content extraction
 * Tests the Google search results page content extraction logic
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
    name: 'Google 搜索结果页 - Vercel 部署',
    title: 'vercel deployment - Google Search',
    url: 'https://www.google.com/search?q=vercel+deployment',
    content_snippet: 'Vercel - Deploy your frontend projects. Deploy your frontend projects with Vercel. Get started with zero configuration. | Vercel Documentation - Deploy your Next.js app. Learn how to deploy your Next.js application to Vercel. | Vercel CLI - Command line interface. Use Vercel CLI to deploy projects from your terminal.'
  },
  {
    name: 'Google 搜索结果页 - React 教程',
    title: 'react tutorial - Google Search',
    url: 'https://www.google.com/search?q=react+tutorial',
    content_snippet: 'React - A JavaScript library for building user interfaces. Learn React with official documentation and tutorials. | React Tutorial - Learn React step by step. Build your first React app with this comprehensive guide. | React Getting Started - Quick start guide for React development.'
  },
  {
    name: '普通 Google 页面（非搜索结果）',
    title: 'About Google',
    url: 'https://www.google.com/about',
    content_snippet: 'Google is a technology company that specializes in Internet-related services and products. Our mission is to organize the world\'s information and make it universally accessible and useful.'
  }
];

async function runTest(testCase, index) {
  console.log('\n' + '='.repeat(80));
  console.log(`${index + 1}. ${testCase.name}`);
  console.log('='.repeat(80));
  console.log(`URL: ${testCase.url}`);
  console.log(`Title: ${testCase.title}`);
  console.log();

  // Display input data
  console.log('📥 输入数据:');
  console.log('─'.repeat(80));
  console.log(`专注主题 (Keywords): ${keywords}`);
  console.log(`页面标题 (Title): ${testCase.title}`);
  console.log(`页面 URL: ${testCase.url}`);
  console.log(`Content Snippet (${testCase.content_snippet.length} 字符):`);
  console.log('─'.repeat(80));
  console.log(testCase.content_snippet);
  console.log('─'.repeat(80));
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

    console.log('📊 API 响应结果:');
    console.log('─'.repeat(80));
    console.log(`相关性分数: ${result.relevance_score_percent}%`);
    console.log(`状态: ${result.status}`);
    console.log(`原因: ${result.reason}`);
    console.log(`响应时间: ${duration}ms`);
    if (result.requires_time_control !== undefined) {
      console.log(`时间控制: ${result.requires_time_control ? '是' : '否'}`);
    }
    console.log('─'.repeat(80));
    console.log();

    // Display what would be sent to GPT
    console.log('📤 传给 GPT 的 Prompt 结构 (模拟):');
    console.log('─'.repeat(80));
    console.log('<TASK_KEYWORDS>');
    console.log(keywords);
    console.log('</TASK_KEYWORDS>');
    console.log();
    console.log('<WEBPAGE_TITLE>');
    console.log(testCase.title);
    console.log('</WEBPAGE_TITLE>');
    console.log();
    console.log('<WEBPAGE_URL>');
    console.log(testCase.url);
    console.log('</WEBPAGE_URL>');
    console.log();
    console.log('<WEBPAGE_CONTENT>');
    console.log(testCase.content_snippet);
    console.log('</WEBPAGE_CONTENT>');
    console.log('─'.repeat(80));
    console.log();

    // Analysis
    console.log('🔍 分析:');
    console.log('─'.repeat(80));
    const isGoogleSERP = testCase.url.includes('google.com/search');
    console.log(`1. 是否为 Google SERP: ${isGoogleSERP ? '✅ 是' : '❌ 否'}`);
    if (isGoogleSERP) {
      console.log('   - Extension 应该提取前 3-5 个搜索结果的标题和摘要');
      console.log('   - Extension 应该跳过 H1 标签（"Accessibility Links"）');
      console.log('   - Content Snippet 应该包含多个搜索结果');
    }
    console.log();
    console.log('2. Content Snippet 质量:');
    const hasMultipleResults = testCase.content_snippet.includes(' | ');
    console.log(`   - 包含多个结果: ${hasMultipleResults ? '✅ 是' : '❌ 否'}`);
    console.log(`   - 长度: ${testCase.content_snippet.length} 字符`);
    console.log();
    console.log('3. API 判断结果:');
    console.log(`   - 相关性分数: ${result.relevance_score_percent}%`);
    console.log(`   - 状态: ${result.status}`);
    console.log(`   - 是否符合预期: ${isGoogleSERP && result.relevance_score_percent >= 50 ? '✅ 是' : '需要验证'}`);
    console.log('─'.repeat(80));
    console.log();

    return {
      success: true,
      result,
      duration,
      isGoogleSERP
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
  console.log('🧪 Google SERP 内容提取测试');
  console.log('='.repeat(80));
  console.log(`API URL: ${API_URL}`);
  console.log(`专注主题: ${keywords}`);
  console.log(`测试用例数量: ${testCases.length}`);
  console.log('='.repeat(80));
  console.log();
  console.log('💡 测试说明:');
  console.log('─'.repeat(80));
  console.log('这个测试脚本使用模拟的 Content Snippet 来测试 API 逻辑');
  console.log('实际的 Extension 会在 Google SERP 页面提取真实的搜索结果');
  console.log('要测试 Extension 的实际提取，请在 Chrome 中：');
  console.log('1. 重新加载 Extension');
  console.log('2. 访问 Google 搜索结果页');
  console.log('3. 查看 Background Script Console 中的日志');
  console.log('─'.repeat(80));
  console.log();

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = await runTest(testCase, i);
    results.push({
      name: testCase.name,
      ...result
    });
    
    if (i < testCases.length - 1) {
      console.log('\n⏳ 等待 2 秒后继续下一个测试...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 总结
  console.log('\n' + '='.repeat(80));
  console.log('📋 测试总结');
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    if (result.success) {
      const status = result.isGoogleSERP && result.result.relevance_score_percent >= 50 ? '✅' : '⚠️';
      console.log(`${status} ${index + 1}. ${result.name}`);
      console.log(`   API 分数: ${result.result.relevance_score_percent}%`);
      console.log(`   状态: ${result.result.status}`);
      console.log(`   响应时间: ${result.duration}ms`);
    } else {
      console.log(`❌ ${index + 1}. ${result.name} - 错误: ${result.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('💡 Extension 测试步骤:');
  console.log('='.repeat(80));
  console.log('1. 确保 Extension 的 API URL 设置为 localhost');
  console.log('2. 在 Chrome 中重新加载 Extension');
  console.log('3. 访问 Google 搜索结果页（例如：搜索 "vercel deployment"）');
  console.log('4. 打开 Background Script Console（chrome://extensions/ → service worker）');
  console.log('5. 查看日志中的 Content Snippet 预览');
  console.log('6. 确认是否提取了搜索结果摘要（而不是 H1）');
  console.log('='.repeat(80));
}

// Run tests
runAllTests().catch(console.error);

