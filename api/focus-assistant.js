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
    const { keywords, title, url } = req.body;

    // Validate required fields
    if (!keywords || !title || !url) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'keywords, title, and url are required'
      });
    }

    // Prompt V1.0 Template
    const promptTemplate = `[System/Role Instruction - 角色指令] 你是一个专业的网页专注助理。你的核心职责是根据用户提供的【任务关键词】，严格判断当前网页的标题和URL是否与用户的生产力任务直接相关。 

[Goal & Constraint - 目标与约束] 你必须输出一个JSON对象。你的判断结果必须包含一个0到100的百分比数值，以表示相关性的置信度。 

[Input Data - 输入数据] 以下是你需要分析的数据，使用XML标签进行分隔，避免混淆： <TASK_KEYWORDS> 

${keywords}

</TASK_KEYWORDS>

<WEBPAGE_TITLE> 

${title}

</WEBPAGE_TITLE> 

<WEBPAGE_URL> 

${url}

</WEBPAGE_URL>



[Reasoning and Output Logic - 推理与输出逻辑]

1. **推理：** 根据<TASK_KEYWORDS>，推理出用户当前正在进行的工作领域（如设计、代码学习、研究等）。 

2. **判断：** 严格判断<WEBPAGE_TITLE>和<WEBPAGE_URL>是否为该领域的**直接、高价值**资源或工作工具。 

3. **置信度 (0-100)：** 

	1. **90% 以上：** 网页是关键词的直接文档、教程或核心工作工具（如Figma文档）。 

	2. **50%-90%：** 网页间接相关，或是一个高价值的搜索结果页。 

	3. **50% 以下：** 网页是无关的社交媒体、新闻、娱乐内容，或者与关键词毫不相干。 

	4. **状态 (Status)：** 你的判断状态必须符合以下规则： 

		- **得分 >= 50：** STATUS 必须是 "Stay" (留在页面)。 

		- **得分 < 50：** STATUS 必须是 "Block" (建议拦截/提示)。 

	5. **理由 (Reason)：** 理由必须简短、客观，解释百分比的来源。



[Output Format - 输出格式] 你必须且仅返回以下格式的JSON对象。不要包含任何额外文字、前缀或解释。 

{ 

	"relevance_score_percent": [输出0-100的整数], 

	"status": ["Stay" 或 "Block"], 

	"reason": "简短的判断理由" 

}`;

    // Call OpenAI API with JSON response format enforced
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的网页专注助理。你必须严格按照指令返回JSON格式的响应。'
        },
        {
          role: 'user',
          content: promptTemplate
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.3
    });

    // Extract and parse the AI response
    const aiResponseContent = completion.choices[0]?.message?.content || '{}';
    
    let aiResult;
    try {
      aiResult = JSON.parse(aiResponseContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponseContent);
      return res.status(500).json({
        error: 'Invalid Response Format',
        message: 'AI returned invalid JSON format',
        rawResponse: aiResponseContent
      });
    }

    // Validate the response structure
    if (!aiResult.relevance_score_percent || !aiResult.status || !aiResult.reason) {
      return res.status(500).json({
        error: 'Invalid Response Structure',
        message: 'AI response missing required fields',
        received: aiResult
      });
    }

    // Return the AI analysis result
    return res.status(200).json(aiResult);

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


