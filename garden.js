(() => {
  'use strict';
  const scene = document.querySelector('#scene');
  const canvas = document.querySelector('#night');
  const open = document.querySelector('#open');
  const letter = document.querySelector('#letter');
  const replay = document.querySelector('#replay');
  const ctx = canvas.getContext('2d');
  const sky = document.createElement('canvas');
  const bg = sky.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finishAt = 7.6;
  const flowers = [
    { x: -1, height: 2.12, bend: -.54, color: '#ee9aa8', name: 'pembe', delay: 0 },
    { x: 0, height: 2.7, bend: .09, color: '#e44853', name: 'kirmizi', delay: 1.1 },
    { x: 1, height: 1.87, bend: .54, color: '#a66aba', name: 'mor', delay: 2.2 }
  ];
  for (const flower of flowers) {
    flower.image = new Image();
    flower.image.src = 'assets/' + flower.name + '.png';
  }

  let width, height, scale, soil, unit, started = 0, frame = 0;
  const clamp = value => Math.min(1, Math.max(0, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  let seed = 28739;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const stars = Array.from({ length: 240 }, () => [random(), random(), random(), random()]);
  const grass = Array.from({ length: 235 }, () => [random(), random(), random(), random()]);
  const lights = Array.from({ length: 36 }, () => [random(), random(), random(), random()]);

  function glow(context, x, y, rx, ry, color) {
    context.save();
    context.translate(x, y);
    context.scale(rx, ry);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    context.fillStyle = gradient;
    context.fillRect(-1, -1, 2, 2);
    context.restore();
  }

  function landscape() {
    bg.setTransform(scale, 0, 0, scale, 0, 0);
    const night = bg.createLinearGradient(0, 0, 0, height);
    night.addColorStop(0, '#070a1b');
    night.addColorStop(.62, '#111831');
    night.addColorStop(1, '#28304d');
    bg.fillStyle = night;
    bg.fillRect(0, 0, width, height);
    glow(bg, width * .5, height * .7, width * .72, height * .57, '#60538267');
    glow(bg, width * .19, height * .52, width * .42, height * .3, '#43578b44');
    glow(bg, width * .78, height * .76, width * .44, height * .24, '#96717c39');
    for (const [x, y, size, light] of stars) {
      if (width < 500 && light < .34) continue;
      bg.fillStyle = 'rgba(240,230,255,' + (.14 + light * .56) + ')';
      bg.beginPath();
      bg.arc(x * width, y * height * .87, .23 + size ** 4 * 1.2, 0, Math.PI * 2);
      bg.fill();
      if (size > .965) glow(bg, x * width, y * height * .87, 11, 11, '#e8ddff40');
    }
    const moonX = width * (width < 550 ? .78 : .82);
    const moonY = height * .23;
    const radius = Math.min(width, height) * .037;
    glow(bg, moonX, moonY, radius * 4, radius * 4, '#efc6b23b');
    bg.fillStyle = '#f5d6c6';
    bg.beginPath();
    bg.arc(moonX, moonY, radius, -.94, 2.43);
    bg.bezierCurveTo(moonX + radius * .5, moonY + radius * 1.02, moonX + radius * .9, moonY - radius * .23, moonX + radius * .59, moonY - radius * .81);
    bg.fill();
    for (let i = 0; i < 3; i++) {
      const ground = soil - height * (.096 - i * .043);
      bg.fillStyle = ['#181d35', '#121a29', '#0d131e'][i];
      bg.beginPath();
      bg.moveTo(0, height);
      bg.lineTo(0, ground);
      bg.bezierCurveTo(width * .19, ground - 33 + i * 13, width * .32, ground + 22, width * .57, ground + 10);
      bg.bezierCurveTo(width * .77, ground + 5, width * .89, ground - 24, width, ground - 8);
      bg.lineTo(width, height);
      bg.fill();
    }
    glow(bg, width * .5, soil, width * .42, height * .16, '#43435b39');
  }

  function resize() {
    width = scene.clientWidth;
    height = scene.clientHeight;
    scale = Math.min(devicePixelRatio || 1, 2, Math.sqrt(3100000 / (width * height)));
    canvas.width = sky.width = Math.round(width * scale);
    canvas.height = sky.height = Math.round(height * scale);
    soil = height * .89;
    unit = Math.min(width * .226, height * .143, 145);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    landscape();
    requestFrame();
  }

  function leaf(x, y, reach, rise, growth, phase) {
    if (growth <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(phase) * .07);
    const tipX = reach * growth;
    const tipY = -rise * growth;
    const gradient = ctx.createLinearGradient(0, 0, tipX, tipY);
    gradient.addColorStop(0, '#243a29');
    gradient.addColorStop(.53, '#497452');
    gradient.addColorStop(1, '#94b17d');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(tipX * .68, tipY * -.09, tipX * .84, tipY * .68, tipX, tipY);
    ctx.bezierCurveTo(tipX * .72, tipY * .94, tipX * .19, tipY * .56, 0, 0);
    ctx.fill();
    ctx.strokeStyle = '#c1db9c57';
    ctx.lineWidth = Math.max(.6, unit * .008);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(tipX * .68, tipY * .44, tipX, tipY);
    ctx.stroke();
    ctx.restore();
  }

  function tulip(flower, time, wind) {
    const age = time - .75 - flower.delay;
    const progress = smooth(age / 2.05);
    if (progress <= 0) return;
    const stemHeight = flower.height * unit;
    const root = width / 2 + flower.x * unit * .68;
    const phase = wind * 1.16 + flower.x * .73;
    const bend = (flower.bend + Math.sin(phase) * .083) * unit;
    const stemX = position => root + bend * position * position;
    const stemY = position => soil - stemHeight * position;
    const x = stemX(progress);
    const y = stemY(progress);
    const gradient = ctx.createLinearGradient(root - 9, soil, x + 11, y);
    gradient.addColorStop(0, '#34563b');
    gradient.addColorStop(.74, '#7a9c60');
    gradient.addColorStop(1, '#b4bc7e');
    ctx.lineCap = 'round';
    for (const [fraction, direction, size, delay] of [[.24, -1, .98, .4], [.39, 1, .73, .73], [.61, flower.x > 0 ? 1 : -1, .62, 1.02]]) {
      if (progress > fraction) leaf(stemX(fraction), stemY(fraction), direction * unit * size, unit * (size + .15), smooth((age - delay) / 1.65), phase);
    }
    ctx.lineWidth = Math.max(2.4, unit * .058);
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(root, soil + 2);
    ctx.quadraticCurveTo(root, soil - stemHeight * progress / 2, x, y);
    ctx.stroke();

    const bud = smooth((age - 1.65) / .7);
    const unfold = smooth((age - 2.32) / 1.55);
    if (!bud) return;
    const size = unit * (flower.x === 0 ? 1.12 : .98);
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.rotate(flower.bend * .36 + Math.sin(phase) * .054);
    ctx.scale(bud * (.41 + .59 * unfold), bud * (.8 + .2 * unfold));
    const tall = size * .91;
    const imageReady = flower.image.complete && flower.image.naturalWidth;
    if (unfold < 1 || !imageReady) {
      ctx.globalAlpha = imageReady ? 1 - unfold : 1;
      const petal = ctx.createLinearGradient(-size / 2, -tall, size / 2, 0);
      petal.addColorStop(0, '#ffe1d0');
      petal.addColorStop(.52, flower.color);
      petal.addColorStop(1, '#39132b');
      ctx.fillStyle = petal;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size * .65, -tall * .24, -size * .37, -tall * .94, -size * .13, -tall);
      ctx.bezierCurveTo(size * .03, -tall * .96, size * .27, -tall * 1.06, size * .38, -tall * .79);
      ctx.bezierCurveTo(size * .66, -tall * .47, size * .39, -tall * .08, 0, 0);
      ctx.fill();
      ctx.strokeStyle = '#fff1db75';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size * .24, -tall * .35, size * .16, -tall * .69, size * .11, -tall * .96);
      ctx.stroke();
    }
    if (imageReady && unfold > 0) {
      ctx.globalAlpha = unfold;
      ctx.drawImage(flower.image, -size / 2, -tall, size, tall);
    }
    ctx.restore();
  }

  function foreground() {
    const shadow = ctx.createLinearGradient(0, soil - 12, 0, height);
    shadow.addColorStop(0, '#090e1900');
    shadow.addColorStop(.38, '#090e19de');
    shadow.addColorStop(1, '#080a14');
    ctx.fillStyle = shadow;
    ctx.fillRect(0, soil - 12, width, height - soil + 12);
    for (const [x, h, lean, tint] of grass) {
      const px = x * width;
      const py = soil + 4 + tint * height * .06;
      const reach = (lean - .5) * 28;
      const tall = (6 + h ** 2 * 45) * Math.min(1, height / 650);
      ctx.fillStyle = tint > .68 ? '#253132' : '#121e25';
      ctx.beginPath();
      ctx.moveTo(px - 1.5, py);
      ctx.quadraticCurveTo(px + reach * .23, py - tall * .53, px + reach, py - tall);
      ctx.quadraticCurveTo(px + reach * .46, py - tall * .19, px + 2, py);
      ctx.fill();
    }
  }

  function fireflies(time, wind) {
    const opacity = smooth((time - 1.4) / 1.7);
    for (const [x, y, speed, pulse] of lights) {
      const phase = wind * (.4 + speed * .6) + x * 26;
      const px = width / 2 + (x - .5) * unit * 4.7 + Math.sin(phase) * unit * .34;
      const py = soil - y * unit * 3.75 + Math.cos(phase * .82 + y * 5) * unit * .22;
      const strength = (.2 + .8 * ((Math.sin(phase * 1.8 + pulse * 9) + 1) / 2) ** 2) * opacity;
      glow(ctx, px, py, 7 + pulse * 7, 7 + pulse * 7, 'rgba(255,198,108,' + strength * .62 + ')');
      ctx.fillStyle = 'rgba(255,235,175,' + strength + ')';
      ctx.beginPath();
      ctx.arc(px, py, .55 + pulse * 1.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function reveal() {
    scene.dataset.state = 'final';
    letter.removeAttribute('inert');
    letter.removeAttribute('aria-hidden');
    replay.hidden = false;
    letter.focus({ preventScroll: true });
  }

  function render(now) {
    frame = 0;
    const state = scene.dataset.state;
    const active = state !== 'intro';
    const wind = reduced.matches ? 0 : Math.max(0, (now - started) / 1000);
    const time = active && reduced.matches ? finishAt : wind;
    ctx.drawImage(sky, 0, 0, width, height);
    if (active) for (const flower of [flowers[2], flowers[0], flowers[1]]) tulip(flower, time, wind);
    foreground();
    if (active) fireflies(time, wind);
    if (state === 'growing' && time >= finishAt) reveal();
    if (active && !document.hidden && !reduced.matches) requestFrame();
  }

  function requestFrame() {
    if (!frame && ctx && bg) frame = requestAnimationFrame(render);
  }

  open.addEventListener('click', () => {
    if (scene.dataset.state !== 'intro') return;
    started = performance.now();
    scene.dataset.state = 'growing';
    open.setAttribute('inert', '');
    open.blur();
    if (!ctx || !bg) reveal();
    else requestFrame();
  });
  replay.addEventListener('click', () => {
    scene.dataset.state = 'intro';
    replay.hidden = true;
    letter.setAttribute('inert', '');
    letter.setAttribute('aria-hidden', 'true');
    open.removeAttribute('inert');
    requestFrame();
    open.focus({ preventScroll: true });
  });
  if (ctx && bg) {
    for (const { image } of flowers) image.addEventListener('load', requestFrame);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', requestFrame);
    if (reduced.addEventListener) reduced.addEventListener('change', requestFrame);
    resize();
  }
})();
