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

    // Create a prompt for the AI assistant
    const prompt = `You are a focus assistant. A user is viewing a webpage with the following information:
- Title: ${title}
- URL: ${url}
- Keywords: ${keywords}

Please provide a brief, focused summary or analysis to help the user stay focused on what's important. Keep the response concise and actionable.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful focus assistant that helps users stay focused and extract key information from web content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    // Extract the AI response
    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';

    // Return success response with AI analysis
    return res.status(200).json({
      status: 'success',
      data: {
        keywords,
        title,
        url,
        focusAnalysis: aiResponse
      }
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


