/**
 * Test script with detailed Content Snippet display
 * Shows the complete prompt sent to GPT for manual review
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
    content_snippet: 'Gemini is Google\'s AI assistant that can help with coding, development, and learning. Use Gemini to get help with programming tasks, code generation, and technical questions. Gemini provides intelligent assistance for developers working on various projects including browser extensions, web applications, and software development.'
  },
  {
    name: '测试 2: Vercel 错误文档',
    title: 'Error List - Vercel Documentation',
    url: 'https://vercel.com/docs/errors/error-list#recursive-invocation-of-commands',
    content_snippet: 'Vercel error documentation. Recursive invocation of commands error. Troubleshooting guide for Vercel deployment issues. This page provides detailed information about common errors encountered when deploying applications to Vercel, including solutions and best practices for resolving deployment problems.'
  },
  {
    name: '测试 3: Vercel CLI 文档',
    title: 'Vercel CLI Documentation',
    url: 'https://vercel.com/docs/cli',
    content_snippet: 'Vercel CLI documentation. Learn how to use the Vercel command-line interface to deploy, manage, and interact with your Vercel projects. The CLI provides commands for building, deploying, and managing your applications from the terminal.'
  },
  {
    name: '测试 4: GitHub 文档',
    title: 'GitHub Documentation',
    url: 'https://docs.github.com/en/get-started',
    content_snippet: 'GitHub getting started guide. Learn the basics of GitHub, including how to create repositories, manage branches, and collaborate on projects. Essential documentation for developers using version control and project management.'
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
    console.log('─'.repeat(80));
    console.log();

    // Display what would be sent to GPT (simulated prompt structure)
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
    console.log(testCase.content_snippet || '(空)');
    console.log('</WEBPAGE_CONTENT>');
    console.log();
    console.log('<SEMANTIC_SIMILARITY_SCORE>');
    console.log('(由 Embedding 计算得出，通常在 15-50 之间)');
    console.log('</SEMANTIC_SIMILARITY_SCORE>');
    console.log('─'.repeat(80));
    console.log();

    // Manual judgment section
    console.log('🤔 人工判断提示:');
    console.log('─'.repeat(80));
    console.log('请根据以下信息进行人工判断:');
    console.log(`1. URL 是否包含文档关键词? (docs, errors, api, reference, guide 等)`);
    console.log(`   → URL: ${testCase.url}`);
    const hasDocsKeywords = /docs|documentation|errors|error|api|reference|guide|tutorial/i.test(testCase.url + ' ' + testCase.title);
    console.log(`   → 结果: ${hasDocsKeywords ? '✅ 是' : '❌ 否'}`);
    console.log();
    console.log(`2. 域名是否属于开发工具链? (vercel.com, github.com, gemini.google.com 等)`);
    const domain = testCase.url.match(/https?:\/\/(?:www\.)?([^\/]+)/i)?.[1];
    const toolChainDomains = ['vercel.com', 'github.com', 'gitlab.com', 'gemini.google.com', 'docs.github.com', 'docs.vercel.com'];
    const isToolChain = toolChainDomains.some(d => domain?.includes(d));
    console.log(`   → 域名: ${domain}`);
    console.log(`   → 结果: ${isToolChain ? '✅ 是' : '❌ 否'}`);
    console.log();
    console.log(`3. 根据 Documentation Value Rule，如果上述两个条件都满足，应该给 70-90% 的分数`);
    console.log(`   → 当前 API 返回: ${result.relevance_score_percent}%`);
    console.log(`   → 是否符合预期: ${hasDocsKeywords && isToolChain && result.relevance_score_percent >= 70 ? '✅ 是' : '❌ 否'}`);
    console.log('─'.repeat(80));
    console.log();

    return {
      success: true,
      result,
      duration,
      hasDocsKeywords,
      isToolChain,
      domain
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
  console.log('🧪 测试脚本 - 显示 Content Snippet 和 GPT Prompt');
  console.log('='.repeat(80));
  console.log(`API URL: ${API_URL}`);
  console.log(`专注主题: ${keywords}`);
  console.log(`测试用例数量: ${testCases.length}`);
  console.log('='.repeat(80));

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
      const status = result.hasDocsKeywords && result.isToolChain && result.result.relevance_score_percent >= 70 ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${result.name}`);
      console.log(`   域名: ${result.domain}`);
      console.log(`   文档关键词: ${result.hasDocsKeywords ? '✅' : '❌'}`);
      console.log(`   工具链域名: ${result.isToolChain ? '✅' : '❌'}`);
      console.log(`   API 分数: ${result.result.relevance_score_percent}%`);
      console.log(`   状态: ${result.result.status}`);
      console.log(`   预期: ${result.hasDocsKeywords && result.isToolChain ? '70-90%' : 'N/A'}`);
    } else {
      console.log(`❌ ${index + 1}. ${result.name} - 错误: ${result.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('💡 人工判断指南:');
  console.log('='.repeat(80));
  console.log('对于每个测试用例，请判断:');
  console.log('1. Content Snippet 是否准确反映了页面内容?');
  console.log('2. 如果 URL 包含文档关键词且域名是工具链，GPT 是否应该给 70-90%?');
  console.log('3. 当前 API 返回的分数是否符合你的预期?');
  console.log('='.repeat(80));
}

// Run tests
runAllTests().catch(console.error);

