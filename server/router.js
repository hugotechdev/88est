// Router ndogo (badala ya Express) - inapokea maombi na kuyapeleka kwenye routes
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 25 * 1024 * 1024) {
        reject(httpError(413, 'Faili ni kubwa mno'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString('utf8');
      if (!s) return resolve({});
      try {
        resolve(JSON.parse(s));
      } catch (e) {
        reject(httpError(400, 'Taarifa zilizotumwa si sahihi'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, dir) {
  let p = req.path;
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(dir, p));
  if (!file.startsWith(dir)) {
    res.writeHead(403);
    return res.end();
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(path.join(dir, 'index.html')).pipe(res);
    }
    const ext = path.extname(file).toLowerCase();
    const noCache = ext === '.html' || p === '/sw.js' || ext === '.js' || ext === '.css';
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': noCache ? 'no-cache' : 'public, max-age=86400',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

class Router {
  constructor() {
    this.routes = [];
  }
  add(method, p, handlers) {
    const keys = [];
    const re = new RegExp(
      '^' + p.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$'
    );
    this.routes.push({ method, re, keys, handlers });
  }
  get(p, ...h) { this.add('GET', p, h); }
  post(p, ...h) { this.add('POST', p, h); }
  put(p, ...h) { this.add('PUT', p, h); }
  delete(p, ...h) { this.add('DELETE', p, h); }

  async handle(req, res, publicDir) {
    const u = new URL(req.url, 'http://localhost');
    try { req.path = decodeURIComponent(u.pathname); } catch (e) { req.path = u.pathname; }
    req.query = Object.fromEntries(u.searchParams);

    res.json = (obj, status = 200) => {
      if (res.writableEnded) return;
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(obj));
    };
    res.html = (s, status = 200) => {
      if (res.writableEnded) return;
      res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(s);
    };
    res.redirect = (loc) => {
      res.writeHead(302, { Location: loc });
      res.end();
    };

    for (const r of this.routes) {
      if (r.method !== req.method && !(r.method === 'GET' && req.method === 'HEAD')) continue;
      const m = r.re.exec(req.path);
      if (!m) continue;
      req.params = {};
      r.keys.forEach((k, i) => { req.params[k] = m[i + 1]; });
      try {
        req.body = req.method === 'GET' || req.method === 'HEAD' ? {} : await readBody(req);
        for (const h of r.handlers) {
          await h(req, res);
          if (res.writableEnded) return;
        }
        if (!res.writableEnded) res.json({ ok: true });
      } catch (e) {
        if (e.status) return res.json({ error: e.message }, e.status);
        console.error(e);
        res.json({ error: 'Hitilafu ya server. Jaribu tena.' }, 500);
      }
      return;
    }

    if (req.path.startsWith('/api/')) return res.json({ error: 'Haipatikani' }, 404);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    serveStatic(req, res, publicDir);
  }
}

module.exports = { Router, httpError };
