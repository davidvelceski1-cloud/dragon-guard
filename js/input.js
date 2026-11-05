/* Dragon Guard – input: pointer events on the canvas, gesture blocking, desktop keys. */
(function () {
  'use strict';
  const C = DG.CONFIG;

  DG.Input = {
    init: function (canvas) {
      // Taps on the canvas -> logical coordinates -> game
      canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * C.W;
        const y = ((e.clientY - rect.top) / rect.height) * C.H;
        DG.Game.handleTap(x, y);
      });

      // Stop the browser from scrolling, zooming, double-tap zooming or opening menus
      canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
      document.addEventListener('touchmove', function (e) {
        if (!(e.target.closest && e.target.closest('.scroll'))) e.preventDefault();
      }, { passive: false });
      document.addEventListener('gesturestart', (e) => e.preventDefault());
      document.addEventListener('dblclick', (e) => e.preventDefault());
      document.addEventListener('contextmenu', (e) => e.preventDefault());

      // Audio may only start after a user gesture
      const unlock = () => DG.Audio.unlock();
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('touchend', unlock, true);
      window.addEventListener('keydown', unlock, true);

      // Desktop testing: 1-4 select cannon, Z X C V fire lanes, Space = volley, P / Esc = pause
      window.addEventListener('keydown', function (e) {
        const G = DG.Game;
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          if (G.state === 'paused') G.resume(); else G.pause();
          return;
        }
        if (G.state !== 'playing') return;
        const n = '1234'.indexOf(e.key);
        if (n >= 0) G.selectCannon(C.COLOR_ORDER[n]);
        const lane = 'zxcv'.indexOf(e.key.toLowerCase());
        if (lane >= 0) G.fire(lane);
        if (e.key === ' ') { e.preventDefault(); G.useVolley(); }
      });
    }
  };
})();
