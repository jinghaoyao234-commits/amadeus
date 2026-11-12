export const emotions = ['neutral', 'smile', 'annoyed', 'embarrassed', 'surprised', 'thinking', 'sad'];
export function inferEmotion(text) {
  const rules = [
    ['annoyed', /笨蛋|才不是|不要叫|ばか|助手じゃ|idiot|don't call/i],
    ['embarrassed', /脸红|掩饰|恥ずか|embarrass|@channel/i],
    ['sad', /难过|伤心|悲し|sorry|sad/i],
    ['surprised', /什么？！|竟然|まさか|驚|really\?!|wow/i],
    ['thinking', /记忆|意识|科学|仮説|memory|conscious|hypothesis/i],
    ['smile', /谢谢|开心|ありがとう|嬉し|thank|glad/i]
  ];
  return rules.find(([, re]) => re.test(text))?.[0] || 'neutral';
}
export function createEmotionParser(onEmotion = () => {}) {
  // Hold a possible leading emotion tag until it is complete or ruled out.
  let buffer = '',
    resolved = false,
    full = '',
    emotion = 'neutral',
    tagged = false;
  return {
    push(chunk, final = false) {
      if (resolved) {
        full += chunk;
        return chunk;
      }
      buffer += chunk;
      const match = buffer.match(/^\s*\[emotion:([a-z]+)\]/);
      if (match) {
        tagged = true;
        emotion = emotions.includes(match[1]) ? match[1] : 'neutral';
        onEmotion(emotion);
        buffer = buffer.slice(match[0].length).replace(/^\s+/, '');
        resolved = true;
      } else {
        const trimmed = buffer.trimStart();
        const possible = '[emotion:'.startsWith(trimmed) || /^\[emotion:[a-z]*$/.test(trimmed);
        if (final || buffer.length >= 40 || !possible) resolved = true;
      }
      if (!resolved) return '';
      const out = buffer;
      buffer = '';
      full += out;
      if (!tagged) {
        emotion = inferEmotion(full);
        onEmotion(emotion);
      }
      return out;
    },
    finish() {
      const out = this.push('', true);
      if (!tagged) onEmotion(inferEmotion(full));
      return out;
    },
    get emotion() {
      return emotion;
    }
  };
}
