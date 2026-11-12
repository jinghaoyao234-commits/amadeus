export function normalizeBaseUrl(value) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('API 地址需为有效的 HTTP(S) 地址，不能含账号、查询参数或片段。');
  return url.href.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
}
export class ApiError extends Error {
  constructor(status, body) {
    const labels = {
      401: 'API Key 错误或已失效',
      402: '余额不足，请充值',
      429: '请求过于频繁，请稍后重试'
    };
    super(`${labels[status] || `接口错误（${status}）`}：${body.slice(0, 800)}`);
    this.status = status;
  }
}
async function request({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature = 0.8,
  signal
}, stream) {
  let response;
  try {
    response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream
      }),
      signal
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error('无法连接接口：请检查网络、API 地址，以及服务端是否允许浏览器跨域访问（CORS）。');
  }
  if (!response.ok) throw new ApiError(response.status, await response.text());
  return response;
}
export async function streamChat(options, onChunk) {
  const response = await request(options, true);
  if (!response.body) throw new Error('接口未返回可读取的数据流。');
  // Decode UTF-8 incrementally and retain partial SSE lines between chunks.
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let pending = '',
    text = '',
    done = false;
  const line = value => {
    if (!value.startsWith('data:')) return;
    const data = value.slice(5).trim();
    if (!data) return;
    if (data === '[DONE]') {
      done = true;
      return;
    }
    let json;
    try {
      json = JSON.parse(data);
    } catch {
      throw new Error('接口返回了无法解析的 SSE 数据。');
    }
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    const content = json.choices?.[0]?.delta?.content;
    if (typeof content === 'string') {
      text += content;
      onChunk?.(content);
    }
  };
  try {
    while (!done) {
      const part = await reader.read();
      pending += decoder.decode(part.value, {
        stream: !part.done
      });
      let idx;
      while ((idx = pending.indexOf('\n')) >= 0) {
        line(pending.slice(0, idx).replace(/\r$/, ''));
        pending = pending.slice(idx + 1);
        if (done) break;
      }
      if (part.done) {
        if (pending.trim()) line(pending);
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return text;
}
export async function completeChat(options) {
  const response = await request(options, false);
  return (await response.json()).choices?.[0]?.message?.content || '';
}
