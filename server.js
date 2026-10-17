// MoneyMate backend: plain Node.js, no dependencies. Stores data in data/db.json.
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000, HOST = process.env.HOST || '127.0.0.1';
const PUB = path.join(__dirname, 'public'), DB = path.join(__dirname, 'data', 'db.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

fs.mkdirSync(path.dirname(DB), { recursive: true });
let db = { transactions: [], budgets: {} };
try { db = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch {}
const persist = () => { const t = DB + '.tmp'; fs.writeFileSync(t, JSON.stringify(db, null, 2)); fs.renameSync(t, DB); };

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise((ok, no) => {
  let d = '';
  req.on('data', c => { d += c; if (d.length > 2e6) { no(new Error('Payload too large')); req.destroy(); } });
  req.on('end', () => { try { ok(JSON.parse(d || 'null')); } catch (e) { no(new Error('Invalid JSON')); } });
});

const str = (v, n) => typeof v === 'string' && v.trim().length > 0 && v.length <= n;
function clean(t) {
  if (!t || !['income', 'expense'].includes(t.type) || !str(t.name, 60) || !Number.isFinite(t.amount) || t.amount <= 0
    || !/^\d{4}-\d{2}-\d{2}$/.test(t.date) || !str(t.category, 40) || !str(t.method, 30) || !Number.isFinite(t.id)
    || (t.desc != null && (typeof t.desc !== 'string' || t.desc.length > 120))) return null;
  return { id: t.id, type: t.type, name: t.name.trim(), amount: Math.round(t.amount * 100) / 100, date: t.date,
    category: t.category, method: t.method, desc: (t.desc || '').trim() };
}

http.createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.startsWith('/api/')) {
      if (req.method === 'GET' && p === '/api/state') return json(res, 200, db);
      if (req.method === 'PUT' && p === '/api/transactions') {
        const b = await readBody(req);
        if (!Array.isArray(b)) return json(res, 400, { error: 'Expected an array of transactions' });
        const c = b.map(clean);
        if (c.includes(null)) return json(res, 400, { error: 'One or more transactions are invalid' });
        db.transactions = c; persist(); return json(res, 200, { ok: true, count: c.length });
      }
      if (req.method === 'PUT' && p === '/api/budgets') {
        const b = await readBody(req);
        if (!b || typeof b !== 'object' || Array.isArray(b) || Object.values(b).some(v => !Number.isFinite(v) || v < 0))
          return json(res, 400, { error: 'Budgets must map category names to positive numbers' });
        db.budgets = b; persist(); return json(res, 200, { ok: true });
      }
      if (req.method === 'DELETE' && p === '/api/data') { db = { transactions: [], budgets: {} }; persist(); return json(res, 200, { ok: true }); }
      return json(res, 404, { error: 'Not found' });
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    const f = path.normalize(path.join(PUB, p === '/' ? 'index.html' : p));
    if (!f.startsWith(PUB)) return json(res, 403, { error: 'Forbidden' });
    fs.readFile(f, (e, d) => {
      if (e) return json(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d);
    });
  } catch (e) { json(res, 400, { error: e.message }); }
}).listen(PORT, HOST, () => console.log(`MoneyMate running at http://${HOST}:${PORT}`));
