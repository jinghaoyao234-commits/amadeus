import { supportsVision, pruneImages, resolveChatSettings, messagePart, IMAGE_REMOVED } from '../js/image.js';
import { validateConversation } from '../js/storage.js';
import http from 'node:http';
import { emotionToVrmExpression } from '../js/vrm-emotion.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createEmotionParser, inferEmotion } from '../js/emotion.js';
import { normalizeBaseUrl, streamChat, ApiError } from '../js/api.js';
import { buildMessages } from '../js/persona.js';
import { createMockServer, reply } from './mock-server.mjs';
let count = 0;
function test(name, fn) {
  fn();
  count++;
  console.log('通过：' + name);
}
test('所有位置拆分的表情标签', () => {
  for (let i = 0; i < reply.length; i++) {
    let emotion;
    const parser = createEmotionParser(e => emotion = e);
    const text = parser.push(reply.slice(0, i)) + parser.push(reply.slice(i)) + parser.finish();
    assert.equal(text, reply.replace('[emotion:annoyed]', ''));
    assert.equal(emotion, 'annoyed');
  }
});
test('逐字符解析与缺失标签', () => {
  const p = createEmotionParser();
  let out = '';
  for (const c of '[emotion:smile]谢谢你') out += p.push(c);
  out += p.finish();
  assert.equal(out, '谢谢你');
  assert.equal(p.emotion, 'smile');
  const q = createEmotionParser();
  assert.equal(q.push('普通回复') + q.finish(), '普通回复');
});
test('多语言关键词推断', () => {
  assert.equal(inferEmotion('意识和记忆'), 'thinking');
  assert.equal(inferEmotion('ありがとう'), 'smile');
  assert.equal(inferEmotion('I am sad'), 'sad');
  assert.equal(inferEmotion('晴天'), 'neutral');
});
test('VRM 七种表情映射与中性重置', () => {
  assert.deepEqual(Object.keys(emotionToVrmExpression).sort(), ['neutral', 'smile', 'annoyed', 'embarrassed', 'surprised', 'thinking', 'sad'].sort());
  assert.deepEqual(emotionToVrmExpression.neutral, {});
  for (const [emotion, preset] of Object.entries({ smile: 'happy', annoyed: 'angry', sad: 'sad', surprised: 'surprised', thinking: 'relaxed' })) {
    assert.ok(emotionToVrmExpression[emotion][preset] > 0);
  }
  assert.ok(emotionToVrmExpression.embarrassed.happy < emotionToVrmExpression.smile.happy);
  for (const mapping of Object.values(emotionToVrmExpression)) {
    for (const [name, weight] of Object.entries(mapping)) {
      assert.ok(['happy', 'angry', 'sad', 'surprised', 'relaxed'].includes(name));
      assert.ok(weight > 0 && weight <= 1);
    }
  }
});
test('接口地址规范化', () => {
  assert.equal(normalizeBaseUrl('https://api.deepseek.com/'), 'https://api.deepseek.com');
  assert.equal(normalizeBaseUrl('https://api.openai.com/v1/'), 'https://api.openai.com/v1');
  assert.equal(normalizeBaseUrl('http://localhost:8787'), 'http://localhost:8787');
  assert.throws(() => normalizeBaseUrl('javascript:alert(1)'));
});
test('视觉模型识别与单轮接口路由', () => {
  for (const model of ['deepseek-chat', 'deepseek-reasoner', 'qwen-plus', 'qwen-turbo', 'qwen-max']) assert.equal(supportsVision({ baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model }), false);
  for (const model of ['qwen-vl-plus', 'qwen-vl-max', 'vl-plus', 'gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4-turbo', 'gpt-4-vision-preview']) assert.equal(supportsVision({ model }), true);
  const main = { baseUrl: 'https://api.deepseek.com', apiKey: 'local-test', model: 'deepseek-chat' };
  assert.equal(resolveChatSettings(main, true), null);
  const mixed = { ...main, visionBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', visionModel: 'qwen-vl-plus' };
  assert.equal(resolveChatSettings(mixed, false), mixed);
  assert.equal(resolveChatSettings(mixed, true).apiKey, main.apiKey);
  assert.equal(resolveChatSettings(mixed, true).model, 'qwen-vl-plus');
  assert.equal(normalizeBaseUrl(mixed.visionBaseUrl + '/'), mixed.visionBaseUrl);
});
const testImage = 'data:image/jpeg;base64,YWJj';
test('图片历史数量与大小限制、导入校验及纯文字消息', () => {
  const input = ['旧', '中', '新'].map(content => ({ role: 'user', content, image: testImage }));
  const pruned = pruneImages(input);
  assert.equal(pruned[0].image, undefined);
  assert.equal(pruned[0].content, '旧\n' + IMAGE_REMOVED);
  assert.equal(pruned[1].image, testImage);
  assert.equal(pruned[2].image, testImage);
  assert.equal(input[0].image, testImage);
  assert.equal(pruneImages(input, 2, testImage.length)[1].image, undefined);
  assert.equal(pruneImages(input, 0)[2].image, undefined);
  assert.deepEqual(messagePart(input[0], false), { role: 'user', content: '旧' });
  assert.equal(validateConversation(input)[0].image, undefined);
  assert.deepEqual(validateConversation([{ role: 'user', content: '纯文字' }]), [{ role: 'user', content: '纯文字' }]);
  assert.throws(() => validateConversation([{ role: 'user', content: '', image: 'https://invalid' }]));
  assert.throws(() => validateConversation([{ role: 'user', content: '', image: 'data:image/jpeg;base64,' + 'A'.repeat(2_000_000) }]));
});
// Launch the real server on an OS-assigned port and preserve raw request paths.
async function testStaticServer() {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], {
    env: {
      ...process.env,
      PORT: '0'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const exited = new Promise(resolve => child.once('close', resolve));
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => {
    stderr += chunk;
  });
  try {
    const port = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('静态服务器启动超时：' + stderr)), 10000);
      const fail = error => {
        clearTimeout(timeout);
        reject(error);
      };
      child.once('error', fail);
      child.once('exit', code => fail(new Error(`静态服务器退出（${code}）：${stderr}`)));
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/localhost:(\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(Number(match[1]));
        }
      });
    });
    const get = requestPath => new Promise((resolve, reject) => {
      // Unlike fetch(), http.get() does not normalize /../ before sending it.
      const request = http.get({
        host: '127.0.0.1',
        port,
        path: requestPath
      }, response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          body += chunk;
        });
        response.on('error', reject);
        response.on('end', () => resolve({
          status: response.statusCode,
          headers: response.headers,
          body
        }));
      });
      request.on('error', reject);
      request.setTimeout(5000, () => request.destroy(new Error('静态文件请求超时')));
    });
    const home = await get('/');
    assert.equal(home.status, 200);
    assert.match(home.headers['content-type'], /text\/html/);
    assert.match(home.body, /<!doctype html>/i);
    assert.match(home.body, /type="importmap"/);
    assert.match(home.body, /value="vrm"/);
    const importmap = JSON.parse(home.body.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
    assert.match(importmap.imports.three, /three@0\.177\.0/);
    assert.match(importmap.imports['@pixiv/three-vrm'], /three-vrm@3\.4\.2/);
    const vrm = await get('/js/vrm.js');
    assert.equal(vrm.status, 200);
    assert.match(vrm.headers['content-type'], /javascript/);
    const script = await get('/js/app.js');
    assert.equal(script.status, 200);
    assert.match(script.headers['content-type'], /javascript/);
    assert.match(script.body, /import /);
    for (const requestPath of ['/../etc/passwd', '/.git/config', '/%2e%2e/etc/passwd', '/%2egit/config']) {
      const response = await get(requestPath);
      assert.ok([403, 404].includes(response.status), `${requestPath}: ${response.status}`);
    }
    count++;
    console.log('通过：静态服务器根目录、脚本与路径保护');
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await exited;
  }
}
await testStaticServer();
const mock = createMockServer();
await new Promise((resolve, reject) => {
  mock.server.once('error', reject);
  mock.server.listen(8787, '127.0.0.1', resolve);
});
try {
  const messages = buildMessages({
    nickname: '冈部',
    language: '中文',
    contextLimit: 20
  }, [{
    role: 'user',
    content: '你好'
  }], []);
  const options = {
    baseUrl: 'http://localhost:8787',
    apiKey: 'test',
    model: 'mock-model',
    messages,
    temperature: .7
  };
  let assembled = '';
  const result = await streamChat(options, c => assembled += c);
  assert.equal(result, reply);
  assert.equal(assembled, reply);
  assert.equal(mock.captured.model, 'mock-model');
  assert.equal(mock.captured.messages[0].role, 'system');
  assert.deepEqual(mock.captured.messages, messages);
  assert.equal(mock.captured.stream, true);
  count++;
  console.log('通过：真实 SSE、拆分 UTF-8 与请求体');
  const imageMessages = buildMessages({ nickname: '冈部', language: '中文', contextLimit: 20 }, [{ role: 'user', content: '看看这个', image: testImage }], []);
  await streamChat({ ...options, model: 'qwen-vl-plus', messages: imageMessages });
  assert.equal(mock.captured.model, 'qwen-vl-plus');
  assert.equal(mock.captured.stream, true);
  assert.deepEqual(mock.captured.messages.at(-1), { role: 'user', content: [
    { type: 'text', text: '看看这个' },
    { type: 'image_url', image_url: { url: testImage } }
  ] });
  assert.equal(messagePart({ role: 'user', content: '', image: testImage }).content[0].text, '请看看这张照片。');
  count++;
  console.log('通过：多模态 SSE 请求体与视觉模型');
  await assert.rejects(() => streamChat({
    ...options,
    apiKey: 'bad'
  }), e => e instanceof ApiError && e.status === 401 && /API Key 错误/.test(e.message) && /无效/.test(e.message));
  count++;
  console.log('通过：401 错误正文映射');
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(() => streamChat({
    ...options,
    signal: abort.signal
  }), e => e.name === 'AbortError');
  count++;
  console.log('通过：终止请求');
} finally {
  await new Promise(r => mock.server.close(r));
}
console.log(`全部 ${count} 项测试通过。`);
