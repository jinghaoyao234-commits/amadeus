import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.moc3': 'application/octet-stream'
};
const server = http.createServer(async (req, res) => {
  try {
    // Check the raw path before URL parsing can normalize away traversal segments.
    const rawPath = decodeURIComponent(req.url.split(/[?#]/, 1)[0]);
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (rawPath.split(/[\\/]/).some(p => p.startsWith('.')) || pathname.split('/').some(p => p.startsWith('.'))) {
      res.writeHead(403).end('禁止访问');
      return;
    }
    let target = path.resolve(root, '.' + pathname);
    const relative = path.relative(root, target);
    // An empty relative path is the root itself; sibling paths must stay outside.
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
      res.writeHead(403).end('禁止访问');
      return;
    }
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    const data = await readFile(target);
    res.writeHead(200, {
      'Content-Type': types[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    }).end(data);
  } catch {
    res.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8'
    }).end('文件不存在');
  }
});
// PORT=0 lets tests ask the OS for an available port.
const port = process.env.PORT === '0' ? 0 : Number(process.env.PORT) || 8080;
server.listen(port, '0.0.0.0', () => console.log('Amadeus 已启动：http://localhost:' + server.address().port));
