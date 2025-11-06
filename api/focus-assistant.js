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

    // Prepare content for embedding (use content_snippet if available, otherwise use title)
    const webpageContent = content_snippet ? `${title} ${content_snippet}` : title;

    // Prompt V5.0 Template
    const promptTemplate = `You are FocusMate, an AI focus assistant that determines whether a webpage helps the user stay productive.

[Objective]
Evaluate how directly the following webpage supports the user's current task based on the <TASK_KEYWORDS>.

[Input]

<TASK_KEYWORDS>${keywords}</TASK_KEYWORDS>

<WEBPAGE_TITLE>${title}</WEBPAGE_TITLE>

<WEBPAGE_URL>${url}</WEBPAGE_URL>

<WEBPAGE_CONTENT>${content_snippet || ''}</WEBPAGE_CONTENT>

[Rules]
1. Priority: Analyze <WEBPAGE_CONTENT> first, then <WEBPAGE_TITLE>, finally <WEBPAGE_URL>.

2. Scoring (0–100):
   • 90–100 → Directly relevant core tools, docs, tutorials.
   • 50–89 → Partially relevant (search results, discussion, related topics).
   • <50 → Irrelevant, social media, entertainment, ads, news, shopping, or clickbait.

3. Penalty: If content includes many unrelated or emotional words (e.g. gossip, celebrities, memes, trending slang), decrease the score.

4. Language: Detect the language of <TASK_KEYWORDS> and respond in the same language.

5. Decision:
   • Score ≥ 50 → status = "Stay"
   • Score < 50 → status = "Block"

6. Output reason briefly (<25 words).

[Output Format]
Output JSON only:

{
  "relevance_score_percent": [integer 0–100],
  "status": ["Stay" or "Block"],
  "reason": "Short reasoning (in same language)"
}`;

    // Calculate cosine similarity between embeddings
    function cosineSimilarity(a, b) {
      const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const normA = Math.sqrt(a.reduce((sum, val) => sum + val ** 2, 0));
      const normB = Math.sqrt(b.reduce((sum, val) => sum + val ** 2, 0));
      return dot / (normA * normB);
    }

    // Step 1: Calculate Embedding Similarity
    const [emb1, emb2] = await Promise.all([
      openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: keywords
      }),
      openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: webpageContent
      })
    ]);

    const cosine = cosineSimilarity(
      emb1.data[0].embedding,
      emb2.data[0].embedding
    );
    const semantic_score = Math.round(cosine * 100);

    console.log(`Embedding similarity: ${cosine.toFixed(3)} (semantic score: ${semantic_score})`);

    // Step 2: Determine if we need GPT deep analysis
    let final_score = semantic_score;
    let reason = 'High similarity by keywords.';
    let status = semantic_score >= 50 ? 'Stay' : 'Block';
    let usedGPT = false;

    // If similarity is in the ambiguous range (0.35-0.75), use GPT for deep analysis
    if (cosine > 0.35 && cosine < 0.75) {
      console.log(`Ambiguous similarity (${cosine.toFixed(3)}), using GPT for deep analysis`);
      usedGPT = true;
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: promptTemplate
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 120,
        temperature: 0.2
      });

      const aiResponseContent = completion.choices[0]?.message?.content || '{}';
      
      let gptOutput;
      try {
        gptOutput = JSON.parse(aiResponseContent);
      } catch (parseError) {
        console.error('Failed to parse GPT response as JSON:', aiResponseContent);
        // Fallback to semantic score only
        gptOutput = {
          relevance_score_percent: semantic_score,
          status: status,
          reason: reason
        };
      }

      // Validate GPT output
      if (!gptOutput.relevance_score_percent || !gptOutput.status || !gptOutput.reason) {
        console.warn('Invalid GPT output structure, using semantic score');
        gptOutput = {
          relevance_score_percent: semantic_score,
          status: status,
          reason: reason
        };
      }

      // Average the semantic score and GPT score
      final_score = Math.round((semantic_score + gptOutput.relevance_score_percent) / 2);
      reason = gptOutput.reason;
      status = final_score >= 50 ? 'Stay' : 'Block';
    } else {
      // For high or low similarity, use semantic score directly
      if (cosine >= 0.75) {
        reason = 'High semantic similarity with task keywords.';
        console.log('High similarity, using Embedding only (fast path)');
      } else {
        reason = 'Low semantic similarity with task keywords.';
        console.log('Low similarity, using Embedding only (fast path)');
      }
    }

    console.log(`Final score: ${final_score}, Status: ${status}, Used GPT: ${usedGPT}`);

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


