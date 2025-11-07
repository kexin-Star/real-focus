/**
 * 临时本地服务器 - 用于本地测试
 * 绕过 vercel dev 的 Development Command 问题
 * 使用 Node.js 内置 http 模块，无需额外依赖
 */

import http from 'http';
import { URL } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import the Vercel serverless function handler
const handler = (await import('./api/focus-assistant.js')).default;

const PORT = process.env.PORT || 3000;

// Create a simple request/response adapter for Vercel format
function createVercelReqRes(nodeReq, nodeRes) {
  let body = '';
  
  // Collect request body
  nodeReq.on('data', chunk => {
    body += chunk.toString();
  });
  
  return new Promise((resolve) => {
    nodeReq.on('end', () => {
      const url = new URL(nodeReq.url, `http://${nodeReq.headers.host}`);
      
      const vercelReq = {
        method: nodeReq.method,
        url: nodeReq.url,
        headers: nodeReq.headers,
        body: body ? JSON.parse(body) : {},
        query: Object.fromEntries(url.searchParams),
      };
      
      let headersSent = false;
      let statusCode = 200;
      
      const vercelRes = {
        status: (code) => {
          statusCode = code;
          return vercelRes;
        },
        json: (data) => {
          if (!headersSent) {
            nodeRes.writeHead(statusCode, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            headersSent = true;
          }
          nodeRes.end(JSON.stringify(data));
          return vercelRes;
        },
        setHeader: (name, value) => {
          if (!headersSent) {
            nodeRes.setHeader(name, value);
          }
          return vercelRes;
        },
        end: () => {
          if (!headersSent) {
            nodeRes.writeHead(statusCode);
          }
          nodeRes.end();
          return vercelRes;
        },
      };
      
      resolve({ vercelReq, vercelRes });
    });
  });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }
  
  // Health check
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Local development server is running',
      api: '/api/focus-assistant'
    }));
    return;
  }
  
  // Handle API route
  if (req.url === '/api/focus-assistant' || req.url.startsWith('/api/focus-assistant')) {
    try {
      const { vercelReq, vercelRes } = await createVercelReqRes(req, res);
      await handler(vercelReq, vercelRes);
    } catch (error) {
      console.error('Error handling request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Local Development Server');
  console.log('='.repeat(60));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/focus-assistant`);
  console.log(`🔑 Using OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log('='.repeat(60));
  console.log('\nPress Ctrl+C to stop the server\n');
});

