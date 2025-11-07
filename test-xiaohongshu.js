/**
 * Test script for specific Xiaohongshu page
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_URL = process.env.LOCAL_TEST === 'true' 
  ? 'http://localhost:3000/api/focus-assistant'
  : 'https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';

const keywords = '我在用cursor vibecoding做一个google extension用来帮助用户正常使用浏览器查询学习内容的同时保持专注';

const testCase = {
  name: '小红书 - Vercel 部署指南',
  title: '教你如何零成本部署自己的网页 🚀 - 小红书',
  url: 'https://www.xiaohongshu.com/explore/67e06a80000000001c00f776?xsec_token=AB2imJQjBqE_rxhrehxj22S53wlh2P4iZRs76xfnhTP5c=&xsec_source=pc_search&source=unknown',
  content_snippet: '教你如何零成本部署自己的网页。现在通过AI已经可以很轻松地拥有自己的专属网页了！每次制作好之后，就很想把它公开发给朋友们炫耀一番呢！今天就来教大家如何0成本部署自己的网页，让全球各地的人都可以访问它！如果你有自己的域名的话，那就更酷了，可以通过绑定域名来访问！其实可拓展的还有很多，比如可以做：自己的线上简历、个人作品集、项目展示、个人博客等等等等...无限可能！PS：用来展示的项目（Vercel部署指南网站）也是我用AI不到五分钟做出来的。欢迎在评论区分享你的作品哦～#AI创作 #网页设计 #零基础建站 #Vercel #AI'
};

async function runTest() {
  console.log('🧪 测试小红书页面');
  console.log('='.repeat(80));
  console.log(`专注主题 (Keywords): ${keywords}`);
  console.log();
  console.log('📥 输入数据:');
  console.log('─'.repeat(80));
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
    if (result.requires_time_control) {
      console.log(`时间控制: ${result.requires_time_control ? '是' : '否'}`);
    }
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
    console.log('1. 页面内容分析:');
    console.log('   - 这是一个小红书页面，内容是关于"如何零成本部署网页"的教程');
    console.log('   - 提到了 Vercel 部署指南');
    console.log('   - 内容与开发相关，但平台是社交媒体（小红书）');
    console.log();
    console.log('2. 域名分析:');
    const domain = testCase.url.match(/https?:\/\/(?:www\.)?([^\/]+)/i)?.[1];
    console.log(`   - 域名: ${domain}`);
    console.log('   - 小红书是干扰域名（在 INTERFERENCE_DOMAINS 列表中）');
    console.log();
    console.log('3. 预期行为:');
    console.log('   - 如果包含 Meta-Task 关键词且在干扰域名上，应该触发时间控制');
    console.log('   - 或者根据内容相关性判断（可能较低，因为平台是社交媒体）');
    console.log();
    console.log('4. 实际结果:');
    console.log(`   - 相关性分数: ${result.relevance_score_percent}%`);
    console.log(`   - 状态: ${result.status}`);
    console.log(`   - 是否触发时间控制: ${result.requires_time_control ? '是' : '否'}`);
    console.log('─'.repeat(80));
    console.log();

    // Manual judgment section
    console.log('🤔 人工判断提示:');
    console.log('─'.repeat(80));
    console.log('请判断:');
    console.log('1. Content Snippet 是否准确反映了页面内容?');
    console.log('   → 页面内容是关于 Vercel 部署教程，但发布在社交媒体平台');
    console.log();
    console.log('2. 这个页面是否应该被拦截?');
    console.log('   → 虽然内容与开发相关，但平台是社交媒体（小红书）');
    console.log('   → 可能包含 Meta-Task 关键词（"Vercel"、"部署"等）');
    console.log('   → 根据规则，在干扰平台上搜索工作相关内容应该触发时间控制');
    console.log();
    console.log('3. 当前 API 返回的结果是否符合预期?');
    console.log(`   → 分数: ${result.relevance_score_percent}%`);
    console.log(`   → 状态: ${result.status}`);
    console.log(`   → 时间控制: ${result.requires_time_control ? '已触发' : '未触发'}`);
    console.log('─'.repeat(80));

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

// Run test
runTest().catch(console.error);

