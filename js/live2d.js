// 可按模型的实际名称修改；优先尝试表情，再尝试动作组。
export const emotionMap = {
  neutral: ['Idle', 'Normal'],
  smile: ['Smile', 'Happy'],
  annoyed: ['Angry', 'Annoyed'],
  embarrassed: ['Blush', 'Shy'],
  surprised: ['Surprised'],
  thinking: ['Thinking'],
  sad: ['Sad']
};
const urls = [
  'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
  'https://cdn.jsdelivr.net/npm/pixi.js@7.4.3/dist/pixi.min.js',
  'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.5.0-beta/dist/cubism4.min.js'
];
function script(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => {
      el.remove();
      reject(new Error('运行库加载失败'));
    };
    document.head.append(el);
  });
}
let libraries;
export async function loadLive2D(host, url) {
  // Load dependent runtimes in order, sharing the promise and allowing retries.
  if (!libraries) libraries = (async () => {
    for (const src of urls) await script(src);
  })().catch(e => {
    libraries = null;
    throw e;
  });
  await libraries;
  const modelUrl = new URL(url, location.href);
  if (!['http:', 'https:'].includes(modelUrl.protocol)) throw new Error('模型地址无效');
  const app = new PIXI.Application({
    backgroundAlpha: 0,
    resizeTo: host,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(devicePixelRatio, 2)
  });
  let model;
  try {
    model = await PIXI.live2d.Live2DModel.from(modelUrl.href, {
      autoInteract: false
    });
  } catch (e) {
    app.destroy(true);
    throw e;
  }
  host.append(app.view);
  app.stage.addChild(model);
  const resize = () => {
    app.resize();
    model.scale.set(1);
    const scale = Math.min(host.clientWidth / model.width, host.clientHeight / model.height);
    model.scale.set(scale);
    model.anchor.set(.5, .5);
    model.position.set(host.clientWidth / 2, host.clientHeight / 2);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  // Apply mouth values before each model update so animation does not overwrite them.
  let mouth = 0;
  const core = model.internalModel.coreModel;
  const update = () => core.setParameterValueById('ParamMouthOpenY', mouth);
  model.internalModel.on('beforeModelUpdate', update);
  return {
    setMouth(v) {
      mouth = v;
    },
    setEmotion(emotion) {
      const names = emotionMap[emotion] || [];
      const defs = model.internalModel.settings.expressions || [];
      const expression = defs.find(e => names.some(n => n.toLowerCase() === e.Name?.toLowerCase()));
      if (expression) {
        Promise.resolve(model.expression(expression.Name)).catch(() => {});
        return;
      }
      const motions = model.internalModel.settings.motions || {};
      const group = Object.keys(motions).find(k => names.some(n => n.toLowerCase() === k.toLowerCase()));
      if (group) Promise.resolve(model.motion(group)).catch(() => {});
    },
    destroy() {
      observer.disconnect();
      app.destroy(true, {
        children: true
      });
    }
  };
}
