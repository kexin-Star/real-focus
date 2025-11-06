/**
 * Vercel Serverless Function - AI Focus Assistant
 * 
 * This function handles POST requests with focus-related data
 * and uses OpenAI to provide focus assistance.
 */

import OpenAI from 'openai';

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

3. **Correction Instruction:**
   - **Ignore the interference of the initial semantic score on your final judgment.**
   - **Based on your domain knowledge and process reasoning, directly provide the final corrected score (0-100) that reflects the true relevance to the user's task.**
   - The corrected score should replace the semantic score, not complement it.

4. **Scoring Guidelines (0–100):**
   • 90–100 → Directly relevant core tools, docs, tutorials, essential resources, or necessary process pages.
   • 50–89 → Partially relevant (search results, discussion, related topics, helpful but not essential), or supporting process pages.
   • <50 → Irrelevant, social media, entertainment, ads, news, shopping, or clickbait.

5. **Penalty:** If content includes many unrelated or emotional words (e.g. gossip, celebrities, memes, trending slang), decrease the score.

6. **Language:** Detect the language of <TASK_KEYWORDS> and respond in the same language.

[Output Format]
Output JSON only. You must provide:
- "relevance_score_percent": Your final corrected score (0-100, integer) that replaces the semantic score
- "reason": Brief explanation of your judgment (<25 words, in the same language as TASK_KEYWORDS)

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
    const semantic_score = cosineSimilarity(keywordsEmbedding, webpageEmbedding);
    
    // Calculate raw cosine value for logging (0-1 range)
    const rawCosine = semantic_score / 100;
    
    console.log(`Embedding similarity: ${rawCosine.toFixed(3)} (semantic score: ${semantic_score})`);

    // ============================================
    // Step 2: Hybrid Judgment Strategy (Three-Tier Logic)
    // ============================================

    let final_score;
    let reason;
    let status;
    let usedGPT = false;

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
    else if (semantic_score <= 35) {
      console.log(`Low relevance detected (score: ${semantic_score}), using fast block (no GPT)`);
      
      // Use a low score in the range 10-20 (simplified to 15)
      final_score = 15;
      status = 'Block';
      reason = 'Content shows low semantic similarity with task keywords. Not relevant to current task.';
      
      console.log(`Fast block: Final score = ${final_score}, Status = ${status}`);
    }
    // ============================================
    // Tier 3: Ambiguous Relevance (Deep Analysis) - Use GPT
    // ============================================
    else {
      // Semantic score is between 35 and 75 (inclusive boundaries)
      console.log(`Ambiguous relevance (score: ${semantic_score}), using GPT deep analysis`);
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
      reason: reason
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


