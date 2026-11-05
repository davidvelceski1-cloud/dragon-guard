/* Dragon Guard – configuration.
   Every tunable game constant lives here: layout, speeds, scoring, colours, endless tuning. */
window.DG = window.DG || {};

DG.CONFIG = {
  // Logical canvas size (9:16 portrait). Everything is drawn in these units and scaled to fit.
  W: 360,
  H: 640,

  // ---- Layout (logical px, top to bottom) ----
  LANES: 4,
  LANE_W: 90,
  HUD_H: 52,          // top bar: pause, level, score, hearts
  FIELD_TOP: 100,     // Royal Volley row sits between HUD_H and FIELD_TOP; dragons are targetable below it
  WALL_TOP: 466,      // top of the castle wall, where the family stands
  REACH_Y: 428,       // a dragon whose centre reaches this y has reached the family
  CANNON_TOP: 546,    // top of the cannon bar
  SPAWN_Y: 66,        // dragons appear here (hidden behind the HUD) and fly down
  DRAGON_SCALE: 1.15,

  // ---- Gameplay ----
  HEARTS: 3,
  BALL_SPEED: 950,          // cannonball speed, px/s
  WRONG_BOOST_MULT: 2.3,    // an angry dragon flies this many times faster...
  WRONG_BOOST_TIME: 1.4,    // ...for this many seconds
  VOLLEY_STREAK: 3,         // correct hits in a row needed for the Royal Volley
  START_DELAY: 1.6,         // seconds of "Level N" banner before the first dragon
  HINT_TIME: 6,             // seconds a level hint stays on screen
  END_DELAY_WIN: 1.4,       // pause before the result screen
  END_DELAY_FAIL: 1.3,

  SCORE: {
    layer: 10,           // every correct hit
    dragonPerLayer: 25,  // bonus for finishing a dragon, per armour layer it had
    volleyPerLayer: 15,  // per layer cleared by the Royal Volley
    heart: 100,          // end-of-level bonus per heart left
    ammo: 15             // end-of-level bonus per cannonball left
  },

  // ---- Colours: high-contrast hues + a unique symbol each, for colour-blind players ----
  COLOR_ORDER: ['red', 'blue', 'green', 'yellow'],
  COLORS: {
    red:    { name: 'Red',    main: '#e53935', light: '#ff8a80', dark: '#7f1717', belly: '#ffd9d2', symbol: 'flame' },
    blue:   { name: 'Blue',   main: '#1e88e5', light: '#90caf9', dark: '#0b3570', belly: '#d8ecff', symbol: 'drop' },
    green:  { name: 'Green',  main: '#43a047', light: '#a5d6a7', dark: '#184d1b', belly: '#dcf5d8', symbol: 'leaf' },
    yellow: { name: 'Yellow', main: '#fbc02d', light: '#fff59d', dark: '#7a5600', belly: '#fff8d6', symbol: 'star' }
  },

  // ---- Endless mode (after level 10) ----
  ENDLESS: {
    baseCount: 8, countPerWave: 2, maxCount: 30,      // dragons per wave
    baseSpeed: 42, speedPerWave: 5, maxSpeed: 110,    // px/s
    baseGap: 2.0, gapPerWave: 0.12, minGap: 0.65,     // seconds between spawns
    baseSpare: 3, minSpare: 0                         // extra ammo per colour, shrinks every 2 waves
  },

  FONT: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  STORAGE_KEY: 'dragonGuard.save.v1'
};
