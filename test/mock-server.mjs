import http from 'node:http';
import { pathToFileURL } from 'node:url';
export const reply = '[emotion:annoyed]才、才不是在等你！今天也要好好休息。';
export function createMockServer() {
  let captured;
  const server = http.createServer(async (req, res) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers).end();
      return;
    }
    if (req.url === '/captured') {
      res.writeHead(200, {
        ...headers,
        'Content-Type': 'application/json'
      }).end(JSON.stringify(captured ?? null));
      return;
    }
    if (req.method !== 'POST' || !['/chat/completions', '/v1/chat/completions'].includes(req.url)) {
      res.writeHead(404, headers).end();
      return;
    }
    if (req.headers.authorization === 'Bearer bad') {
      res.writeHead(401, {
        ...headers,
        'Content-Type': 'application/json'
      }).end(JSON.stringify({
        error: {
          message: '模拟：无效的 API Key'
        }
      }));
      return;
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      captured = JSON.parse(body);
    } catch {
      res.writeHead(400, headers).end('JSON 无效');
      return;
    }
    if (!captured.stream) {
      res.writeHead(200, {
        ...headers,
        'Content-Type': 'application/json'
      }).end(JSON.stringify({
        choices: [{
          message: {
            content: '["用户正在测试 Amadeus"]'
          }
        }]
      }));
      return;
    }
    res.writeHead(200, {
      ...headers,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    });
    const events = ['[emo', 'tion:ann', 'oyed]才、才不是在等你！', '今天也要好好休息。'].map(content => 'data: ' + JSON.stringify({
      choices: [{
        delta: {
          content
        }
      }]
    }) + '\r\n\r\n').join('') + 'data: [DONE]\n\n';
    const bytes = Buffer.from(events),
      utf = bytes.indexOf(Buffer.from('才'));
    const cuts = [2, 13, utf + 1, utf + 2, utf + 5, bytes.length];
    let start = 0;
    for (const end of cuts) {
      if (res.destroyed) break;
      res.write(bytes.subarray(start, end));
      start = end;
      await new Promise(r => setTimeout(r, 12));
    }
    res.end();
  });
  return {
    server,
    get captured() {
      return captured;
    }
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createMockServer().server.listen(8787, '0.0.0.0', () => console.log('模拟接口：http://localhost:8787；Key 可填 test，bad 会返回 401'));
}
