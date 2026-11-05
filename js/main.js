/* Dragon Guard – boot, responsive layout (letterbox + devicePixelRatio), orientation and the game loop. */
(function () {
  'use strict';
  const C = DG.CONFIG;
  const frame = document.getElementById('frame');
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('game');
  const rotateEl = document.getElementById('rotate');
  const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;

  /** Fit the 9:16 stage inside the safe area (#frame), letterboxing the rest. */
  function layout() {
    const fw = frame.clientWidth, fh = frame.clientHeight;
    if (!fw || !fh) return;
    const scale = Math.min(fw / C.W, fh / C.H);
    const w = Math.max(1, Math.floor(C.W * scale));
    const h = Math.max(1, Math.floor(C.H * scale));
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    stage.style.setProperty('--u', (w / C.W) + 'px');   // 1 logical px, used by the overlays
    DG.Render.resize(w, h);
    checkOrientation();
  }

  /** On touch devices held sideways, show "Please rotate" and pause. */
  function checkOrientation() {
    const isTouch = (coarse && coarse.matches) || 'ontouchstart' in window;
    const landscape = window.innerWidth > window.innerHeight;
    const show = isTouch && landscape;
    rotateEl.classList.toggle('show', show);
    if (show) DG.Game.pause();
  }

  // Fixed-rate rendering via requestAnimationFrame; all movement uses delta time
  let last = 0;
  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.05) dt = 0.05;            // clamp after tab switches / hiccups
    DG.Game.update(dt);
    DG.Render.draw(DG.Game, DG.Game.state === 'paused' ? 0 : dt);
    requestAnimationFrame(loop);
  }

  function boot() {
    DG.Save.load();
    DG.Audio.setMuted(DG.Save.data.muted);
    DG.Render.init(canvas);
    DG.Input.init(canvas);
    DG.UI.init();
    DG.Game.initMenu();
    layout();
    DG.UI.show('title');
    requestAnimationFrame((t) => { last = t; loop(t); });
  }

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 200));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', layout);
  document.addEventListener('visibilitychange', () => { if (document.hidden) DG.Game.pause(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
