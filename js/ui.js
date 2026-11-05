/* Dragon Guard – DOM overlay screens (title, level select, how to play, pause, results). */
(function () {
  'use strict';
  const UI = (DG.UI = {});
  const $ = (id) => document.getElementById(id);
  const SCREENS = ['title', 'levels', 'howto', 'pause', 'complete', 'gameover'];

  UI.show = function (name) {
    SCREENS.forEach((s) => $('screen-' + s).classList.toggle('hidden', s !== name));
  };
  UI.hideAll = () => UI.show(null);

  UI.init = function () {
    document.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        DG.Audio.unlock();
        DG.Audio.play('click');
        UI.action(el.dataset.action);
      });
    });
    UI.updateMute();
    UI.refreshTitle();
  };

  UI.action = function (action) {
    const G = DG.Game;
    switch (action) {
      case 'play':   G.playFromTitle(); break;
      case 'levels': UI.buildLevelGrid(); UI.show('levels'); break;
      case 'howto':  UI.show('howto'); break;
      case 'back':   UI.refreshTitle(); UI.show('title'); break;
      case 'resume': G.resume(); break;
      case 'retry':  G.retry(); break;
      case 'next':   G.next(); break;
      case 'menu':   G.toMenu(); break;
      case 'mute':
        DG.Save.data.muted = !DG.Audio.isMuted();
        DG.Audio.setMuted(DG.Save.data.muted);
        DG.Save.save();
        UI.updateMute();
        break;
    }
  };

  UI.updateMute = function () {
    const muted = DG.Audio.isMuted();
    document.querySelectorAll('.mute-label').forEach((el) => {
      el.textContent = muted ? '🔇 Sound: Off' : '🔊 Sound: On';
    });
  };

  UI.refreshTitle = function () {
    const u = DG.Save.data.unlocked;
    $('btn-play').textContent = u > DG.LEVELS.length ? 'Play Endless' : u > 1 ? 'Play · Level ' + u : 'Play';
  };

  function starString(n) {
    let s = '';
    for (let i = 0; i < 3; i++) s += i < n ? '★' : '☆';
    return s;
  }

  UI.buildLevelGrid = function () {
    const grid = $('level-grid');
    const save = DG.Save.data;
    grid.innerHTML = '';

    DG.LEVELS.forEach((lv, i) => {
      const n = i + 1;
      const locked = n > save.unlocked;
      const best = save.best[n];
      const b = document.createElement('button');
      b.className = 'level-btn' + (locked ? ' locked' : '');
      b.disabled = locked;
      b.setAttribute('aria-label', 'Level ' + n + ': ' + lv.name + (locked ? ' (locked)' : ''));
      b.innerHTML = '<span class="num">' + (locked ? '🔒' : n) + '</span>' +
        '<span class="stars">' + (locked ? '' : starString(best ? best.stars : 0)) + '</span>';
      if (!locked) b.addEventListener('click', () => { DG.Audio.play('click'); DG.Game.startLevel(i); });
      grid.appendChild(b);
    });

    // Endless mode unlocks after the last handcrafted level
    const endlessLocked = save.unlocked <= DG.LEVELS.length;
    const e = document.createElement('button');
    e.className = 'level-btn endless' + (endlessLocked ? ' locked' : '');
    e.disabled = endlessLocked;
    e.innerHTML = endlessLocked
      ? '🔒 Endless <small>(beat level ' + DG.LEVELS.length + ')</small>'
      : '♾ Endless <small>Best: ' + save.endlessBest + '</small>';
    if (!endlessLocked) e.addEventListener('click', () => { DG.Audio.play('click'); DG.Game.startEndless(); });
    grid.appendChild(e);
  };

  UI.showComplete = function (info) {
    $('complete-title').textContent = 'Level ' + info.level + ' Complete!';
    $('complete-stars').innerHTML = [0, 1, 2].map((i) =>
      '<span class="' + (i < info.stars ? 'on' : 'off') + '" style="animation-delay:' + (0.15 + i * 0.2) + 's">★</span>'
    ).join('');
    $('complete-score').textContent = 'Score: ' + info.score + (info.newBest ? '  · New best!' : '');
    $('complete-detail').textContent = 'Hearts bonus +' + info.heartBonus + ' · Ammo bonus +' + info.ammoBonus;
    $('complete-best').textContent = 'Best: ' + info.best;
    $('btn-next').textContent = info.isLast ? 'Endless Mode ▶' : 'Next Level ▶';
    UI.show('complete');
  };

  UI.showGameOver = function (info) {
    const ammo = info.reason === 'ammo';
    $('go-title').textContent = ammo ? 'Out of Ammo!' : 'The Castle Fell!';
    $('go-reason').textContent = ammo
      ? "You don't have enough of the right cannonballs left to beat every dragon."
      : 'The dragons reached the royal family.';
    $('go-stats').textContent = info.mode === 'endless'
      ? 'Wave ' + info.wave + ' · Score ' + info.score + (info.newBest ? ' · New best!' : ' · Best ' + info.best)
      : 'Level ' + info.level + ' · Score ' + info.score;
    UI.show('gameover');
  };
})();
