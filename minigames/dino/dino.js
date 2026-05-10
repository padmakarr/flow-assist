/**
 * Desert run — standalone endless runner (generic shapes only).
 * Enhance sprites/assets here without touching FlowAssist core.
 */
(function () {
  var LS_KEY = 'flowassist-minigame-dino-hiscore';

  var canvas = document.getElementById('dino-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var elScore = document.getElementById('dino-score');
  var elHi = document.getElementById('dino-hiscore');
  var elHint = document.getElementById('dino-hint');
  var elOverlay = document.getElementById('dino-overlay-msg');

  function readHi() {
    try {
      var n = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
      return isNaN(n) ? 0 : n;
    } catch {
      return 0;
    }
  }

  function writeHi(n) {
    try {
      localStorage.setItem(LS_KEY, String(Math.floor(n)));
    } catch (_) {}
  }

  var hiScore = readHi();
  if (elHi) elHi.textContent = String(hiScore);

  var MIN_W = 400;
  var MAX_W = 4000;
  var lastAppliedW = 0;

  var W = 800;
  var H = 280;
  var groundY = H - 48;

  var gameState = 'idle'; // idle | running | gameover | paused
  var score = 0;
  var speed = 5.5;
  var tick = 0;
  var spawnTimer = 85;
  var rafId = null;

  var player = {
    x: 96,
    y: groundY - 52,
    w: 44,
    h: 52,
    vy: 0,
    grounded: true
  };

  var obstacles = [];

  var GRAVITY = 0.58;
  var JUMP = -11.2;

  function setBodyState(s) {
    gameState = s;
    document.body.setAttribute('data-game-state', s);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function resetRound() {
    score = 0;
    speed = 5.5;
    tick = 0;
    spawnTimer = 85;
    obstacles = [];
    player.y = groundY - player.h;
    player.vy = 0;
    player.grounded = true;
    if (elScore) elScore.textContent = '0';
    if (elOverlay) {
      elOverlay.hidden = true;
      elOverlay.textContent = '';
    }
  }

  function spawnObstacle() {
    var h = rand(38, 62);
    var w = rand(22, 38);
    obstacles.push({
      x: W + w + rand(0, 120),
      w: w,
      h: h,
      passed: false
    });
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function drawGround() {
    ctx.fillStyle = '#30363d';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = 'rgba(139, 148, 158, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, groundY + 0.5);
    ctx.lineTo(W, groundY + 0.5);
    ctx.stroke();
  }

  function drawPlayer() {
    ctx.fillStyle = '#58a6ff';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = 'rgba(240, 246, 252, 0.25)';
    ctx.fillRect(player.x + 8, player.y + 10, player.w - 16, 12);
  }

  function drawObstacles() {
    ctx.fillStyle = '#7ee787';
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var oy = groundY - o.h;
      ctx.fillRect(o.x, oy, o.w, o.h);
      ctx.fillStyle = 'rgba(46, 160, 67, 0.35)';
      ctx.fillRect(o.x + 4, oy + 4, o.w - 8, Math.min(8, o.h - 8));
      ctx.fillStyle = '#7ee787';
    }
  }

  function update() {
    if (gameState !== 'running') return;

    tick++;
    speed = Math.min(17, 5.5 + score * 0.0015);

    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.y + player.h >= groundY) {
      player.y = groundY - player.h;
      player.vy = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }

    spawnTimer--;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = rand(55, 110) - Math.min(35, Math.floor(score) / 80);
      if (spawnTimer < 28) spawnTimer = 28;
    }

    for (var j = obstacles.length - 1; j >= 0; j--) {
      var o = obstacles[j];
      o.x -= speed;
      if (!o.passed && o.x + o.w < player.x) {
        o.passed = true;
      }
      if (o.x + o.w < -20) {
        obstacles.splice(j, 1);
        continue;
      }
      var oy = groundY - o.h;
      if (rectsOverlap(player.x, player.y, player.w, player.h, o.x, oy, o.w, o.h)) {
        endGame();
        return;
      }
    }

    score += speed * 0.045;
    if (elScore) elScore.textContent = String(Math.floor(score));
  }

  function applyPlayfieldSize() {
    var wrap = canvas.parentElement;
    if (!wrap) return;
    var cw = Math.floor(wrap.getBoundingClientRect().width);
    if (cw < 64) return;

    var nw = Math.max(MIN_W, Math.min(MAX_W, cw));
    if (nw === lastAppliedW && canvas.width === nw) return;

    var prevW = lastAppliedW;
    W = nw;
    groundY = H - 48;

    if (prevW > 0 && prevW !== W && obstacles.length) {
      var ratio = W / prevW;
      for (var qi = 0; qi < obstacles.length; qi++) {
        obstacles[qi].x *= ratio;
      }
    }

    player.x = Math.min(Math.max(64, player.x), W - player.w - 16);

    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');

    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    lastAppliedW = W;
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, W, groundY);
    drawGround();
    drawObstacles();
    drawPlayer();

    if (gameState === 'idle') {
      ctx.fillStyle = 'rgba(201, 209, 217, 0.85)';
      ctx.font = '600 15px ui-sans-serif,system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press Space to start', W / 2, groundY - 72);
    } else if (gameState === 'gameover') {
      ctx.fillStyle = 'rgba(248, 81, 73, 0.92)';
      ctx.font = '700 16px ui-sans-serif,system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Run ended — Space to retry', W / 2, groundY - 72);
    } else if (gameState === 'paused') {
      ctx.fillStyle = 'rgba(201, 209, 217, 0.9)';
      ctx.font = '600 15px ui-sans-serif,system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Paused — P to resume', W / 2, groundY - 72);
    }
  }

  function loop() {
    update();
    draw();
    if (gameState === 'running') {
      rafId = requestAnimationFrame(loop);
    }
  }

  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function endGame() {
    setBodyState('gameover');
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    var floorScore = Math.floor(score);
    if (floorScore > hiScore) {
      hiScore = floorScore;
      writeHi(hiScore);
      if (elHi) elHi.textContent = String(hiScore);
      if (elOverlay) {
        elOverlay.hidden = false;
        elOverlay.textContent = 'New best: ' + hiScore + '. Space to play again.';
      }
    } else if (elOverlay) {
      elOverlay.hidden = false;
      elOverlay.textContent = 'Score ' + floorScore + '. Space to retry.';
    }
    draw();
  }

  function jump() {
    if (gameState === 'idle') {
      resetRound();
      setBodyState('running');
      if (elHint) elHint.style.visibility = 'hidden';
      startLoop();
      return;
    }
    if (gameState === 'gameover') {
      resetRound();
      setBodyState('running');
      startLoop();
      return;
    }
    if (gameState !== 'running') return;
    if (player.grounded) {
      player.vy = JUMP;
      player.grounded = false;
    }
  }

  function togglePause() {
    if (gameState === 'running') {
      setBodyState('paused');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      draw();
      return;
    }
    if (gameState === 'paused') {
      setBodyState('running');
      startLoop();
    }
  }

  function onKeyDown(e) {
    var k = e.code || e.key;
    if (k === 'Space' || k === ' ') {
      if (gameState === 'paused') return;
      e.preventDefault();
      jump();
      return;
    }
    if (k === 'ArrowUp') {
      e.preventDefault();
      jump();
      return;
    }
    if (k === 'KeyP') {
      e.preventDefault();
      togglePause();
      return;
    }
  }

  canvas.addEventListener('keydown', onKeyDown);

  canvas.addEventListener('pointerdown', function () {
    canvas.focus();
    if (gameState === 'running') jump();
    else jump();
  });

  function onVisibility() {
    if (document.hidden && gameState === 'running') {
      setBodyState('paused');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      draw();
    }
  }

  document.addEventListener('visibilitychange', onVisibility);

  function onResize() {
    applyPlayfieldSize();
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  var wrapEl = canvas.parentElement;
  if (wrapEl && typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(function () {
      applyPlayfieldSize();
    });
    ro.observe(wrapEl);
  }

  requestAnimationFrame(function () {
    applyPlayfieldSize();
  });

  setBodyState('idle');
  applyPlayfieldSize();
})();
