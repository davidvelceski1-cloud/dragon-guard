/* Dragon Guard – level data.
 *
 * Each level in LEVELS:
 *   name     – shown in the HUD and level banner
 *   speed    – dragon flight speed (logical px/s; the field is ~360px tall)
 *   ammo     – starting cannonballs per colour, e.g. { red: 6, blue: 6 }   ...OR...
 *   spare    – give each colour exactly what its dragons need + this many extra (0 = exact ammo puzzle)
 *   hint     – optional tip shown at the start
 *   dragons  – D(spawnTime, lane, layers)
 *                spawnTime: seconds after the level starts
 *                lane: 0..3 (left to right)
 *                layers: letters R B G Y, OUTERMOST FIRST. 'BR' = blue armour that turns red when hit.
 */
(function () {
  'use strict';
  const C = DG.CONFIG;
  const LETTER = { R: 'red', B: 'blue', G: 'green', Y: 'yellow' };

  function D(t, lane, layers) { return { t: t, lane: lane, layers: layers }; }

  const LEVELS = [
    // ---------- 1–2: tutorial – slow, single colour dragons, generous ammo ----------
    {
      name: 'First Flight', speed: 24, ammo: { red: 6, blue: 6 },
      hint: 'Tap a cannon to pick it, then tap a dragon\'s lane to fire. Match the colours!',
      dragons: [D(0, 1, 'R'), D(3, 2, 'R'), D(6, 0, 'B'), D(9, 3, 'B'), D(12, 1, 'R'), D(14.5, 2, 'B')]
    },
    {
      name: 'Four Colours', speed: 27, ammo: { red: 4, blue: 4, green: 4, yellow: 4 },
      hint: 'Every colour has a symbol: red flame, blue droplet, green leaf, yellow star.',
      dragons: [D(0, 0, 'G'), D(2.5, 3, 'Y'), D(5, 1, 'R'), D(7.5, 2, 'B'),
                D(10, 3, 'G'), D(12, 0, 'Y'), D(14, 2, 'R'), D(16, 1, 'B')]
    },

    // ---------- 3–5: more dragons, faster, tighter ammo ----------
    {
      name: 'Sky Patrol', speed: 32, spare: 2,
      hint: '3 correct hits in a row charge the Royal Volley at the top!',
      dragons: [D(0, 0, 'R'), D(1.8, 2, 'B'), D(3.6, 1, 'G'), D(5.2, 3, 'Y'), D(7, 0, 'B'),
                D(8.6, 3, 'R'), D(10.2, 2, 'G'), D(11.8, 1, 'Y'), D(13.2, 2, 'R'), D(14.6, 0, 'G')]
    },
    {
      name: 'Twin Wings', speed: 36, spare: 2,
      hint: 'Wrong colours make dragons angry, and much faster!',
      dragons: [D(0, 1, 'Y'), D(0, 2, 'R'), D(2.5, 0, 'B'), D(4, 3, 'G'), D(5.5, 1, 'R'), D(5.5, 0, 'Y'),
                D(7.5, 2, 'G'), D(9, 3, 'B'), D(10.5, 1, 'B'), D(10.5, 0, 'R'), D(12.5, 3, 'Y'), D(14, 1, 'G')]
    },
    {
      name: 'Ember Rush', speed: 40, spare: 1,
      hint: 'Ammo is tight. Watch the number on each cannon.',
      dragons: [D(0, 0, 'R'), D(1.2, 3, 'R'), D(2.4, 1, 'B'), D(3.6, 2, 'G'), D(4.8, 0, 'Y'),
                D(5.8, 3, 'B'), D(7, 1, 'G'), D(8, 2, 'R'), D(9.2, 3, 'Y'), D(10.2, 0, 'B'),
                D(11.2, 3, 'G'), D(12.2, 1, 'Y'), D(13.4, 2, 'R'), D(14.4, 1, 'B')]
    },

    // ---------- 6–8: armoured multi-layer dragons ----------
    {
      name: 'Armoured Scales', speed: 32, spare: 2,
      hint: 'Armoured dragons change colour when hit. Their rings show the colours still to come.',
      dragons: [D(0, 1, 'BR'), D(2.5, 2, 'G'), D(4.5, 0, 'RY'), D(6.5, 3, 'B'), D(8.5, 2, 'YG'),
                D(10, 1, 'R'), D(12, 3, 'GB'), D(13.5, 0, 'Y'), D(15, 2, 'RB'), D(17, 1, 'BG')]
    },
    {
      name: 'Shifting Shields', speed: 36, spare: 1,
      hint: 'Tip: the target ring spins fast when your cannon matches that dragon.',
      dragons: [D(0, 0, 'RB'), D(1.5, 3, 'GY'), D(3.5, 2, 'BR'), D(5, 1, 'Y'), D(6.5, 0, 'YG'),
                D(8, 3, 'RG'), D(9.5, 2, 'B'), D(11, 1, 'GR'), D(12.5, 0, 'BY'), D(14, 3, 'R'),
                D(15.5, 2, 'YB'), D(17, 1, 'GB')]
    },
    {
      name: 'Triple Scale', speed: 38, spare: 1,
      hint: 'Triple armour! Plan your shots carefully.',
      dragons: [D(0, 1, 'RBG'), D(2, 2, 'Y'), D(3.5, 3, 'BY'), D(5.5, 0, 'GRY'), D(7, 2, 'R'),
                D(9, 3, 'YGB'), D(10.5, 1, 'BR'), D(12, 0, 'G'), D(13.5, 2, 'BGR'), D(15.5, 3, 'RY'),
                D(17, 1, 'YRB'), D(19, 0, 'GB')]
    },

    // ---------- 9–10: fast waves, several lanes at once, exact ammo ----------
    {
      name: 'Storm Front', speed: 50, spare: 0,
      hint: 'Exact ammo: every shot counts! A Royal Volley saves cannonballs.',
      dragons: [D(0, 0, 'R'), D(0, 2, 'B'), D(2, 1, 'G'), D(2, 3, 'Y'), D(4.5, 0, 'BR'), D(4.5, 2, 'GY'),
                D(7, 1, 'R'), D(7, 2, 'Y'), D(7, 3, 'B'), D(9.5, 0, 'GR'), D(9.5, 3, 'YB'),
                D(12, 1, 'RG'), D(12, 2, 'B'), D(14, 0, 'Y'), D(14, 3, 'GB')]
    },
    {
      name: 'Dragonstorm', speed: 55, spare: 0,
      hint: 'The final wave. Good luck, Guardian!',
      dragons: [D(0, 0, 'RB'), D(0, 3, 'YG'), D(2, 1, 'G'), D(2, 2, 'B'), D(4.5, 1, 'BRY'),
                D(6, 0, 'R'), D(6, 3, 'Y'), D(6, 2, 'GB'), D(9, 0, 'YRG'), D(9, 1, 'B'),
                D(11, 3, 'RGB'), D(11, 2, 'G'), D(13.5, 1, 'BY'), D(13.5, 2, 'R'),
                D(15.5, 0, 'YBR'), D(15.5, 3, 'G')]
    }
  ];

  DG.LEVELS = LEVELS;

  /** Count how many layers of each colour a dragon list contains. */
  function countLayers(dragons) {
    const need = {};
    C.COLOR_ORDER.forEach((c) => (need[c] = 0));
    dragons.forEach((d) => d.layers.forEach((c) => need[c]++));
    return need;
  }
  DG.countLayers = countLayers;

  /** Turn a raw level entry into the runtime format: layer letters -> colour names, ammo resolved. */
  DG.buildLevel = function (raw) {
    const dragons = raw.dragons.map((d) => ({
      t: d.t,
      lane: d.lane,
      layers: d.layers.split('').map((ch) => LETTER[ch])
    }));
    const need = countLayers(dragons);
    const ammo = {};
    C.COLOR_ORDER.forEach((c) => {
      if (raw.ammo) ammo[c] = raw.ammo[c] || 0;
      else ammo[c] = need[c] > 0 ? need[c] + (raw.spare || 0) : 0;
    });
    return { name: raw.name, hint: raw.hint || null, speed: raw.speed, dragons: dragons, ammo: ammo };
  };

  DG.getLevel = (index) => DG.buildLevel(LEVELS[index]);

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /** Procedural endless wave: more dragons, faster, more armour and less spare ammo each wave. */
  DG.generateEndlessWave = function (wave) {
    const E = C.ENDLESS;
    const letters = 'RBGY';
    const count = Math.min(E.baseCount + wave * E.countPerWave, E.maxCount);
    const speed = Math.min(E.baseSpeed + wave * E.speedPerWave, E.maxSpeed);
    const maxLayers = wave < 2 ? 1 : wave < 4 ? 2 : 3;
    const gap = Math.max(E.minGap, E.baseGap - wave * E.gapPerWave);
    const multiChance = Math.min(0.6, 0.1 * wave);   // chance of several dragons at once

    const dragons = [];
    let t = 0;
    while (dragons.length < count) {
      const group = Math.random() < multiChance ? (wave >= 5 && Math.random() < 0.35 ? 3 : 2) : 1;
      const lanes = shuffle([0, 1, 2, 3]).slice(0, Math.min(group, count - dragons.length));
      lanes.forEach((lane) => {
        const n = 1 + Math.floor(Math.random() * maxLayers);
        let s = '';
        for (let i = 0; i < n; i++) s += letters[Math.floor(Math.random() * 4)];
        dragons.push(D(Math.round(t * 100) / 100, lane, s));
      });
      t += gap * (lanes.length > 1 ? 1.6 : 1);
    }

    return DG.buildLevel({
      name: 'Wave ' + wave,
      speed: speed,
      spare: Math.max(E.minSpare, E.baseSpare - Math.floor(wave / 2)),
      dragons: dragons
    });
  };
})();
