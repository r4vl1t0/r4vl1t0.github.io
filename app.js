(() => {
  const canvas = document.getElementById('m87-canvas');
  const loader = document.getElementById('m87-loader');
  const replayButton = document.getElementById('m87-replay');
  const root = document.documentElement;
  const context = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = 4300;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let startTime = 0;
  let animationFrame = 0;
  let introFinished = false;
  let projectsVisible = false;
  const ambientPosition = { x: .74, y: .4, scale: 1 };

  const stars = Array.from({ length: 190 }, () => ({
    x: Math.random(), y: Math.random(),
    size: Math.random() * 1.25 + .25,
    alpha: Math.random() * .55 + .15,
    drift: Math.random() * .55 + .25
  }));

  const particles = Array.from({ length: 380 }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 78 + Math.pow(Math.random(), .72) * 210,
    speed: .0008 + Math.random() * .0017,
    size: Math.random() * 2.1 + .35,
    heat: Math.random()
  }));

  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {
    const x = clamp(value);
    return x * x * (3 - 2 * x);
  };
  const range = (value, from, to) => smooth((value - from) / (to - from));
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawStars(cx, cy, pull, intensity = 1) {
    for (const star of stars) {
      const sx = star.x * width;
      const sy = star.y * height;
      const dx = cx - sx;
      const dy = cy - sy;
      const distance = Math.max(30, Math.hypot(dx, dy));
      const attraction = pull * pull * 125 * star.drift;
      const x = sx + (dx / distance) * attraction;
      const y = sy + (dy / distance) * attraction;
      const stretch = pull * 28 * star.drift;

      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - (dx / distance) * stretch, y - (dy / distance) * stretch);
      context.strokeStyle = `rgba(255, 220, 184, ${star.alpha * intensity * (1 - pull * .72)})`;
      context.lineWidth = star.size * (1 + pull * 1.4);
      context.stroke();
    }
  }

  function drawDisk(cx, cy, coreRadius, energy, time, zoom = 1, ambient = false) {
    const diskScale = Math.min(width, height) / 760 * zoom;
    const orbitGrowth = coreRadius * (ambient ? .2 : .34);
    const speed = ambient ? .16 : 1.35 + energy * 5;

    context.save();
    context.translate(cx, cy);
    context.rotate(-.13);
    context.scale(diskScale, diskScale * .29);
    context.globalCompositeOperation = 'lighter';

    for (const particle of particles) {
      const angle = particle.angle + time * particle.speed * speed;
      const radius = particle.radius + orbitGrowth;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const tail = ambient ? 5 : 5 + energy * 34;
      const hue = 18 + particle.heat * 25;
      const light = 48 + particle.heat * 34;
      const alpha = ambient
        ? .1 + particle.heat * .32
        : (.18 + particle.heat * .74) * (1 - range(energy, .9, 1));

      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(Math.cos(angle - .035) * (radius + tail), Math.sin(angle - .035) * (radius + tail));
      context.strokeStyle = `hsla(${hue}, 100%, ${light}%, ${alpha})`;
      context.lineWidth = particle.size * (ambient ? .78 : 1 + energy * 1.8);
      context.stroke();
    }
    context.restore();

    const glowRadius = coreRadius * 2.8 + 80 * zoom;
    const glow = context.createRadialGradient(cx, cy, coreRadius * .7, cx, cy, glowRadius);
    glow.addColorStop(0, ambient ? 'rgba(255,137,56,.14)' : 'rgba(255,137,56,.28)');
    glow.addColorStop(.35, ambient ? 'rgba(170,48,12,.06)' : 'rgba(170,48,12,.13)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    context.fill();
  }

  function drawCore(cx, cy, radius, ambient = false) {
    const edge = context.createRadialGradient(cx, cy, radius * .72, cx, cy, radius * 1.08);
    edge.addColorStop(0, '#000');
    edge.addColorStop(.82, '#000');
    edge.addColorStop(.94, ambient ? 'rgba(255,156,73,.58)' : 'rgba(255,156,73,.94)');
    edge.addColorStop(1, 'rgba(255,95,24,0)');
    context.fillStyle = edge;
    context.beginPath();
    context.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
    context.fill();
  }

  function introFrame(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = clamp(elapsed / duration);
    const approach = range(progress, .03, .7);
    const reveal = range(progress, .76, .93);
    const maxRadius = Math.hypot(width, height) * .66;
    const coreRadius = 28 + Math.pow(approach, 2.35) * maxRadius;
    const cx = width / 2;
    const cy = height / 2;
    const zoom = .45 + approach * 3.25;

    context.clearRect(0, 0, width, height);
    drawStars(cx, cy, approach, 1);
    drawDisk(cx, cy, coreRadius, approach, elapsed, zoom);
    drawCore(cx, cy, coreRadius);
    canvas.style.opacity = String(1 - reveal);

    root.style.setProperty('--page-scale', String(1 - Math.sin(approach * Math.PI) * .045));
    root.style.setProperty('--page-blur', `${Math.sin(approach * Math.PI) * 5}px`);
    root.style.setProperty('--page-dim', String(1 - Math.sin(approach * Math.PI) * .3));

    if (progress < 1 && !introFinished) animationFrame = requestAnimationFrame(introFrame);
    else finishIntro();
  }

  function ambientFrame(timestamp) {
    const target = projectsVisible
      ? { x: width < 760 ? .18 : .12, y: .48, scale: .58 }
      : { x: width < 760 ? .78 : .74, y: .4, scale: 1 };

    ambientPosition.x += (target.x - ambientPosition.x) * .035;
    ambientPosition.y += (target.y - ambientPosition.y) * .035;
    ambientPosition.scale += (target.scale - ambientPosition.scale) * .035;

    const cx = width * ambientPosition.x;
    const cy = height * ambientPosition.y;
    const radius = Math.max(30, Math.min(width, height) * .055 * ambientPosition.scale);

    root.style.setProperty('--m87-x', `${ambientPosition.x * 100}%`);
    root.style.setProperty('--m87-y', `${ambientPosition.y * 100}%`);
    root.style.setProperty('--m87-hit-size', `${radius * 2}px`);

    context.clearRect(0, 0, width, height);
    drawStars(cx, cy, 0, .22);
    drawDisk(cx, cy, radius, .08, timestamp, .92 * ambientPosition.scale, true);
    drawCore(cx, cy, radius, true);
    animationFrame = requestAnimationFrame(ambientFrame);
  }

  function finishIntro() {
    if (introFinished) return;
    introFinished = true;
    cancelAnimationFrame(animationFrame);
    document.body.classList.remove('intro-active');
    root.style.setProperty('--page-scale', '1');
    root.style.setProperty('--page-blur', '0px');
    root.style.setProperty('--page-dim', '1');
    loader.classList.add('ambient');
    replayButton.hidden = false;
    canvas.style.opacity = '0';
    ambientFrame(performance.now());
    requestAnimationFrame(() => { canvas.style.opacity = '1'; });
  }

  function replayIntro() {
    cancelAnimationFrame(animationFrame);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    projectsVisible = false;
    introFinished = false;
    startTime = 0;
    ambientPosition.x = width < 760 ? .78 : .74;
    ambientPosition.y = .4;
    ambientPosition.scale = 1;
    replayButton.hidden = true;
    loader.classList.remove('ambient');
    canvas.style.opacity = '1';
    document.body.classList.add('intro-active');
    root.style.removeProperty('--m87-x');
    root.style.removeProperty('--m87-y');
    animationFrame = requestAnimationFrame(introFrame);
    window.setTimeout(finishIntro, duration + 500);
  }

  function disableMotion() {
    introFinished = true;
    document.body.classList.remove('intro-active');
    replayButton.hidden = true;
    loader.remove();
  }

  document.getElementById('year').textContent = new Date().getFullYear();
  replayButton.addEventListener('click', replayIntro);
  const projectsSection = document.getElementById('proyectos');
  const projectsObserver = new IntersectionObserver(entries => {
    projectsVisible = entries[0].isIntersecting;
  }, { rootMargin: '-15% 0px -55% 0px', threshold: .02 });
  projectsObserver.observe(projectsSection);

  const discordButton = document.getElementById('copy-discord');
  discordButton.addEventListener('click', async () => {
    const handle = discordButton.dataset.handle;
    const feedback = discordButton.querySelector('span');

    try {
      await navigator.clipboard.writeText(handle);
    } catch {
      const input = document.createElement('textarea');
      input.value = handle;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }

    feedback.textContent = 'Copiado';
    window.setTimeout(() => { feedback.textContent = 'Copiar'; }, 1600);
  });
  window.addEventListener('resize', resize, { passive: true });

  if (reduceMotion) disableMotion();
  else {
    resize();
    animationFrame = requestAnimationFrame(introFrame);
    window.setTimeout(finishIntro, duration + 500);
  }
})();
