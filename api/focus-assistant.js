/**
 * Vercel Serverless Function - AI Focus Assistant
 * 
 * This function handles POST requests with focus-related data
 * and uses OpenAI to provide focus assistance.
 */

import OpenAI from 'openai';

// ============================================
// Interference Domains Blacklist
// ============================================
/**
 * List of interference domains (social media, entertainment, news)
 * Meta-Task logic should NOT apply to pages on these domains
 * even if they contain meta-task keywords
 */
const INTERFERENCE_DOMAINS = [
  // Chinese social media & entertainment
  'xiaohongshu.com',
  'xiaohongshu.cn',
  'weibo.com',
  'weibo.cn',
  'douyin.com',
  'douyin.cn',
  'tiktok.com',
  'toutiao.com',
  'zhihu.com',
  'bilibili.com',
  'bilibili.tv',
  'acfun.cn',
  'iqiyi.com',
  'youku.com',
  'tencent.com',
  'qq.com',
  'qzone.qq.com',
  'weixin.qq.com',
  'baidu.com',
  'baidu.cn',
  'sina.com.cn',
  'sina.cn',
  'netease.com',
  '163.com',
  'sohu.com',
  'sogou.com',
  'taobao.com',
  'tmall.com',
  'jd.com',
  'pinduoduo.com',
  'meituan.com',
  'dianping.com',
  'douban.com',
  'huya.com',
  'douyu.com',
  'kuaishou.com',
  'kuaishou.cn',
  
  // International social media & entertainment
  'instagram.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'reddit.com',
  'pinterest.com',
  'snapchat.com',
  'linkedin.com',
  'tumblr.com',
  'flickr.com',
  'vimeo.com',
  'twitch.tv',
  'discord.com',
  'telegram.org',
  'whatsapp.com',
  'messenger.com',
  'tiktok.com',
  'netflix.com',
  'hulu.com',
  'disney.com',
  'disneyplus.com',
  'hbo.com',
  'amazon.com',
  'amazon.cn',
  'ebay.com',
  'etsy.com',
  'etsy.cn',
  
  // News & media
  'cnn.com',
  'bbc.com',
  'nytimes.com',
  'theguardian.com',
  'washingtonpost.com',
  'reuters.com',
  'bloomberg.com',
  'forbes.com',
  'techcrunch.com',
  'theverge.com',
  'engadget.com',
  'gizmodo.com',
  'mashable.com',
  'buzzfeed.com',
  'vice.com',
  'vox.com',
  'medium.com',
  'substack.com',
  
  // Gaming
  'steam.com',
  'steampowered.com',
  'epicgames.com',
  'roblox.com',
  'minecraft.net',
  'playstation.com',
  'xbox.com',
  'nintendo.com',
  'riotgames.com',
  'blizzard.com',
  'ea.com',
  'ubisoft.com',
  
  // Other distractions
  'wikipedia.org',
  'wikimedia.org',
  'quora.com',
  'stackoverflow.com', // Note: Stack Overflow can be work-related, but often leads to distraction
  // Note: github.com, gitlab.com, vercel.com, etc. are NOT in blacklist
  // because they are legitimate work tools that may have meta-task pages
];

export default async function handler(req, res) {
  // Set CORS headers (optional, for cross-origin requests)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if request method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are supported'
    });
  }

  try {
    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'OPENAI_API_KEY is not configured'
      });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey
    });

    // Parse JSON from request body
    const { keywords, title, url, content_snippet } = req.body;

    // Validate required fields
    if (!keywords || !title || !url) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'keywords, title, and url are required'
      });
    }

    // ============================================
    // Helper Functions: Embedding & Similarity
    // ============================================

    /**
     * Generate embedding vector for a given text using OpenAI's embedding model
     * @param {string} text - Input text to generate embedding for
     * @returns {Promise<number[]>} - Embedding vector
     */
    async function getEmbedding(text) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      return response.data[0].embedding;
    }

    /**
     * Calculate cosine similarity between two embedding vectors
     * Returns a normalized score from 0-100 (integer)
     * @param {number[]} vecA - First embedding vector
     * @param {number[]} vecB - Second embedding vector
     * @returns {number} - Cosine similarity score (0-100, integer)
     */
    function cosineSimilarity(vecA, vecB) {
      // Calculate dot product
      const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
      
      // Calculate norms
      const normA = Math.sqrt(vecA.reduce((sum, val) => sum + val ** 2, 0));
      const normB = Math.sqrt(vecB.reduce((sum, val) => sum + val ** 2, 0));
      
      // Calculate cosine similarity (range: -1 to 1)
      const cosine = dot / (normA * normB);
      
      // Normalize to 0-1 range (assuming cosine is already in -1 to 1)
      // For embeddings, cosine similarity is typically in 0-1 range
      const normalized = Math.max(0, Math.min(1, cosine));
      
      // Convert to 0-100 integer score
      return Math.round(normalized * 100);
    }

    // ============================================
    // Embedding Input Optimization
    // ============================================

    /**
     * Build optimized text for keywords embedding
     * Uses keywords directly as they represent the user's task intent
     */
    const keywordsText = keywords.trim();

    /**
     * Build optimized text for webpage content embedding
     * Combines title and content_snippet into a contextual sentence
     * This improves semantic quality by providing more context
     */
    const webpageContentText = content_snippet 
      ? `Title: ${title.trim()}. Content: ${content_snippet.trim()}`
      : `Title: ${title.trim()}`;

    // ============================================
    // Prompt V3.2 Template (for GPT deep analysis with process reasoning)
    // This function builds the prompt with semantic score included
    // ============================================

    function buildPromptTemplate(semanticScore) {
      return `You are FocusMate, an AI focus assistant that determines whether a webpage helps the user stay productive.

[Objective]
Evaluate how directly the following webpage supports the user's current task based on the <TASK_KEYWORDS>. You will provide a final corrected relevance score that replaces the initial semantic similarity score.

**CRITICAL REMINDER**: Before scoring, check if the page matches the Documentation Value Rule (section 3). If it does, you MUST assign a score between 70-90%, regardless of semantic similarity or content analysis.

[Input]

<TASK_KEYWORDS>${keywords}</TASK_KEYWORDS>

<WEBPAGE_TITLE>${title}</WEBPAGE_TITLE>

<WEBPAGE_URL>${url}</WEBPAGE_URL>

<WEBPAGE_CONTENT>${content_snippet || ''}</WEBPAGE_CONTENT>

<SEMANTIC_SIMILARITY_SCORE>${semanticScore}</SEMANTIC_SIMILARITY_SCORE>

[Context]
The <SEMANTIC_SIMILARITY_SCORE> (0-100) is calculated using Embedding similarity between the task keywords and webpage content. This score indicates the initial semantic similarity, but may not capture domain-specific relevance, content quality, task alignment, or process-related necessities.

[Reasoning and Output Logic]

1. **Content Analysis:**
   - Priority: Analyze <WEBPAGE_CONTENT> first, then <WEBPAGE_TITLE>, finally <WEBPAGE_URL>.
   - Evaluate domain-specific relevance (e.g., is this a core tool, tutorial, or documentation for the task?).
   - Assess content quality and depth.
   - Check task alignment (does this directly support the user's productivity goal?).

2. **Process Common Sense Reasoning (Critical):**
   - **Judge whether the current page content belongs to essential supporting tools, API management, official documentation, or other administrative/management processes required to complete the user's task.**
   - **If the page is a necessary supporting resource (e.g., API usage pages, documentation portals, account management, billing pages for tools being used), even if the semantic score is relatively low, you should provide a higher corrected score.**
   - Examples of process-necessary pages:
     * API usage/billing pages for tools mentioned in task keywords
     * Official documentation for frameworks/libraries being used
     * Account management or authentication pages for required services
     * Development environment setup or configuration pages
     * Version control or project management tools related to the task
   
   **3. Documentation Value Rule (MANDATORY - HIGHEST PRIORITY):**
   - **STEP 1: Check if URL or Title contains documentation keywords**: Look for 'docs', 'documentation', 'errors', 'error', 'api', 'reference', 'guide', 'tutorial', 'getting-started', 'quickstart', 'examples', 'example', 'how-to', 'howto', 'faq', 'help', 'support', 'manual', 'handbook', 'playbook', 'cheatsheet', 'cheat-sheet', 'reference', 'spec', 'specification'.
   - **STEP 2: Check if domain is a development tool chain**: Check if the domain (from <WEBPAGE_URL>) belongs to: vercel.com, github.com, gitlab.com, npmjs.com, stackoverflow.com, gemini.google.com, chat.openai.com, claude.ai, openai.com, anthropic.com, developer.mozilla.org, nodejs.org, react.dev, vuejs.org, angular.io, nextjs.org, nuxt.com, or their subdomains (e.g., docs.vercel.com, docs.github.com).
   - **STEP 3: If BOTH conditions are met**: This page is **essential technical support** for completing the task. **YOU MUST assign a score between 70% and 90%**. Do NOT assign a score below 70% for these pages.
   - **Rationale**: Documentation, error guides, API references, and tutorials from reputable development tool chains are critical resources for any development task, even if the semantic similarity is low. They provide necessary technical information that directly supports productivity.
   - **Examples that MUST score 70-90%**:
     * vercel.com/docs/errors/... → 70-90% (contains 'docs' and 'errors', domain is vercel.com)
     * github.com/docs/... → 70-90% (contains 'docs', domain is github.com)
     * developer.mozilla.org/en-US/docs/... → 70-90% (contains 'docs', domain is developer.mozilla.org)
     * nodejs.org/api/... → 70-90% (contains 'api', domain is nodejs.org)
   - **This rule takes precedence over semantic similarity score. Even if semantic score is 15%, if this rule applies, you MUST assign 70-90%.**

4. **Correction Instruction:**
   - **Ignore the interference of the initial semantic score on your final judgment.**
   - **Based on your domain knowledge and process reasoning, directly provide the final corrected score (0-100) that reflects the true relevance to the user's task.**
   - The corrected score should replace the semantic score, not complement it.
   - **CRITICAL**: Apply the Documentation Value Rule (section 3) **BEFORE** applying general scoring guidelines. If a page matches the documentation criteria, you MUST assign a score between 70-90%.

5. **Scoring Guidelines (0–100):**
   • 90–100 → Directly relevant core tools, docs, tutorials, essential resources, or necessary process pages.
   • 70–89 → **Highly relevant supporting tools, documentation, error guides, API references, or tools that significantly help the task. This range is MANDATORY for tool chain documentation pages (see Documentation Value Rule in section 3).**
   • 50–69 → Partially relevant (search results, discussion, related topics, helpful but not essential), or supporting process pages.
   • 30–49 → Somewhat related but not directly supporting the task.
   • <30 → Irrelevant, social media, entertainment, ads, news, shopping, or clickbait.

6. **Penalty:** If content includes many unrelated or emotional words (e.g. gossip, celebrities, memes, trending slang), decrease the score. **However, do NOT apply this penalty to tool chain documentation pages that match the Documentation Value Rule.**

7. **Language:** Detect the language of <TASK_KEYWORDS> and respond in the same language.

[Output Format]
Output JSON only. You must provide:
- "relevance_score_percent": Your final corrected score (0-100, integer) that replaces the semantic score
- "reason": Brief explanation of your judgment (<25 words, in the same language as TASK_KEYWORDS)

**FINAL CHECK BEFORE OUTPUT**: 
- If the page URL or title contains documentation keywords (docs, errors, api, reference, guide, etc.) AND the domain is a development tool chain (vercel.com, github.com, etc.), your score MUST be between 70-90.
- Do NOT output a score below 70 for tool chain documentation pages, even if you think the content is not directly related to the task keywords.

{
  "relevance_score_percent": [integer 0–100],
  "reason": "Short reasoning (in same language)"
}`;
    }

    // ============================================
    // Step 1: Calculate Embedding Similarity
    // ============================================

    console.log('Generating embeddings...');
    console.log('Keywords text:', keywordsText);
    console.log('Webpage content text:', webpageContentText);

    // Generate embeddings in parallel for better performance
    const [keywordsEmbedding, webpageEmbedding] = await Promise.all([
      getEmbedding(keywordsText),
      getEmbedding(webpageContentText)
    ]);

    // Calculate semantic score (0-100)
    let semantic_score = cosineSimilarity(keywordsEmbedding, webpageEmbedding);
    
    // Calculate raw cosine value for logging (0-1 range)
    const rawCosine = semantic_score / 100;
    
    console.log(`Embedding similarity: ${rawCosine.toFixed(3)} (semantic score: ${semantic_score})`);

    // ============================================
    // Meta-Task Process Common Sense Pre-Check
    // ============================================

    /**
     * Meta-Task keywords list for process management pages
     * These keywords indicate pages that are necessary for task completion
     * even if semantic similarity is low
     */
    const metaTaskKeywords = {
      chinese: ['用量', '账单', '配置', '密钥', '文档', '控制台', '部署', '教程', '指南'],
      english: ['usage', 'billing', 'api key', 'console', 'dashboard', 'github', 'gitlab', 'vercel', 'login', 'auth', 'settings', 'account', 'profile', 'documentation', 'docs', 'deploy', 'deployment', 'tutorial', 'guide']
    };

    /**
     * Toolchain keywords for development tools and documentation
     * These keywords indicate pages that are essential for development tasks
     */
    const toolchainKeywords = {
      tools: ['vercel', 'github', 'gitlab', 'gemini', 'google', 'openai', 'claude', 'cursor', 'npm', 'node', 'react', 'vue', 'angular', 'nextjs', 'nuxt'],
      documentation: ['docs', 'documentation', 'api', 'reference', 'guide', 'tutorial', 'getting-started', 'quickstart', 'examples', 'cli', 'command', 'error', 'errors', 'troubleshooting', 'faq', 'help', 'support']
    };

    /**
     * Extract domain from URL
     * @param {string} url - Page URL
     * @returns {string|null} - Domain name or null if invalid
     */
    function extractDomain(url) {
      try {
        const urlObj = new URL(url);
        // Get hostname and remove 'www.' prefix if present
        let hostname = urlObj.hostname.toLowerCase();
        if (hostname.startsWith('www.')) {
          hostname = hostname.substring(4);
        }
        return hostname;
      } catch (e) {
        // If URL parsing fails, try to extract domain manually
        const match = url.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
        if (match) {
          return match[1].toLowerCase();
        }
        return null;
      }
    }

    /**
     * Check if a page is a Meta-Task process management page
     * Only returns true if:
     * 1. URL/Title contains Meta-Task keywords AND
     * 2. Domain is NOT in the interference domains blacklist
     * 
     * @param {string} url - Page URL
     * @param {string} title - Page title
     * @returns {boolean} - True if page is a valid meta-task page (not on blacklisted domain)
     */
    function isMetaTaskPage(url, title) {
      const combinedText = `${url} ${title}`.toLowerCase();
      let hasMetaTaskKeyword = false;
      
      // Check Chinese keywords
      for (const keyword of metaTaskKeywords.chinese) {
        if (combinedText.includes(keyword.toLowerCase())) {
          hasMetaTaskKeyword = true;
          break;
        }
      }
      
      // Check English keywords if Chinese keywords not found
      if (!hasMetaTaskKeyword) {
        for (const keyword of metaTaskKeywords.english) {
          if (combinedText.includes(keyword.toLowerCase())) {
            hasMetaTaskKeyword = true;
            break;
          }
        }
      }
      
      // If no meta-task keyword found, return false
      if (!hasMetaTaskKeyword) {
        return false;
      }
      
      // Extract domain from URL
      const domain = extractDomain(url);
      if (!domain) {
        // If we can't extract domain, be conservative and return false
        console.log(`Warning: Could not extract domain from URL: ${url}`);
        return false;
      }
      
      // Check if domain is in interference blacklist
      const isInterferenceDomain = INTERFERENCE_DOMAINS.some(interferenceDomain => {
        // Check exact match or subdomain match
        return domain === interferenceDomain || domain.endsWith('.' + interferenceDomain);
      });
      
      if (isInterferenceDomain) {
        console.log(`Meta-Task keyword detected but domain is blacklisted: ${domain}`);
        return false;
      }
      
      // Domain is not in blacklist, and has meta-task keyword
      return true;
    }

    // Perform Meta-Task pre-check
    const isMetaTask = isMetaTaskPage(url, title);
    const extractedDomain = extractDomain(url);
    
    console.log(`Meta-Task check: URL=${url}, Domain=${extractedDomain}, isMetaTask=${isMetaTask}`);
    
    // ============================================
    // Special Case: Meta-Task search on interference domain
    // ============================================
    // Check if URL/Title/Content contains Meta-Task keywords AND domain is in blacklist
    // Include content_snippet in the check to catch cases where keywords are in content but not URL/Title
    const combinedText = `${url} ${title} ${content_snippet || ''}`.toLowerCase();
    const hasMetaTaskKeyword = metaTaskKeywords.chinese.some(k => combinedText.includes(k.toLowerCase())) ||
                               metaTaskKeywords.english.some(k => combinedText.includes(k.toLowerCase()));
    
    let isInterferenceDomain = false;
    if (extractedDomain) {
      isInterferenceDomain = INTERFERENCE_DOMAINS.some(d => 
        extractedDomain === d || extractedDomain.endsWith('.' + d)
      );
    }
    
    // If Meta-Task keyword found AND domain is in blacklist, return early with time control flag
    if (hasMetaTaskKeyword && isInterferenceDomain) {
      console.log(`⏰ Meta-Task search detected on interference domain: ${extractedDomain}`);
      console.log(`   Detected Meta-Task keywords in URL/Title, but domain is blacklisted`);
      console.log(`   Returning early with requires_time_control=true (skip all Hybrid Reasoning)`);
      
      // Return early: skip all Fast Block/Fast Pass/GPT logic
      return res.status(200).json({
        relevance_score_percent: 50,
        status: 'Stay',
        reason: '检测到在干扰平台上搜索工作相关内容，建议设置时间控制',
        requires_time_control: true
      });
    }
    
    // Continue with normal Meta-Task logic for non-blacklisted domains
    if (isMetaTask && semantic_score < 75) {
      console.log(`✅ Meta-Task page detected (URL: ${url}, Title: ${title})`);
      console.log(`   Domain: ${extractedDomain} is NOT in interference blacklist`);
      console.log(`   Original semantic score: ${semantic_score}, forcing to 50 to trigger GPT analysis`);
      
      // Force semantic score to 50 to ensure GPT deep analysis
      // 50 is between 35 and 75, guaranteeing GPT path execution
      semantic_score = 50;
      
      console.log(`   Semantic score updated to: ${semantic_score} (will trigger GPT deep analysis)`);
    } else if (!isMetaTask && hasMetaTaskKeyword && isInterferenceDomain) {
      // This case is already handled above, but log for debugging
      console.log(`⚠️  Meta-Task keyword found but domain ${extractedDomain} is blacklisted - handled by time control logic`);
    }

    // ============================================
    // Step 2: Hybrid Judgment Strategy (Three-Tier Logic)
    // ============================================

    let final_score;
    let reason;
    let status;
    let usedGPT = false;

    // ============================================
    // Tool Chain Domain Detection
    // ============================================
    // List of development tool domains that should always go through GPT analysis
    // even if semantic score is low (to avoid false negatives)
    const TOOL_CHAIN_DOMAINS = [
      'vercel.com',
      'github.com',
      'gitlab.com',
      'npmjs.com',
      'stackoverflow.com',
      'gemini.google.com',
      'chat.openai.com',
      'claude.ai',
      'cursor.sh',
      'openai.com',
      'anthropic.com',
      'docs.github.com',
      'docs.vercel.com',
      'developer.mozilla.org',
      'nodejs.org',
      'react.dev',
      'vuejs.org',
      'angular.io',
      'nextjs.org',
      'nuxt.com'
    ];

    // Check if current domain is a tool chain domain
    const isToolChainDomain = extractedDomain && TOOL_CHAIN_DOMAINS.some(toolDomain => {
      const matches = extractedDomain === toolDomain || 
                      extractedDomain.endsWith('.' + toolDomain) ||
                      extractedDomain.includes(toolDomain);
      if (matches) {
        console.log(`🔧 Tool chain domain matched: ${extractedDomain} matches ${toolDomain}`);
      }
      return matches;
    });
    
    if (extractedDomain) {
      console.log(`🔍 Domain check: ${extractedDomain}, isToolChainDomain: ${isToolChainDomain}`);
    }

    // ============================================
    // Toolchain Keyword Detection (Before Fast Block)
    // ============================================
    // Check if URL/Title/Content contains toolchain keywords
    // This ensures toolchain pages are not Fast Blocked even with low semantic scores
    const combinedTextForToolchain = `${url} ${title} ${content_snippet || ''}`.toLowerCase();
    const hasToolchainKeyword = toolchainKeywords.tools.some(k => combinedTextForToolchain.includes(k.toLowerCase())) ||
                                toolchainKeywords.documentation.some(k => combinedTextForToolchain.includes(k.toLowerCase()));
    
    // If toolchain keyword detected AND semantic score is low (<= 35), force score upgrade
    // This ensures toolchain documentation pages go through GPT analysis instead of Fast Block
    if (hasToolchainKeyword && semantic_score <= 35 && !isInterferenceDomain) {
      console.log(`🔧 Toolchain keyword detected in URL/Title/Content`);
      console.log(`   Original semantic score: ${semantic_score}, forcing to 40 to skip Fast Block`);
      console.log(`   This ensures toolchain pages (e.g., Vercel /docs) go through GPT analysis`);
      
      // Force semantic score to 40 to skip Fast Block (which is <= 20)
      // 40 is between 20 and 75, guaranteeing GPT path execution
      semantic_score = 40;
      
      console.log(`   Semantic score updated to: ${semantic_score} (will trigger GPT deep analysis)`);
    }

    // ============================================
    // Tier 1: High Relevance (Fast Pass) - Skip GPT
    // ============================================
    if (semantic_score >= 75) {
      console.log(`High relevance detected (score: ${semantic_score}), using fast pass (no GPT)`);
      
      // Use a high score in the range 85-95 (simplified to 90)
      final_score = 90;
      status = 'Stay';
      reason = 'Content shows high semantic similarity with task keywords. Directly relevant resource.';
      
      console.log(`Fast pass: Final score = ${final_score}, Status = ${status}`);
    }
    // ============================================
    // Tier 2: Low Relevance (Fast Block) - Skip GPT
    // ============================================
    // Updated: Fast Block threshold moved from <=35 to <=20
    // Exception: Tool chain domains always go through GPT (even if score <= 20)
    else if (semantic_score <= 20 && !isToolChainDomain) {
      console.log(`Low relevance detected (score: ${semantic_score}), using fast block (no GPT)`);
      console.log(`   Domain: ${extractedDomain} is NOT a tool chain domain, skipping GPT`);
      
      // Use a low score in the range 10-20 (simplified to 15)
      final_score = 15;
      status = 'Block';
      reason = 'Content shows low semantic similarity with task keywords. Not relevant to current task.';
      
      console.log(`Fast block: Final score = ${final_score}, Status = ${status}`);
    }
    // ============================================
    // Tier 3: Ambiguous Relevance (Deep Analysis) - Use GPT
    // ============================================
    // Updated: GPT analysis range expanded from (35, 75) to (20, 75)
    // Also includes tool chain domains even if score <= 20
    else {
      // Semantic score is between 20 and 75 (inclusive boundaries)
      // OR it's a tool chain domain (even if score <= 20)
      if (isToolChainDomain && semantic_score <= 20) {
        console.log(`Tool chain domain detected (${extractedDomain}), forcing GPT analysis despite low score (${semantic_score})`);
      } else {
        console.log(`Ambiguous relevance (score: ${semantic_score}), using GPT deep analysis`);
      }
      usedGPT = true;
      
      // Build prompt with semantic score included
      const promptTemplate = buildPromptTemplate(semantic_score);
      
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: promptTemplate
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 150,
          temperature: 0.2
        });

        const aiResponseContent = completion.choices[0]?.message?.content || '{}';
        
        let gptOutput;
        try {
          gptOutput = JSON.parse(aiResponseContent);
        } catch (parseError) {
          console.error('Failed to parse GPT response as JSON:', aiResponseContent);
          // Fallback: use semantic score as GPT score
          gptOutput = {
            relevance_score_percent: semantic_score,
            reason: 'Unable to parse GPT response, using semantic score.'
          };
        }

        // Validate GPT output
        if (typeof gptOutput.relevance_score_percent !== 'number' || 
            !gptOutput.reason) {
          console.warn('Invalid GPT output structure, using semantic score');
          gptOutput = {
            relevance_score_percent: semantic_score,
            reason: 'Invalid GPT response, using semantic score.'
          };
        }

        // Ensure GPT corrected score is in valid range (0-100)
        const gptCorrectedScore = Math.max(0, Math.min(100, Math.round(gptOutput.relevance_score_percent)));

        // Use GPT's corrected score to replace the semantic score (not average)
        final_score = gptCorrectedScore;
        reason = gptOutput.reason;
        
        // Determine status based on final corrected score
        status = final_score >= 50 ? 'Stay' : 'Block';
        
        console.log(`GPT analysis: Semantic=${semantic_score}, GPT Corrected=${gptCorrectedScore}, Final=${final_score}, Status=${status}`);
      } catch (gptError) {
        console.error('Error calling GPT API:', gptError);
        // Fallback: use semantic score directly
        final_score = semantic_score;
        status = semantic_score >= 50 ? 'Stay' : 'Block';
        reason = 'GPT analysis unavailable, using semantic similarity score.';
        usedGPT = false; // Mark as not used due to error
      }
    }

    console.log(`Final judgment: Score=${final_score}, Status=${status}, Used GPT=${usedGPT}`);

    // Return the final result
    return res.status(200).json({
      relevance_score_percent: final_score,
      status: status,
      reason: reason,
      requires_time_control: false
    });

  } catch (error) {
    // Handle errors
    console.error('Error processing request:', error);
    
    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      return res.status(error.status || 500).json({
        error: 'OpenAI API Error',
        message: error.message
      });
    }

    // Handle other errors
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred'
    });
  }
}


