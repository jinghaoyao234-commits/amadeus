export const defaults = {
  baseUrl: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.8,
  tts: false,
  voice: '',
  language: '中文',
  nickname: '冈部',
  avatarMode: 'svg',
  modelUrl: '',
  contextLimit: 20,
  autoMemory: false
};
export function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(`amadeus:${key}`)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function write(key, value) {
  try {
    localStorage.setItem(`amadeus:${key}`, JSON.stringify(value));
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent('storage-error'));
    return false;
  }
}
export const getSettings = () => ({
  ...defaults,
  ...read('settings', {})
});
export function validateConversation(data) {
  if (!Array.isArray(data) || data.length > 10000 || !data.every(m => m && ['user', 'assistant', 'system'].includes(m.role) && typeof m.content === 'string' && m.content.length < 200000)) throw new Error('对话 JSON 格式无效。');
  return data.map(({
    role,
    content
  }) => ({
    role,
    content
  }));
}
