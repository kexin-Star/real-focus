/**
 * Test script for stock trading cases
 * Shows the complete content snippet sent to GPT for each case
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_URL = process.env.LOCAL_TEST === 'true' 
  ? 'http://localhost:3000/api/focus-assistant'
  : 'https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';

const keywords = '我在研究炒股';

const testCases = [
  {
    name: 'Case 1: UI/UX 设计相关',
    title: 'vibe coder都是如何做UI/UX设计的呢？ - 小红书',
    url: 'https://www.xiaohongshu.com/explore/68ab847c000000000a0aoFi7rmov3c=?xsec_token=AB2imJQjBqE_rxhrehxj22S53wlh2P4iZRs76xfnhTP5c=&xsec_source=pc_search&source=unknown',
    content_snippet: 'vibe coder都是如何做UI/UX设计的呢？这是一个关于设计师如何工作的讨论。UI/UX设计是产品开发中的重要环节，涉及用户体验和界面设计。设计师需要考虑用户需求、交互流程、视觉设计等多个方面。'
  },
  {
    name: 'Case 2: 炒股新手入门教程',
    title: '炒股新手入门教程 - 小红书搜索',
    url: 'https://www.xiaohongshu.com/search_result?keyword=%E7%82%92%E8%82%A1%E6%96%B0%E6%89%8B%E5%85%A5%E9%97%A8%E6%95%99%E7%A8%8B&source=unknown',
    content_snippet: '炒股新手入门教程。学习炒股基础知识，包括股票市场介绍、交易规则、技术分析、基本面分析等内容。适合零基础的新手学习，帮助了解股票投资的基本概念和操作方法。'
  },
  {
    name: 'Case 3: YouTube 投资频道推荐',
    title: '我反复收藏的YouTube投资频道推荐！ - 小红书',
    url: 'https://www.xiaohongshu.com/explore/686d049c000000000a0aHtJeDZIhiXQ=?xsec_token=AB2imJQjBqE_rxhrehxj22S53wlh2P4iZRs76xfnhTP5c=&xsec_source=pc_search&source=unknown',
    content_snippet: '我反复收藏的YouTube投资频道推荐！'
  },
  {
    name: 'Case 4: 美股新手30天入门指南',
    title: '🌟 美股新手30天入门指南｜零基础也能开 - 小红书',
    url: 'https://www.xiaohongshu.com/explore/685c438900000000000a0auSe6lczYwac=?xsec_token=AB2imJQjBqE_rxhrehxj22S53wlh2P4iZRs76xfnhTP5c=&xsec_source=pc_search&source=unknown',
    content_snippet: '🌟 美股新手30天入门指南｜零基础也能开。这是一个完整的美股投资入门教程，包含30天的学习计划。从基础知识到实际操作，帮助新手了解美股市场、交易规则、选股技巧、风险管理等内容。适合想要开始投资美股的初学者。'
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

    // Display what would be sent to GPT (simulated prompt structure)
    console.log('📤 传给 GPT 的完整 Prompt 结构:');
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
    console.log();
    console.log('<SEMANTIC_SIMILARITY_SCORE>');
    console.log('(由 Embedding 计算得出，通常在 15-50 之间)');
    console.log('</SEMANTIC_SIMILARITY_SCORE>');
    console.log('─'.repeat(80));
    console.log();

    // Analysis
    console.log('🔍 分析:');
    console.log('─'.repeat(80));
    console.log('1. Content Snippet 内容:');
    console.log(`   - 长度: ${testCase.content_snippet.length} 字符`);
    console.log(`   - 内容: ${testCase.content_snippet.substring(0, 100)}${testCase.content_snippet.length > 100 ? '...' : ''}`);
    console.log();
    console.log('2. 域名分析:');
    const domain = testCase.url.match(/https?:\/\/(?:www\.)?([^\/]+)/i)?.[1];
    console.log(`   - 域名: ${domain}`);
    const isInterference = domain?.includes('xiaohongshu.com');
    console.log(`   - 是否干扰域名: ${isInterference ? '✅ 是' : '❌ 否'}`);
    console.log();
    console.log('3. Meta-Task 关键词检测:');
    const metaTaskKeywords = {
      chinese: ['用量', '账单', '配置', '密钥', '文档', '控制台', '部署', '教程', '指南'],
      english: ['usage', 'billing', 'api key', 'console', 'dashboard', 'github', 'gitlab', 'vercel', 'login', 'auth', 'settings', 'account', 'profile', 'documentation', 'docs', 'deploy', 'deployment', 'tutorial', 'guide']
    };
    const combinedText = `${testCase.url} ${testCase.title} ${testCase.content_snippet}`.toLowerCase();
    const hasMetaTaskKeyword = metaTaskKeywords.chinese.some(k => combinedText.includes(k.toLowerCase())) ||
                               metaTaskKeywords.english.some(k => combinedText.includes(k.toLowerCase()));
    console.log(`   - 是否包含 Meta-Task 关键词: ${hasMetaTaskKeyword ? '✅ 是' : '❌ 否'}`);
    if (hasMetaTaskKeyword) {
      const foundKeywords = [];
      metaTaskKeywords.chinese.forEach(k => {
        if (combinedText.includes(k.toLowerCase())) foundKeywords.push(k);
      });
      metaTaskKeywords.english.forEach(k => {
        if (combinedText.includes(k.toLowerCase())) foundKeywords.push(k);
      });
      console.log(`   - 找到的关键词: ${foundKeywords.join(', ')}`);
    }
    console.log();
    console.log('4. 预期行为:');
    if (hasMetaTaskKeyword && isInterference) {
      console.log('   - 应该触发时间控制 (Meta-Task 关键词 + 干扰域名)');
      console.log('   - 预期返回: 50%, Stay, requires_time_control: true');
    } else if (isInterference) {
      console.log('   - 干扰域名，但无 Meta-Task 关键词');
      console.log('   - 根据内容相关性判断');
    } else {
      console.log('   - 正常域名，根据内容相关性判断');
    }
    console.log();
    console.log('5. 实际结果:');
    console.log(`   - 相关性分数: ${result.relevance_score_percent}%`);
    console.log(`   - 状态: ${result.status}`);
    console.log(`   - 时间控制: ${result.requires_time_control ? '✅ 已触发' : '❌ 未触发'}`);
    console.log('─'.repeat(80));
    console.log();

    return {
      success: true,
      result,
      duration,
      domain,
      isInterference,
      hasMetaTaskKeyword
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
  console.log('🧪 测试炒股相关用例 - 显示 Content Snippet');
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
      console.log(`${index + 1}. ${result.name}`);
      console.log(`   Content Snippet 长度: ${testCases[index].content_snippet.length} 字符`);
      console.log(`   API 分数: ${result.result.relevance_score_percent}%`);
      console.log(`   状态: ${result.result.status}`);
      console.log(`   时间控制: ${result.requires_time_control ? '✅' : '❌'}`);
      console.log();
    } else {
      console.log(`❌ ${index + 1}. ${result.name} - 错误: ${result.error}`);
    }
  });
  
  console.log('='.repeat(80));
  console.log('💡 关键信息:');
  console.log('='.repeat(80));
  console.log('每个用例的完整 Content Snippet 已在上面的测试结果中显示');
  console.log('这些 Content Snippet 就是实际发送给 GPT 的内容');
  console.log('='.repeat(80));
}

// Run tests
runAllTests().catch(console.error);

