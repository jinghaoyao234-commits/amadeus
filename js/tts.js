export class Speech {
  constructor(onSpeaking, onMouth) {
    this.onSpeaking = onSpeaking;
    this.onMouth = onMouth;
    this.engine = globalThis.speechSynthesis;
  }
  voices() {
    return this.engine?.getVoices() || [];
  }
  stop() {
    this.engine?.cancel();
    clearInterval(this.timer);
    this.onSpeaking(false);
    this.onMouth(0);
  }
  speak(text, settings) {
    if (!settings.tts || !this.engine || !text) return;
    this.stop();
    const utter = new SpeechSynthesisUtterance(text);
    const language = {
      '中文': 'zh-CN',
      '日本語': 'ja-JP',
      English: 'en-US'
    }[settings.language];
    utter.lang = language;
    utter.voice = this.voices().find(v => v.voiceURI === settings.voice) || this.voices().find(v => v.lang === language) || this.voices().find(v => /ja-JP|zh-CN/.test(v.lang)) || null;
    utter.rate = 1.02; // Speech synthesis exposes no audio samples; approximate mouth movement with a timer.
    utter.onstart = () => {
      this.onSpeaking(true);
      this.timer = setInterval(() => this.onMouth(Math.random()), 130);
    };
    utter.onboundary = () => this.onMouth(1);
    utter.onend = utter.onerror = () => {
      clearInterval(this.timer);
      this.onSpeaking(false);
      this.onMouth(0);
    };
    this.engine.speak(utter);
  }
}
