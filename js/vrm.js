import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { emotionToVrmExpression } from './vrm-emotion.js';
export { emotionToVrmExpression } from './vrm-emotion.js';

export async function loadVRM(host, source, { signal, onError = () => {} } = {}) {
  let objectUrl, renderer, vrm, root, observer, frame, destroyed = false;
  const abort = new AbortController();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .01, 100);
  const clock = new THREE.Clock();
  let elapsed = 0, nextBlink = 3 + Math.random() * 3, blinkStart = -1;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    abort.abort();
    signal?.removeEventListener('abort', destroy);
    cancelAnimationFrame(frame);
    observer?.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    renderer?.domElement.removeEventListener('webglcontextlost', contextLost);
    if (root) VRMUtils.deepDispose(root);
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
  const contextLost = event => {
    event.preventDefault();
    destroy();
    onError(new Error('WebGL 上下文丢失，请重新加载模型'));
  };
  const visibility = () => {
    cancelAnimationFrame(frame);
    clock.stop();
    if (!document.hidden && !destroyed) {
      clock.start();
      frame = requestAnimationFrame(tick);
    }
  };
  const expression = (name, value) => vrm?.expressionManager?.setValue(name, value);
  let bones = [];
  function tick() {
    if (destroyed || document.hidden) return;
    const delta = Math.min(clock.getDelta(), .05);
    elapsed += delta;
    for (const [bone, base, amount] of bones) {
      bone.rotation.copy(base);
      bone.rotation.x += Math.sin(elapsed * 1.7) * amount;
      bone.rotation.z += Math.sin(elapsed * .7) * amount * .6;
    }
    if (elapsed >= nextBlink && blinkStart < 0) blinkStart = elapsed;
    let blink = 0;
    if (blinkStart >= 0) {
      blink = Math.max(0, 1 - Math.abs((elapsed - blinkStart) / .09 - 1));
      if (elapsed - blinkStart > .18) {
        blinkStart = -1;
        nextBlink = elapsed + 3 + Math.random() * 3;
      }
    }
    if (vrm.expressionManager?.getExpression('blink')) expression('blink', blink);
    else {
      expression('blinkLeft', blink);
      expression('blinkRight', blink);
    }
    try {
      vrm.update(delta);
      renderer.render(scene, camera);
    } catch {
      destroy();
      onError(new Error('WebGL 渲染失败，模型可能不兼容'));
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  signal?.addEventListener('abort', destroy, { once: true });
  try {
    if (signal?.aborted) destroy();
    if (destroyed) throw new DOMException('已取消', 'AbortError');
    let url;
    if (source instanceof Blob || source instanceof ArrayBuffer) {
      objectUrl = URL.createObjectURL(source instanceof Blob ? source : new Blob([source]));
      url = new URL(objectUrl);
    } else url = new URL(source, location.href);
    if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('模型地址只支持 HTTP(S) 或本地文件');
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      throw new Error('设备无法启用 WebGL');
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    const response = await fetch(url.href, { signal: abort.signal });
    if (!response.ok) throw new Error(`模型请求失败（HTTP ${response.status}）`);
    const buffer = await response.arrayBuffer();
    if (destroyed) throw new DOMException('已取消', 'AbortError');
    const loader = new GLTFLoader();
    loader.register(parser => new VRMLoaderPlugin(parser));
    let gltf;
    try {
      gltf = await loader.parseAsync(buffer, new URL('.', url.protocol === 'blob:' ? location.href : url.href).href);
    } catch {
      throw new Error('VRM 文件无效、资源缺失或模型版本不兼容');
    }
    root = gltf.scene;
    if (destroyed) {
      VRMUtils.deepDispose(root);
      root = null;
      throw new DOMException('已取消', 'AbortError');
    }
    vrm = gltf.userData.vrm;
    if (!vrm) throw new Error('文件不是有效的 VRM 模型');
    VRMUtils.rotateVRM0(vrm);
    VRMUtils.combineSkeletons?.(vrm.scene);
    VRMUtils.combineMorphs?.(vrm);
    vrm.scene.traverse(node => node.frustumCulled = false);
    const bone = name => vrm.humanoid?.getNormalizedBoneNode(name);
    for (const [name, angle] of [['leftUpperArm', -1.25], ['rightUpperArm', 1.25]]) {
      const arm = bone(name);
      if (arm) arm.rotation.z = angle;
    }
    for (const name of ['leftLowerArm', 'rightLowerArm']) {
      const arm = bone(name);
      if (arm) arm.rotation.y = name === 'leftLowerArm' ? -.12 : .12;
    }
    bones = [['spine', .012], ['chest', .018], ['head', .008]].flatMap(([name, amount]) => {
      const node = bone(name);
      return node ? [[node, node.rotation.clone(), amount]] : [];
    });
    scene.add(vrm.scene, new THREE.HemisphereLight(0xffffff, 0x777788, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(1, 2, 3);
    scene.add(light);
    vrm.update(0);
    vrm.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(vrm.scene);
    const height = bounds.max.y - bounds.min.y;
    if (!Number.isFinite(height) || height <= 0) throw new Error('模型尺寸无效');
    const head = bone('head')?.getWorldPosition(new THREE.Vector3());
    const target = new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, (head?.y ?? bounds.max.y - height * .12) - height * .14, 0);
    const resize = () => {
      const width = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1);
      camera.aspect = width / h;
      const distance = height * .58 / (2 * Math.tan(THREE.MathUtils.degToRad(16))) * Math.max(1, .65 / camera.aspect);
      camera.position.set(target.x, target.y, distance);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      renderer.setSize(width, h);
    };
    resize();
    if (vrm.lookAt) vrm.lookAt.target = camera;
    observer = new ResizeObserver(resize);
    observer.observe(host);
    host.append(renderer.domElement);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return {
      setMouth(value) { expression('aa', Math.max(0, Math.min(1, Number(value) || 0))); },
      setEmotion(emotion) {
        for (const name of ['happy', 'angry', 'sad', 'surprised', 'relaxed']) expression(name, 0);
        for (const [name, value] of Object.entries(emotionToVrmExpression[emotion] || {})) expression(name, value);
      },
      destroy
    };
  } catch (error) {
    destroy();
    if (error.name === 'AbortError') throw error;
    throw new Error(error instanceof TypeError ? '网络或 CORS 错误，请检查 HTTPS 地址或导入本地文件' : error.message || 'VRM 文件解析失败');
  }
}
