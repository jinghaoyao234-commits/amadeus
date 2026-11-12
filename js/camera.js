import { compressImage } from './image.js';
export function setupCamera(dialog, video, onPhoto, toast) {
  let facing = 'environment', version = 0;
  const stop = () => {
    version++;
    video.srcObject?.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    dialog.querySelector('[data-shutter]').disabled = true;
  };
  const close = () => { stop(); if (dialog.open) dialog.close(); };
  async function start() {
    stop();
    const current = version;
    try {
      if (!globalThis.isSecureContext) throw { name: 'InsecureContext' };
      if (!navigator.mediaDevices?.getUserMedia) throw { name: 'NotFoundError' };
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false }); }
      catch (error) {
        if (error.name !== 'OverconstrainedError' || current !== version) throw error;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (current !== version || !dialog.open || document.hidden) { stream.getTracks().forEach(t => t.stop()); return; }
      video.srcObject = stream;
      await video.play();
      if (current === version) dialog.querySelector('[data-shutter]').disabled = false;
    } catch (error) {
      if (current !== version) return;
      close();
      toast(({ InsecureContext: '摄像头需要在 HTTPS 页面使用（本机 localhost 除外）。请通过已部署的地址打开，或改用相册选图。', NotAllowedError: '没有摄像头权限。可在浏览器设置中允许，或改用相册选图。', NotFoundError: '没有找到摄像头，可改用相册选图。' })[error.name] || '无法打开摄像头，请稍后重试或改用相册选图。');
    }
  }
  dialog.querySelector('[data-shutter]').onclick = () => {
    try { const photo = compressImage(video, video.videoWidth, video.videoHeight); close(); onPhoto(photo); }
    catch (error) { toast(error.message); }
  };
  dialog.querySelector('[data-switch]').onclick = () => { facing = facing === 'environment' ? 'user' : 'environment'; start(); };
  dialog.querySelector('[data-cancel]').onclick = close;
  dialog.addEventListener('close', stop);
  dialog.addEventListener('cancel', stop);
  window.addEventListener('pagehide', close);
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  return () => { facing = 'environment'; dialog.showModal(); start(); };
}
