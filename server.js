/**
 * Apex Network — Local Development Server
 * Serves static files and proxies API routes to Netlify function handlers.
 * Usage: node server.js
 */

'use strict';

// Load environment variables from .env if present
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed or .env missing — fine for local dev
}

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT    = process.env.PORT || 3000;
const ROOT    = __dirname;

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
  '.pdf':  'application/pdf',
};

// ── API route → function module map ──────────────────────────────────────────
const API_ROUTES = {
  '/api/subscribe': path.join(ROOT, 'netlify/functions/subscribe.js'),
  '/api/apply':     path.join(ROOT, 'netlify/functions/apply.js'),
  '/api/score':     path.join(ROOT, 'netlify/functions/score.js'),
  '/api/webhook':   path.join(ROOT, 'netlify/functions/webhook.js'),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Add CORS headers to every response.
 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Read the full request body as a string.
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end',  ()    => resolve(data));
    req.on('error', reject);
  });
}

/**
 * Build a mock Netlify event object from a Node.js IncomingMessage.
 */
async function buildNetlifyEvent(req, parsedUrl) {
  const body = await readBody(req);

  // Parse query string parameters
  const queryStringParameters = {};
  parsedUrl.searchParams.forEach((value, key) => {
    queryStringParameters[key] = value;
  });

  return {
    httpMethod:            req.method,
    path:                  parsedUrl.pathname,
    queryStringParameters: queryStringParameters,
    headers:               req.headers,
    body:                  body || null,
    isBase64Encoded:       false,
  };
}

/**
 * Send a JSON response.
 */
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type':   'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Send a static file.
 */
function sendFile(res, filePath) {
  const ext      = path.extname(filePath).toLowerCase();
  const mimeType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type':   mimeType,
      'Content-Length': data.length,
    });
    res.end(data);
  });
}

/**
 * Dispatch an API request to the appropriate Netlify function handler.
 */
async function handleApiRoute(req, res, routePath, parsedUrl) {
  const fnPath = API_ROUTES[routePath];

  if (!fnPath || !fs.existsSync(fnPath)) {
    sendJson(res, 404, { error: `No function found for route: ${routePath}` });
    return;
  }

  let fnModule;
  try {
    fnModule = require(fnPath);
  } catch (loadErr) {
    console.error(`[API] Failed to load function at ${fnPath}:`, loadErr.message);
    sendJson(res, 500, { error: 'Function load error', detail: loadErr.message });
    return;
  }

  const handler = fnModule.handler || fnModule;
  if (typeof handler !== 'function') {
    sendJson(res, 500, { error: 'Function does not export a valid handler' });
    return;
  }

  let event;
  try {
    event = await buildNetlifyEvent(req, parsedUrl);
  } catch (bodyErr) {
    sendJson(res, 400, { error: 'Failed to read request body', detail: bodyErr.message });
    return;
  }

  // Mock Netlify context
  const context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: path.basename(fnPath, '.js'),
    functionVersion: '$LATEST',
    invokedFunctionArn: 'local',
    memoryLimitInMB: '1024',
    awsRequestId: `local-${Date.now()}`,
    logGroupName: '/local/functions',
    logStreamName: `local-${Date.now()}`,
    getRemainingTimeInMillis: () => 10000,
    done:    () => {},
    fail:    () => {},
    succeed: () => {},
  };

  try {
    const result = await handler(event, context);

    const statusCode = (result && result.statusCode) ? result.statusCode : 200;
    const headers    = (result && result.headers)    ? result.headers    : {};
    const body       = (result && result.body)       ? result.body       : '';

    // Merge function headers with CORS headers
    const responseHeaders = Object.assign(
      { 'Content-Type': 'application/json; charset=utf-8' },
      headers
    );

    res.writeHead(statusCode, responseHeaders);
    res.end(body);
  } catch (handlerErr) {
    console.error(`[API] Handler error in ${routePath}:`, handlerErr.message);
    sendJson(res, 500, { error: 'Handler execution error', detail: handlerErr.message });
  }
}

// ── Request handler ───────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const parsedUrl  = new URL(req.url, `http://localhost:${PORT}`);
  const pathname   = parsedUrl.pathname;

  // Log every request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // CORS pre-flight
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API routes ──
  if (API_ROUTES[pathname]) {
    await handleApiRoute(req, res, pathname, parsedUrl);
    return;
  }

  // ── Static files ──
  // Normalise path to prevent directory traversal
  let filePath = path.normalize(path.join(ROOT, pathname));

  // Ensure the resolved path stays within ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // If the path is a directory, look for index.html
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (_) {
    // File may not exist yet — will fall through to 404
  }

  // Try the exact path, then with .html extension appended
  const candidates = [filePath];
  if (!path.extname(filePath)) {
    candidates.push(filePath + '.html');
  }

  let resolved = null;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      resolved = candidate;
      break;
    }
  }

  if (!resolved) {
    console.warn(`[404] ${pathname}`);
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>404 — Not Found</title>
  <style>
    body { font-family: monospace; background: #05020e; color: #f0ecff; display: flex;
           align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    h1 { color: #a855f7; font-size: 3rem; } p { color: rgba(240,236,255,0.6); }
    a { color: #c084fc; }
  </style>
</head>
<body>
  <div style="text-align:center">
    <h1>404</h1>
    <p>The page <code>${pathname}</code> was not found.</p>
    <p><a href="/">← Return to index</a></p>
  </div>
</body>
</html>`);
    return;
  }

  sendFile(res, resolved);
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   APEX NETWORK — Local Dev Server        ║');
  console.log(`  ║   http://localhost:${PORT}                      ║`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('  API routes:');
  Object.keys(API_ROUTES).forEach(r => console.log(`    ${r}`));
  console.log('');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT env var to use a different port.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
