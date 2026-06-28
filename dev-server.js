// Local dev server for LearnNanoXRP.
// Serves static files + accepts image uploads from the drag-and-drop feature.
// Not deployed — production uses GitHub Pages.
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css',
  '.js':    'application/javascript',
  '.json':  'application/json',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.webp':  'image/webp',
  '.zip':   'application/zip',
  '.xml':   'application/xml',
};

// Safely join a URL pathname to ROOT, guarding against path traversal.
function toFilePath(urlPathname) {
  const parts = urlPathname
    .replace(/^\//, '')
    .split('/')
    .filter(p => p && p !== '..' && p !== '.');
  const joined = parts.length ? path.join(ROOT, ...parts) : ROOT;
  return joined.startsWith(ROOT) ? joined : null;
}

function json(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

http.createServer((req, res) => {
  let parsed;
  try { parsed = new URL(req.url, 'http://localhost'); }
  catch { res.writeHead(400); res.end('Bad request'); return; }

  const method   = req.method.toUpperCase();
  const pathname = decodeURIComponent(parsed.pathname);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  // ── GET /list-images?dir=lessons/<lang>/<name>/images/ ──────────────────────
  // Returns JSON array of filenames in the given images/ folder.
  // Used by image-loader.js to detect real photos without probing each file.
  if (method === 'GET' && pathname === '/list-images') {
    const dir = parsed.searchParams.get('dir') || '';
    if (!/^lessons\/(source|translations\/[a-z]{2})\/[^/]+\/images\/?$/.test(dir)) {
      res.writeHead(400); res.end('Invalid dir'); return;
    }
    const absDir = toFilePath(dir);
    if (!absDir) { res.writeHead(403); res.end('Forbidden'); return; }
    fs.readdir(absDir, (err, files) => {
      json(res, err ? [] : files);
    });
    return;
  }

  // ── POST /upload-image?path=lessons/<lang>/<name>/images/<file>.<ext> ───────
  if (method === 'POST' && pathname === '/upload-image') {
    const relPath = parsed.searchParams.get('path') || '';
    if (!/^lessons\/(source|translations\/[a-z]{2})\/[^/]+\/images\/[^/]+\.(png|jpg|jpeg|webp)$/i.test(relPath)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid path');
      return;
    }
    const absPath = toFilePath(relPath);
    if (!absPath) { res.writeHead(403); res.end('Forbidden'); return; }
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      fs.writeFile(absPath, Buffer.concat(chunks), err => {
        if (err) { res.writeHead(500); res.end('Write error'); return; }
        console.log('  Saved:', relPath);
        json(res, { ok: true });
      });
    });
    return;
  }

  // ── Static file serving ───────────────────────────────────────────────────
  let filePath = toFilePath(pathname) || path.join(ROOT, 'index.html');

  fs.stat(filePath, (statErr, stat) => {
    if (!statErr && stat.isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { Location: pathname + '/' });
        res.end();
        return;
      }
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        console.error('  404:', method, pathname, '\n      tried:', filePath);
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      // HEAD requests must not include a body
      res.end(method === 'HEAD' ? undefined : data);
    });
  });

}).listen(PORT, () => {
  console.log('');
  console.log('  LearnNanoXRP dev server');
  console.log(`  http://localhost:${PORT}`);
  console.log('  Drag images onto any placeholder to replace them.');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
