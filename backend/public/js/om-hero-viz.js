(function () {
  let viz = null;
  let canvas = null;
  let ctx = null;
  let raf = 0;
  let graph = null;
  let timeData = null;
  let smooth = null;
  let displaySmooth = null;
  let dpr = 1;
  let watchTimer = 0;
  let pendingSyncTimer = 0;
  let hideTimer = 0;
  let fadeTimer = 0;
  const mobileMq = window.matchMedia('(max-width: 768px)');

  function isMobileViewport() {
    return mobileMq.matches;
  }

  function waveLayout(h) {
    const padBottom = 10;
    const drawH = Math.max(32, h - padBottom);
    const mid = drawH * 0.44;
    return {
      mid,
      mainAmp: drawH * 0.26,
      backAmp: drawH * 0.15,
      backMidOffset: Math.max(3, drawH * 0.03),
    };
  }

  function syncVizLayout() {
    if (!viz) return false;
    if (isMobileViewport()) {
      hideViz(true);
      return false;
    }
    const hero = viz.closest('.hero');
    const eyebrow = hero?.querySelector('.hero__eyebrow');
    if (!hero || !eyebrow) return true;

    const gap = 36;
    const height = Math.max(44, eyebrow.offsetTop - gap);
    viz.style.height = `${height}px`;
    resizeCanvas();
    return true;
  }

  function getAudio() {
    return document.getElementById('om-audio-engine');
  }

  function isPlaying() {
    const audio = getAudio();
    return !!(audio?.src && !audio.paused && !audio.ended);
  }

  function hasTrack() {
    const audio = getAudio();
    return !!(audio?.src && !audio.ended);
  }

  function onHomePage() {
    return !!document.getElementById('hero-viz');
  }

  function bindElements() {
    viz = document.getElementById('hero-viz');
    canvas = document.getElementById('hero-viz-canvas');
    if (!viz || !canvas) {
      viz = null;
      canvas = null;
      ctx = null;
      return false;
    }
    if (!ctx) ctx = canvas.getContext('2d');
    resizeCanvas();
    return true;
  }

  function resizeCanvas() {
    if (!canvas || !viz) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(200, viz.clientWidth);
    const h = Math.max(48, viz.clientHeight || 0);
    if (h <= 0) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ensureGraph(audio) {
    if (!audio?.src) return null;
    if (window.__omVizGraph?.element === audio) return window.__omVizGraph;

    try {
      if (typeof audio.captureStream !== 'function') return null;
      const audioCtx = new AudioContext();
      const stream = audio.captureStream();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.96;
      source.connect(analyser);
      graph = { element: audio, audioCtx, analyser };
      window.__omVizGraph = graph;
      timeData = new Uint8Array(analyser.fftSize);
      smooth = new Float32Array(analyser.fftSize);
      displaySmooth = new Float32Array(analyser.fftSize);
      return graph;
    } catch {
      return null;
    }
  }

  function cssVar(name, fallback) {
    if (!viz) return fallback;
    return getComputedStyle(viz).getPropertyValue(name).trim() || fallback;
  }

  function drawPath(points, closeBottom) {
    if (!ctx || points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const cur = points[i];
      const cx = (prev.x + cur.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cx, (prev.y + cur.y) / 2);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    if (closeBottom) {
      ctx.lineTo(last.x, canvas.height / dpr);
      ctx.lineTo(points[0].x, canvas.height / dpr);
      ctx.closePath();
    }
  }

  function sampleWave(source, w, mid, amp, phase) {
    const points = [];
    const count = Math.min(source.length, 120);
    const step = w / (count - 1);
    for (let i = 0; i < count; i += 1) {
      const v = source[Math.floor(i * (source.length / count))] ?? 0;
      const x = i * step;
      const y = mid + v * amp + Math.sin(i * 0.06 + phase * 0.85) * amp * 0.035;
      points.push({ x, y });
    }
    return points;
  }

  function drawFallback(t) {
    if (!ctx || !canvas) return;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const layout = waveLayout(h);
    ctx.clearRect(0, 0, w, h);

    const fake = new Float32Array(120);
    for (let i = 0; i < fake.length; i += 1) {
      const p = i / fake.length;
      fake[i] =
        Math.sin(p * Math.PI * 4 + t * 1.4) * 0.18 +
        Math.sin(p * Math.PI * 9 + t * 2.1) * 0.08;
    }
    drawScene(w, h, layout, fake, fake, t);
  }

  function drawScene(w, h, layout, primary, secondary, phase) {
    const line = cssVar('--viz-line', 'rgba(74,124,89,0.78)');
    const lineSoft = cssVar('--viz-line-soft', 'rgba(74,124,89,0.28)');
    const fill = cssVar('--viz-fill', 'rgba(74,124,89,0.11)');
    const fillDeep = cssVar('--viz-fill-deep', 'rgba(74,124,89,0.04)');
    const glow = cssVar('--viz-glow', 'rgba(74,124,89,0.24)');

    const backPts = sampleWave(
      secondary,
      w,
      layout.mid + layout.backMidOffset,
      layout.backAmp,
      phase * 0.7,
    );
    drawPath(backPts, true);
    ctx.fillStyle = fillDeep;
    ctx.fill();

    const mainPts = sampleWave(primary, w, layout.mid, layout.mainAmp, phase);
    drawPath(mainPts, true);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 8;
    drawPath(mainPts, false);
    ctx.strokeStyle = line;
    ctx.lineWidth = 2.25;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    drawPath(backPts, false);
    ctx.strokeStyle = lineSoft;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawWave(phase) {
    if (!ctx || !canvas || !graph?.analyser || !timeData || !smooth || !displaySmooth) return;
    graph.analyser.getByteTimeDomainData(timeData);

    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const layout = waveLayout(h);
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < timeData.length; i += 1) {
      const v = (timeData[i] - 128) / 128;
      smooth[i] = smooth[i] * 0.91 + v * 0.09;
    }

    for (let i = 0; i < smooth.length; i += 1) {
      const prev = smooth[i - 1] ?? smooth[i];
      const next = smooth[i + 1] ?? smooth[i];
      displaySmooth[i] = (prev + smooth[i] + next) / 3;
    }

    const secondary = new Float32Array(displaySmooth.length);
    for (let i = 0; i < displaySmooth.length; i += 1) {
      const p2 = displaySmooth[i - 2] ?? displaySmooth[i];
      const p1 = displaySmooth[i - 1] ?? displaySmooth[i];
      const n1 = displaySmooth[i + 1] ?? displaySmooth[i];
      const n2 = displaySmooth[i + 2] ?? displaySmooth[i];
      secondary[i] = (p2 + p1 + displaySmooth[i] + n1 + n2) / 5 * 0.82;
    }

    drawScene(w, h, layout, displaySmooth, secondary, phase);
  }

  function frame(now) {
    if (!bindElements()) {
      stopDrawing(false);
      return;
    }
    if (!isPlaying()) {
      scheduleHide();
      return;
    }
    const phase = now / 1000;
    if (graph?.analyser) drawWave(phase);
    else drawFallback(phase);
    raf = requestAnimationFrame(frame);
  }

  function showViz() {
    if (!viz) return;
    clearTimeout(hideTimer);
    clearTimeout(fadeTimer);
    syncVizLayout();
    viz.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!viz || viz.hidden) return;
        viz.classList.add('hero-viz--visible');
      });
    });
  }

  function hideViz(instant) {
    if (!viz) return;
    clearTimeout(hideTimer);
    clearTimeout(fadeTimer);
    viz.classList.remove('hero-viz--visible');
    const finish = () => {
      if (!viz) return;
      if (isPlaying()) return;
      viz.hidden = true;
      viz.style.height = '';
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    if (instant) {
      finish();
      return;
    }
    fadeTimer = window.setTimeout(finish, 560);
  }

  function scheduleHide() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (isPlaying()) return;
      hideViz(false);
    }, 400);
  }

  function stopDrawing(clearRefs) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(hideTimer);
    hideViz(false);
    if (clearRefs) {
      viz = null;
      canvas = null;
      ctx = null;
    }
  }

  function stopAll() {
    stopDrawing(true);
  }

  function start() {
    if (isMobileViewport() || !onHomePage()) return;
    if (!bindElements()) return;
    if (!isPlaying()) return;

    const audio = getAudio();
    const g = ensureGraph(audio);
    if (g?.audioCtx?.state === 'suspended') void g.audioCtx.resume();
    if (!syncVizLayout()) return;

    showViz();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function sync() {
    if (isMobileViewport()) {
      stopAll();
      return;
    }

    if (!onHomePage()) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      viz = null;
      canvas = null;
      ctx = null;
      return;
    }

    if (isPlaying()) {
      start();
      return;
    }

    if (hasTrack()) {
      scheduleSyncRetries();
      return;
    }

    stopAll();
  }

  function scheduleSyncRetries() {
    if (pendingSyncTimer) return;
    const delays = [80, 200, 450, 900, 1500];
    let i = 0;
    const tick = () => {
      pendingSyncTimer = 0;
      if (!onHomePage() || isMobileViewport()) return;
      if (isPlaying()) {
        start();
        return;
      }
      i += 1;
      if (i < delays.length && hasTrack()) {
        pendingSyncTimer = window.setTimeout(tick, delays[i]);
      }
    };
    pendingSyncTimer = window.setTimeout(tick, delays[0]);
  }

  function bindAudio(audio) {
    if (!audio) return;
    if (!audio.dataset.omHeroVizBound) {
      audio.dataset.omHeroVizBound = '1';
      audio.addEventListener('play', () => {
        clearTimeout(hideTimer);
        if (onHomePage()) start();
      });
      audio.addEventListener('pause', () => {
        if (onHomePage()) scheduleHide();
      });
      audio.addEventListener('ended', stopAll);
    }
  }

  function init() {
    bindAudio(getAudio());
    sync();
  }

  function scheduleInit() {
    requestAnimationFrame(() => {
      requestAnimationFrame(init);
    });
  }

  function ensureWatch() {
    if (watchTimer) return;
    watchTimer = window.setInterval(() => {
      if (isMobileViewport() || !onHomePage()) return;
      if (isPlaying() && (!viz || viz.hidden || !viz.classList.contains('hero-viz--visible'))) {
        start();
      }
    }, 350);
  }

  ['om:play', 'om:session-restore', 'om:track-change'].forEach((ev) => {
    window.addEventListener(ev, scheduleInit);
  });
  ['om:pause', 'om:queue-end'].forEach((ev) => {
    window.addEventListener(ev, () => {
      if (onHomePage()) scheduleHide();
      else stopAll();
    });
  });

  document.addEventListener('turbo:load', scheduleInit);
  document.addEventListener('turbo:render', scheduleInit);
  window.addEventListener('pageshow', scheduleInit);
  window.addEventListener('resize', () => {
    if (!onHomePage() || !bindElements()) return;
    if (isMobileViewport()) {
      stopAll();
      return;
    }
    if (viz && !viz.hidden) syncVizLayout();
    else resizeCanvas();
  });

  if (typeof mobileMq.addEventListener === 'function') {
    mobileMq.addEventListener('change', () => sync());
  } else if (typeof mobileMq.addListener === 'function') {
    mobileMq.addListener(() => sync());
  }

  ensureWatch();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInit);
  } else {
    scheduleInit();
  }
})();
