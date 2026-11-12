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
  vrmUrl: '',
  vrmLocalName: '',
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

function modelStore(mode, action) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('amadeus-models', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('models');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      let result;
      const transaction = db.transaction('models', mode);
      const operation = action(transaction.objectStore('models'));
      operation.onsuccess = () => result = operation.result;
      transaction.oncomplete = () => { db.close(); resolve(result); };
      transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error || new Error('本地模型存储失败')); };
    };
  });
}
export const getLocalVRM = () => modelStore('readonly', store => store.get('vrm'));
export const saveLocalVRM = file => modelStore('readwrite', store => store.put({ blob: file, name: file.name }, 'vrm'));
export const clearLocalVRM = () => modelStore('readwrite', store => store.delete('vrm'));
