/**
 * Test OpenAI API Key directly
 * Run with: node test-openai-key.js
 * 
 * Note: This requires OPENAI_API_KEY in .env.local or environment
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  console.log('\n💡 Make sure you have:');
  console.log('   1. Created .env.local file with: OPENAI_API_KEY=your-key-here');
  console.log('   2. Or set the environment variable directly');
  process.exit(1);
}

console.log('🔑 Testing OpenAI API Key...');
console.log(`Key prefix: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
console.log('');

const openai = new OpenAI({
  apiKey: apiKey
});

async function testAPIKey() {
  try {
    console.log('📤 Sending test request to OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello" in one word'
        }
      ],
      max_tokens: 10
    });

    console.log('✅ API Key is valid!');
    console.log(`Response: ${completion.choices[0]?.message?.content}`);
    return true;
  } catch (error) {
    console.error('❌ API Key test failed:');
    console.error(`Error type: ${error.constructor.name}`);
    console.error(`Error message: ${error.message}`);
    
    if (error.status) {
      console.error(`HTTP Status: ${error.status}`);
    }
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    // Common error explanations
    if (error.message.includes('429')) {
      console.log('\n💡 429 Error usually means:');
      console.log('   - Rate limit exceeded (too many requests)');
      console.log('   - Quota exceeded (need to add payment method)');
      console.log('   - New account needs initial credit');
    }
    
    if (error.message.includes('401')) {
      console.log('\n💡 401 Error means:');
      console.log('   - Invalid API key');
      console.log('   - API key may be revoked');
    }
    
    return false;
  }
}

testAPIKey();

