/* Dragon Guard – save data in localStorage.
   Every access is wrapped in try/catch: private mode or blocked storage just means no saving. */
(function () {
  'use strict';
  const C = DG.CONFIG;

  const defaults = () => ({
    unlocked: 1,      // highest level the player may start (1-based); > LEVELS.length unlocks endless
    best: {},         // { "3": { score: 1234, stars: 2 } }
    endlessBest: 0,
    endlessWave: 0,
    muted: false
  });

  const Save = (DG.Save = { data: defaults() });

  Save.load = function () {
    try {
      const raw = localStorage.getItem(C.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') Save.data = Object.assign(defaults(), parsed);
      }
    } catch (e) { /* storage unavailable or corrupt: keep defaults */ }

    // Sanitise in case the stored data was edited or is from an older version
    const d = Save.data;
    const maxUnlock = (DG.LEVELS ? DG.LEVELS.length : 10) + 1;
    d.unlocked = Math.max(1, Math.min(maxUnlock, parseInt(d.unlocked, 10) || 1));
    if (!d.best || typeof d.best !== 'object') d.best = {};
    d.endlessBest = Number(d.endlessBest) || 0;
    d.endlessWave = Number(d.endlessWave) || 0;
    d.muted = !!d.muted;
    return d;
  };

  Save.save = function () {
    try {
      localStorage.setItem(C.STORAGE_KEY, JSON.stringify(Save.data));
    } catch (e) { /* ignore */ }
  };
})();
