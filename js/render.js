/* Dragon Guard – rendering.
   Everything is drawn with canvas paths and gradients in logical 360x640 units. No images. */
(function () {
  'use strict';
  const C = DG.CONFIG;
  const R = (DG.Render = {});
  const TAU = Math.PI * 2;

  let canvas, ctx;
  let kx = 1, ky = 1;          // logical -> device pixel scale
  const grads = {};            // cached gradients
  const clouds = [];

  R.init = function (cv) {
    canvas = cv;
    ctx = cv.getContext('2d');
    for (let i = 0; i < 6; i++) {
      clouds.push({ x: Math.random() * C.W, y: 120 + Math.random() * 240, s: 0.5 + Math.random() * 0.7, v: 3 + Math.random() * 7 });
    }
  };

  /** Size the backing store for devicePixelRatio so graphics stay crisp. */
  R.resize = function (cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    kx = canvas.width / C.W;
    ky = canvas.height / C.H;
  };

  // ================================================================ helpers
  function rr(x, y, w, h, r) {            // rounded-rect path
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function ellipse(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }

  function text(str, x, y, size, color, align, outline, weight) {
    ctx.font = (weight || '800') + ' ' + size + 'px ' + C.FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    if (outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, size / 5);
      ctx.strokeStyle = outline;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function wrapLines(str, maxW) {
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function heartPath(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.7, y - s * 1.3, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.3, x + s * 1.6, y - s * 0.1, x, y + s * 0.9);
    ctx.closePath();
  }

  // ---- colour symbols: flame, droplet, leaf, star (centred, radius ~s) ----
  function symbolPath(type, s) {
    ctx.beginPath();
    if (type === 'flame') {
      ctx.moveTo(0, s);
      ctx.bezierCurveTo(-s * 0.85, s, -s * 0.85, s * 0.1, -s * 0.4, -s * 0.35);
      ctx.quadraticCurveTo(-s * 0.35, 0, -s * 0.1, s * 0.1);
      ctx.quadraticCurveTo(-s * 0.3, -s * 0.6, s * 0.15, -s);
      ctx.quadraticCurveTo(s * 0.1, -s * 0.45, s * 0.45, -s * 0.3);
      ctx.bezierCurveTo(s * 0.95, s * 0.1, s * 0.75, s, 0, s);
    } else if (type === 'drop') {
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.35, -s * 0.45, s * 0.72, -s * 0.05, s * 0.72, s * 0.3);
      ctx.arc(0, s * 0.3, s * 0.72, 0, Math.PI, false);
      ctx.bezierCurveTo(-s * 0.72, -s * 0.05, -s * 0.35, -s * 0.45, 0, -s);
    } else if (type === 'leaf') {
      ctx.moveTo(-s * 0.7, s * 0.7);
      ctx.quadraticCurveTo(-s * 0.85, -s * 0.65, s * 0.8, -s * 0.8);
      ctx.quadraticCurveTo(s * 0.65, s * 0.85, -s * 0.7, s * 0.7);
    } else { // star
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.45 : s;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
    }
    ctx.closePath();
  }

  function drawSymbol(type, x, y, s, fill) {
    ctx.save();
    ctx.translate(x, y);
    symbolPath(type, s);
    ctx.fillStyle = fill;
    ctx.fill();
    if (type === 'leaf') {                  // vein + stem
      ctx.strokeStyle = fill;
      ctx.lineWidth = Math.max(1, s * 0.18);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, s * 0.95);
      ctx.lineTo(-s * 0.6, s * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCrown(x, y, s) {             // y = bottom of the crown
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#ffca28';
    ctx.strokeStyle = '#a87400';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, 0); ctx.lineTo(-9, -8); ctx.lineTo(-4.5, -4); ctx.lineTo(0, -10);
    ctx.lineTo(4.5, -4); ctx.lineTo(9, -8); ctx.lineTo(9, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e53935'; circle(0, -3, 1.6); ctx.fill();
    ctx.fillStyle = '#1e88e5'; circle(-5.5, -2.5, 1.2); ctx.fill(); circle(5.5, -2.5, 1.2); ctx.fill();
    ctx.restore();
  }

  // ================================================================ scenery
  const FAR_HILLS = [[0, 400], [40, 362], [85, 395], [140, 340], [200, 390], [250, 352], [300, 385], [360, 345], [360, 470], [0, 470]];
  const NEAR_HILLS = [[0, 430], [60, 405], [120, 428], [190, 400], [260, 430], [320, 408], [360, 425], [360, 470], [0, 470]];

  function poly(points) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ellipse(x, y, 30 * s, 12 * s); ctx.fill();
    ellipse(x - 18 * s, y + 3 * s, 18 * s, 9 * s); ctx.fill();
    ellipse(x + 16 * s, y - 5 * s, 20 * s, 11 * s); ctx.fill();
  }

  function drawSky(t, dt) {
    if (!grads.sky) {
      const g = ctx.createLinearGradient(0, 0, 0, C.CANNON_TOP);
      g.addColorStop(0, '#24154f');
      g.addColorStop(0.45, '#6a3d8f');
      g.addColorStop(0.78, '#e8879a');
      g.addColorStop(1, '#ffd29a');
      grads.sky = g;
      const s = ctx.createRadialGradient(270, 330, 6, 270, 330, 80);
      s.addColorStop(0, 'rgba(255,240,200,0.95)');
      s.addColorStop(0.35, 'rgba(255,210,150,0.5)');
      s.addColorStop(1, 'rgba(255,200,150,0)');
      grads.sun = s;
    }
    ctx.fillStyle = grads.sky;
    ctx.fillRect(0, 0, C.W, C.H);

    // twinkling stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 24; i++) {
      ctx.globalAlpha = 0.3 + 0.25 * Math.sin(t * 2 + i * 1.7);
      ctx.fillRect((i * 97.3) % C.W, 18 + ((i * 53.7) % 180), 1.6, 1.6);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = grads.sun;
    ctx.fillRect(180, 240, 180, 180);

    ctx.fillStyle = '#5b3a7a'; poly(FAR_HILLS); ctx.fill();
    ctx.fillStyle = '#41295f'; poly(NEAR_HILLS); ctx.fill();

    for (const c of clouds) {
      c.x += c.v * dt;
      if (c.x - 60 * c.s > C.W) c.x = -60 * c.s;
      drawCloud(c.x, c.y, c.s);
    }
  }

  function drawLanes(t) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.lineDashOffset = -t * 20;
    for (let i = 1; i < C.LANES; i++) {
      const x = i * C.LANE_W;
      ctx.beginPath();
      ctx.moveTo(x, C.FIELD_TOP);
      ctx.lineTo(x, C.WALL_TOP - 14);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ================================================================ castle & family
  const ROYALS = [
    { x: 112, kind: 'king', robe: '#7b1fa2' },
    { x: 180, kind: 'child', robe: '#00897b' },
    { x: 248, kind: 'queen', robe: '#d81b60' }
  ];

  function drawRoyal(p, base, bob, scared) {
    const s = p.kind === 'child' ? 0.8 : 1;
    ctx.save();
    ctx.translate(p.x, base);
    ctx.scale(s, s);
    ctx.translate(0, bob);

    // queen's long hair sits behind everything
    if (p.kind === 'queen') { ctx.fillStyle = '#8d5524'; ellipse(0, -29, 12, 14); ctx.fill(); }

    // robe
    ctx.fillStyle = p.robe;
    ctx.beginPath();
    ctx.moveTo(-14, 0); ctx.lineTo(-8, -24); ctx.lineTo(8, -24); ctx.lineTo(14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(-1.5, -22, 3, 22);
    // ermine collar
    ctx.fillStyle = '#fff'; ellipse(0, -23, 10, 4); ctx.fill();
    ctx.fillStyle = '#222';
    [-5, 0, 5].forEach((dx) => ctx.fillRect(dx - 0.6, -24, 1.2, 2));

    // hands (raised when scared)
    ctx.fillStyle = '#f5c39a';
    const hy = scared ? -27 : -10;
    circle(-12, hy, 2.6); ctx.fill();
    circle(12, hy, 2.6); ctx.fill();

    // king's sceptre
    if (p.kind === 'king' && !scared) {
      ctx.strokeStyle = '#c8a200';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(12, -8); ctx.lineTo(16, -34); ctx.stroke();
      ctx.fillStyle = '#ffca28'; circle(16, -36, 3); ctx.fill();
      ctx.fillStyle = '#e53935'; circle(16, -36, 1.4); ctx.fill();
    }

    // head
    ctx.fillStyle = '#f7c9a0'; circle(0, -33, 9); ctx.fill();
    // hair / beard
    if (p.kind === 'king') {
      ctx.fillStyle = '#6d4c41';
      ellipse(0, -26.5, 7.5, 4.5); ctx.fill();
    } else {
      ctx.fillStyle = p.kind === 'queen' ? '#8d5524' : '#e08a2c';
      ctx.beginPath(); ctx.arc(0, -34, 9.4, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    }
    // eyes
    for (const sx of [-3.2, 3.2]) {
      if (scared) {
        ctx.fillStyle = '#fff'; circle(sx, -34, 2.2); ctx.fill();
        ctx.fillStyle = '#2b1b1b'; circle(sx, -34, 1.1); ctx.fill();
      } else {
        ctx.fillStyle = '#2b1b1b'; circle(sx, -34, 1.3); ctx.fill();
      }
    }
    // mouth
    ctx.strokeStyle = '#7a3a2a';
    ctx.fillStyle = '#7a3a2a';
    ctx.lineWidth = 1.2;
    if (scared) { ellipse(0, -29, 1.8, 2.2); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, -31, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    // blush
    ctx.fillStyle = 'rgba(255,120,120,0.45)';
    circle(-5.5, -31, 1.8); ctx.fill(); circle(5.5, -31, 1.8); ctx.fill();

    drawCrown(0, -40, p.kind === 'king' ? 1 : p.kind === 'queen' ? 0.8 : 0.7);
    ctx.restore();
  }

  function drawCastle(t, run) {
    const top = C.WALL_TOP, bot = C.CANNON_TOP;

    // corner towers with waving flags
    for (const side of [0, 1]) {
      const x = side ? C.W - 34 : 0;
      ctx.fillStyle = '#6f6a8e';
      ctx.fillRect(x, top - 56, 34, bot - top + 56);
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 2 + i * 11, top - 64, 8, 8);
      ctx.fillStyle = '#2a1d45'; rr(x + 11, top - 40, 12, 18, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,100,0.6)'; rr(x + 13, top - 37, 8, 13, 4); ctx.fill();

      const px = x + 17, dir = side ? -1 : 1, w = Math.sin(t * 5 + side);
      ctx.strokeStyle = '#3b2f2f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, top - 64); ctx.lineTo(px, top - 92); ctx.stroke();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(px, top - 92);
      ctx.quadraticCurveTo(px + dir * 10, top - 92 + w * 2, px + dir * 20, top - 86 + w * 3);
      ctx.quadraticCurveTo(px + dir * 10, top - 82 + w * 2, px, top - 80);
      ctx.closePath();
      ctx.fill();
    }

    // battlements behind the family
    ctx.fillStyle = '#7d789d';
    for (let x = 36; x < C.W - 36; x += 26) ctx.fillRect(x, top - 12, 16, 14);

    // the royal family
    const scared = !!(run && run.flinch > 0);
    ROYALS.forEach((p, i) => {
      const bob = scared ? Math.sin(t * 40 + i) * 1.2 : Math.sin(t * 2.2 + i * 1.3) * 1.2;
      drawRoyal(p, top + 2, bob, scared);
    });

    // wall
    if (!grads.wall) {
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, '#8f8ab0');
      g.addColorStop(1, '#57527a');
      grads.wall = g;
    }
    ctx.fillStyle = grads.wall;
    ctx.fillRect(0, top, C.W, bot - top);
    ctx.fillStyle = '#a7a2c8';
    ctx.fillRect(0, top, C.W, 4);
    ctx.strokeStyle = 'rgba(30,20,60,0.25)';
    ctx.lineWidth = 1;
    for (let row = 0, y = top + 4; y < bot; y += 13, row++) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(C.W, y); ctx.stroke();
      for (let x = (row % 2) * 15; x < C.W; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, Math.min(y + 13, bot)); ctx.stroke();
      }
    }
  }

  // ================================================================ dragons
  function drawDragon(d, t) {
    if (!d.layers.length) return;
    const col = C.COLORS[d.layers[0]];
    const angry = d.boost > 0;
    const flap = Math.sin(t * (angry ? 20 : 10) + d.phase);
    const sway = Math.sin(t * 3 + d.phase);

    ctx.save();
    ctx.translate(d.x + (angry ? Math.sin(t * 50) * 1.5 : 0), d.y + sway * 2);
    ctx.scale(C.DRAGON_SCALE, C.DRAGON_SCALE);

    // Armour rings: one per layer still to come (innermost ring = next colour)
    for (let i = d.layers.length - 1; i >= 1; i--) {
      const rc = C.COLORS[d.layers[i]];
      const rad = 24 + i * 6;
      ctx.save();
      ctx.strokeStyle = rc.main;
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = t * 12 * (i % 2 ? 1 : -1);
      circle(0, 0, rad);
      ctx.stroke();
      ctx.restore();
      // symbol pip so the ring is readable without colour vision
      const a = t * 0.8 * (i % 2 ? 1 : -1) + i * 2.1 - Math.PI / 2;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      ctx.fillStyle = rc.main; circle(px, py, 6); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      drawSymbol(rc.symbol, px, py, 4, '#fff');
    }

    // tail
    ctx.strokeStyle = col.dark;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const tx = 17 + sway * 4, ty = 29;
    ctx.beginPath(); ctx.moveTo(5, 14); ctx.quadraticCurveTo(18, 18 + sway * 2, tx, ty); ctx.stroke();
    ctx.fillStyle = col.dark;
    ctx.beginPath(); ctx.moveTo(tx - 5, ty - 1); ctx.lineTo(tx + 5, ty - 1); ctx.lineTo(tx, ty + 7); ctx.closePath(); ctx.fill();

    // flapping wings
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * 9, -1);
      ctx.rotate(s * (-0.2 + flap * 0.4));
      ctx.scale(s, 1);
      ctx.fillStyle = col.dark;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(12, -24, 33, -20);
      ctx.quadraticCurveTo(29, -11, 31, -3);
      ctx.quadraticCurveTo(24, -6, 21, 2);
      ctx.quadraticCurveTo(14, -1, 9, 9);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = col.light;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.quadraticCurveTo(14, -18, 28, -17);
      ctx.quadraticCurveTo(25, -10, 27, -5);
      ctx.quadraticCurveTo(20, -7, 18, 0);
      ctx.quadraticCurveTo(13, -2, 9, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // body + belly with the colour symbol
    ctx.fillStyle = col.main; ellipse(0, 6, 15, 14); ctx.fill();
    ctx.strokeStyle = col.dark; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = col.belly; ellipse(0, 8, 10, 9); ctx.fill();
    drawSymbol(col.symbol, 0, 8, 6.5, col.dark);
    ctx.fillStyle = col.dark;
    ellipse(-8, 19, 5, 3.5); ctx.fill();
    ellipse(8, 19, 5, 3.5); ctx.fill();

    // horns and ear frills
    ctx.fillStyle = '#fff1cf';
    ctx.strokeStyle = col.dark;
    ctx.lineWidth = 1.2;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 5, -22); ctx.lineTo(s * 11, -33); ctx.lineTo(s * 11, -20); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = col.dark;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 11, -18); ctx.lineTo(s * 19, -21); ctx.lineTo(s * 12, -10); ctx.closePath(); ctx.fill();
    }

    // head
    const hg = ctx.createRadialGradient(-4, -17, 2, 0, -13, 14);
    hg.addColorStop(0, col.light);
    hg.addColorStop(1, col.main);
    ctx.fillStyle = hg; circle(0, -13, 13); ctx.fill();
    ctx.strokeStyle = col.dark; ctx.lineWidth = 2; ctx.stroke();

    // snout, nostrils, mouth
    ctx.fillStyle = col.belly; ellipse(0, -6, 8, 5.5); ctx.fill();
    ctx.fillStyle = col.dark;
    circle(-2.6, -7, 1.1); ctx.fill(); circle(2.6, -7, 1.1); ctx.fill();
    ctx.strokeStyle = col.dark;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (angry) { ctx.moveTo(-3.5, -3); ctx.lineTo(-1.2, -4.2); ctx.lineTo(1.2, -3); ctx.lineTo(3.5, -4.2); }
    else ctx.arc(0, -5, 3, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // eyes
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ellipse(s * 5.5, -16, 4.2, 4.8); ctx.fill();
      ctx.fillStyle = '#1b1030'; circle(s * 5.5, -15, 2.6); ctx.fill();
      ctx.fillStyle = '#fff'; circle(s * 5.5 + 1, -16.3, 1); ctx.fill();
    }
    if (angry) {
      ctx.strokeStyle = col.dark;
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 9.5, -22.5); ctx.lineTo(s * 2.5, -19.5); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,110,140,0.45)';
    ellipse(-9.5, -9, 2.6, 1.7); ctx.fill();
    ellipse(9.5, -9, 2.6, 1.7); ctx.fill();

    // white flash when hit
    if (d.hitFlash > 0) {
      ctx.globalAlpha = Math.min(1, d.hitFlash / 0.15) * 0.7;
      ctx.fillStyle = '#fff';
      circle(0, -2, 22); ctx.fill();
    }
    ctx.restore();
  }

  /** Spinning rings under each lane's target when a cannon is selected (fast + bright = colour match). */
  function drawReticles(game, run, t) {
    if (!run.selected || run.outcome) return;
    const sel = C.COLORS[run.selected];
    for (let l = 0; l < C.LANES; l++) {
      const d = game.lowestTarget(run, l);
      if (!d) continue;
      const match = d.layers[0] === run.selected;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(t * (match ? 2.5 : 0.5));
      ctx.strokeStyle = match ? sel.light : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = match ? 3 : 2;
      ctx.setLineDash(match ? [10, 6] : [4, 8]);
      circle(0, 0, 44);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBeams(run) {
    for (const b of run.beams) {
      const a = b.life / b.max;
      const x = DG.Game.laneX(b.lane);
      const g = ctx.createLinearGradient(x - 32, 0, x + 32, 0);
      g.addColorStop(0, 'rgba(255,215,64,0)');
      g.addColorStop(0.5, 'rgba(255,244,190,' + (0.85 * a).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,215,64,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 32, C.FIELD_TOP, 64, C.CANNON_TOP - C.FIELD_TOP);
    }
  }

  function drawBalls(run) {
    for (const b of run.balls) {
      const col = C.COLORS[b.color];
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + 36);
      g.addColorStop(0, col.light);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(b.x - 6, b.y); ctx.lineTo(b.x + 6, b.y); ctx.lineTo(b.x, b.y + 36); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col.main; circle(b.x, b.y, 8); ctx.fill();
      ctx.strokeStyle = col.dark; ctx.lineWidth = 2; ctx.stroke();
      drawSymbol(col.symbol, b.x, b.y, 4.5, '#fff');
    }
  }

  function drawParticles(run) {
    for (const p of run.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      circle(p.x, p.y, p.size);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts(run) {
    for (const tx of run.texts) {
      ctx.globalAlpha = Math.min(1, tx.life * 2);
      text(tx.text, tx.x, tx.y, tx.size, tx.color, 'center', '#2a1640');
    }
    ctx.globalAlpha = 1;
  }

  // ================================================================ cannons
  function drawCannonBar(run, t) {
    const top = C.CANNON_TOP;
    if (!grads.bar) {
      const g = ctx.createLinearGradient(0, top, 0, C.H);
      g.addColorStop(0, '#5d3a1a');
      g.addColorStop(1, '#2e1a0a');
      grads.bar = g;
    }
    ctx.fillStyle = grads.bar;
    ctx.fillRect(0, top, C.W, C.H - top);
    ctx.fillStyle = '#c99a4b';
    ctx.fillRect(0, top, C.W, 3);

    C.COLOR_ORDER.forEach((key, i) => {
      const col = C.COLORS[key];
      const cx = C.LANE_W * (i + 0.5);
      const ammo = run ? run.ammo[key] : null;
      const unused = !!run && run.startAmmo[key] === 0;
      const empty = !!run && !unused && ammo === 0;
      const sel = !!run && run.selected === key;
      const lift = sel ? -6 : 0;

      if (sel) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = col.main;
        rr(cx - 42, top + 6, 84, 86, 14); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = col.light;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (run && !run.selected && !unused && !empty && !run.outcome) {
        // gentle pulse to invite the first selection
        const p = (Math.sin(t * 5) + 1) * 0.5;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.12 + p * 0.35).toFixed(3) + ')';
        ctx.lineWidth = 2;
        rr(cx - 42, top + 6, 84, 86, 14); ctx.stroke();
      }

      ctx.save();
      ctx.globalAlpha = unused ? 0.22 : empty ? 0.4 : 1;
      // carriage + wheels
      ctx.fillStyle = '#6d4425'; rr(cx - 24, top + 52, 48, 16, 5); ctx.fill();
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#3e2615'; circle(cx + s * 17, top + 70, 11); ctx.fill();
        ctx.strokeStyle = '#c99a4b'; ctx.lineWidth = 2; circle(cx + s * 17, top + 70, 7); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + s * 17 - 7, top + 70); ctx.lineTo(cx + s * 17 + 7, top + 70);
        ctx.moveTo(cx + s * 17, top + 63); ctx.lineTo(cx + s * 17, top + 77);
        ctx.stroke();
      }
      // barrel
      const bg = ctx.createLinearGradient(cx - 13, 0, cx + 13, 0);
      bg.addColorStop(0, col.dark);
      bg.addColorStop(0.45, col.main);
      bg.addColorStop(0.7, col.light);
      bg.addColorStop(1, col.dark);
      ctx.fillStyle = bg; rr(cx - 13, top + 16 + lift, 26, 44, 9); ctx.fill();
      ctx.fillStyle = col.dark; rr(cx - 15, top + 12 + lift, 30, 9, 4); ctx.fill();
      ctx.fillStyle = '#1b1020'; ellipse(cx, top + 14 + lift, 9, 3); ctx.fill();
      // symbol badge
      ctx.fillStyle = col.belly; circle(cx, top + 38 + lift, 9.5); ctx.fill();
      ctx.strokeStyle = col.dark; ctx.lineWidth = 1.5; ctx.stroke();
      drawSymbol(col.symbol, cx, top + 38 + lift, 6.5, col.dark);
      ctx.restore();

      // ammo count
      if (run && !unused) {
        ctx.fillStyle = empty ? '#5d4a4a' : '#fff';
        circle(cx + 27, top + 22, 13); ctx.fill();
        ctx.strokeStyle = col.dark; ctx.lineWidth = 2.5; ctx.stroke();
        text(String(ammo), cx + 27, top + 23, 15, empty ? '#ffb4b4' : '#2a1640');
      }
    });
  }

  // ================================================================ HUD
  function drawHUD(game, run, t) {
    ctx.fillStyle = 'rgba(22,12,48,0.85)';
    ctx.fillRect(0, 0, C.W, C.HUD_H);
    ctx.fillStyle = 'rgba(22,12,48,0.5)';
    ctx.fillRect(0, C.HUD_H, C.W, C.FIELD_TOP - C.HUD_H);

    // pause button
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(8, 6, 40, 40, 10); ctx.fill();
    ctx.fillStyle = '#fff'; rr(20, 16, 6, 20, 2); ctx.fill(); rr(30, 16, 6, 20, 2); ctx.fill();

    // level + name
    text(game.mode === 'endless' ? 'ENDLESS' : 'LEVEL ' + (game.levelIndex + 1), 58, 18, 13, '#ffd54f', 'left');
    text(run.level.name, 58, 36, 12, 'rgba(255,255,255,0.85)', 'left', null, '700');

    // score
    text('SCORE', 222, 15, 10, 'rgba(255,255,255,0.7)', 'center', null, '700');
    text(String(run.score), 222, 34, 18, '#fff');

    // hearts
    for (let i = 0; i < C.HEARTS; i++) {
      heartPath(274 + i * 28, 27, 10);
      ctx.fillStyle = i < run.hearts ? '#ff4d6d' : 'rgba(255,255,255,0.12)';
      ctx.fill();
      ctx.strokeStyle = i < run.hearts ? '#7a0020' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Royal Volley meter / button
    const my = C.HUD_H, mh = C.FIELD_TOP - C.HUD_H;
    if (run.volleyReady) {
      const p = (Math.sin(t * 6) + 1) * 0.5;
      const g = ctx.createLinearGradient(0, my + 6, 0, my + mh - 6);
      g.addColorStop(0, '#fff3b0');
      g.addColorStop(1, '#ffb300');
      ctx.save();
      ctx.shadowColor = '#ffd54f';
      ctx.shadowBlur = 8 + p * 14;
      ctx.fillStyle = g;
      rr(46, my + 6, 268, mh - 12, 18); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#fff8e1'; ctx.lineWidth = 2; rr(46, my + 6, 268, mh - 12, 18); ctx.stroke();
      drawCrown(76, my + mh / 2 + 6, 1.1);
      drawCrown(284, my + mh / 2 + 6, 1.1);
      text('ROYAL VOLLEY!', 180, my + mh / 2 + 1, 18, '#5a2d00');
    } else {
      text('ROYAL VOLLEY', 12, my + mh / 2, 12, 'rgba(255,255,255,0.85)', 'left');
      for (let i = 0; i < C.VOLLEY_STREAK; i++) {
        const x = 124 + i * 77;
        rr(x, my + 15, 68, 16, 8);
        ctx.fillStyle = i < run.streak ? '#ffd54f' : 'rgba(255,255,255,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  function drawHint(run) {
    if (!run.hint || run.hintTime <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, run.hintTime);
    ctx.font = '700 13px ' + C.FONT;
    const lines = wrapLines(run.hint, 290);
    const h = lines.length * 17 + 14;
    const y = C.FIELD_TOP + 8;
    ctx.fillStyle = 'rgba(255,248,225,0.95)';
    rr(20, y, C.W - 40, h, 12); ctx.fill();
    ctx.strokeStyle = '#ffb300'; ctx.lineWidth = 2; ctx.stroke();
    lines.forEach((ln, i) => text(ln, C.W / 2, y + 15.5 + i * 17, 13, '#4a2500', 'center', null, '700'));
    ctx.restore();
  }

  function drawBanner(run) {
    const b = run.banner;
    if (!b) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, b.life * 2.5, (b.max - b.life) * 6));
    text(b.text, C.W / 2, 262, 36, '#ffd54f', 'center', '#3a1a00');
    if (b.sub) text(b.sub, C.W / 2, 298, 17, '#ffffff', 'center', '#2a1640');
    ctx.restore();
  }

  // ================================================================ frame
  R.draw = function (game, dt) {
    const t = game.clock;
    const run = game.run;
    const inGame = game.state !== 'menu' && !!run;

    ctx.setTransform(kx, 0, 0, ky, 0, 0);

    // world (shakes)
    ctx.save();
    if (inGame && run.shake > 0) {
      ctx.translate((Math.random() * 2 - 1) * run.shake, (Math.random() * 2 - 1) * run.shake);
    }
    drawSky(t, dt);
    if (inGame) drawLanes(t);
    drawCastle(t, inGame ? run : null);

    ctx.save();
    const clipTop = inGame ? C.FIELD_TOP : 0;
    ctx.beginPath();
    ctx.rect(-20, clipTop, C.W + 40, C.CANNON_TOP - clipTop);
    ctx.clip();
    if (inGame) { drawBeams(run); drawReticles(game, run, t); }
    const list = inGame ? run.dragons : game.menuDragons;
    for (const d of list) drawDragon(d, t);
    ctx.restore();

    if (inGame) { drawBalls(run); drawParticles(run); }
    drawCannonBar(inGame ? run : null, t);
    if (inGame) drawTexts(run);
    ctx.restore();

    // UI layer (no shake)
    if (inGame) {
      drawHUD(game, run, t);
      drawHint(run);
      drawBanner(run);
      if (run.flash > 0) {
        ctx.fillStyle = 'rgba(255,40,60,' + (run.flash * 0.35).toFixed(3) + ')';
        ctx.fillRect(0, 0, C.W, C.H);
      }
    }
  };
})();
