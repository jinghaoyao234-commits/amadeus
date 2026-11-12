export const DEFAULT_IMAGE_PROMPT = '请看看这张照片。';
export const IMAGE_REMOVED = '（图片已从本地记录中移除）';
export function supportsVision({ baseUrl = '', model = '' }) {
  const name = model.trim().toLowerCase();
  if (/deepseek/.test(name) || /api\.deepseek\.com/i.test(baseUrl)) return false;
  return /qwen[^/]*-vl|(?:^|\/)vl-(?:plus|max)|gpt-4o|gpt-4\.1|gpt-4-(?:turbo|vision)/.test(name);
}
export function resolveChatSettings(settings, hasImage) {
  if (!hasImage) return settings;
  if (settings.visionModel || settings.visionApiKey || settings.visionBaseUrl) return {
    ...settings,
    baseUrl: settings.visionBaseUrl || settings.baseUrl,
    apiKey: settings.visionApiKey || settings.apiKey,
    model: settings.visionModel || settings.model
  };
  return supportsVision(settings) ? settings : null;
}
export function messagePart(message, images = true) {
  return { role: message.role, content: images && message.role === 'user' && message.image ? [
    { type: 'text', text: message.content || DEFAULT_IMAGE_PROMPT },
    { type: 'image_url', image_url: { url: message.image } }
  ] : message.content };
}
export function validImage(value) {
  return typeof value === 'string' && value.length <= 2_000_000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
export function pruneImages(messages, maxImages = 2, budget = 1_400_000) {
  let count = 0, size = 0;
  return messages.map(m => ({ ...m })).reverse().map(m => {
    if (m.image) {
      if (count < maxImages && size + m.image.length <= budget) {
        count++; size += m.image.length;
      } else {
        delete m.image;
        m.content = [m.content, IMAGE_REMOVED].filter(Boolean).join('\n');
      }
    }
    return m;
  }).reverse();
}
export function compressImage(source, width, height) {
  if (!width || !height) throw new Error('图片尚未准备好，请稍后重试。');
  const scale = Math.min(1, 1024 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const result = canvas.toDataURL('image/jpeg', .8);
  if (!validImage(result)) throw new Error('图片过大，请选择较简单的图片。');
  return result;
}
export async function readPhoto(file) {
  if (!file.type.startsWith('image/') || file.size > 30_000_000) throw new Error('请选择 30 MB 以内的图片。');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url;
    await img.decode();
    return compressImage(img, img.naturalWidth, img.naturalHeight);
  } catch (error) {
    throw new Error('无法读取这张图片，请换一张照片。');
  } finally { URL.revokeObjectURL(url); }
}
