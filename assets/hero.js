// Homepage hero: one set of dots that rearranges itself into charts from three projects.
// Dots start scattered ("messy data in") and settle into each chart ("clear decisions out").
// Data: assets/hero-data.js (built by site-tools/build_hero_data.py from the projects' own outputs).
(() => {
  const root = document.querySelector(".hero-viz");
  if (!root || !window.HERO_DATA) return;

  const scenes = window.HERO_DATA.scenes;
  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const stage = root.querySelector(".viz-stage");
  const tip = root.querySelector(".viz-tip");
  const tabs = [...root.querySelectorAll(".viz-tab")];
  const text = {
    q: root.querySelector(".viz-q"), a: root.querySelector(".viz-a"), hi: root.querySelector(".viz-hi"),
    lo: root.querySelector(".viz-lo"), note: root.querySelector(".viz-note"), link: root.querySelector(".viz-link"),
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const count = (s) => (s.type === "units" ? s.columns.reduce((n, c) => n + c.lo + c.hi, 0) : s.points.length);
  const N = Math.max(...scenes.map(count));
  const dots = Array.from({ length: N }, () => ({
    x: 0, y: 0, a: 0, c: 0, r: 2.5,            // current state
    fx: 0, fy: 0, fa: 0, fc: 0, fr: 2.5,       // where the current move started
    tx: 0, ty: 0, ta: 0, tc: 0, tr: 2.5,       // where it ends
    delay: 0, info: null,
  }));

  let W = 0, H = 0, dpr = 1, colours = {};
  let active = 0, moveStart = 0, moving = false, labelAlpha = 0, auto = !reduceMotion, hovered = false;
  let settled = false;                            // false until the dots have formed their first chart
  let visible = true, frame = 0;
  const MOVE = 900, STAGGER = 400, HOLD = 5000;

  // ---- colours follow the site theme -------------------------------------------------------
  function readColours() {
    const css = getComputedStyle(document.documentElement);
    const v = (name) => css.getPropertyValue(name).trim();
    colours = { hi: v("--accent"), lo: v("--dot-muted") || v("--ink-3"), ink: v("--ink-2"), text: v("--ink"),
                faint: v("--line"), surface: v("--surface") };
  }

  // ---- geometry ------------------------------------------------------------------------------
  function plot(scene) {
    const left = scene.type === "units" ? 8 : 58, right = W - (scene.type === "units" ? 10 : 22), top = 12, bottom = H - (scene.type === "units" ? 26 : 34);
    return { left, right, top, bottom, w: right - left, h: bottom - top };
  }

  function targets(scene) {
    const p = plot(scene);
    const out = [];
    if (scene.type === "units") {
      const k = scene.columns.length, gap = Math.max(6, p.w * 0.018);
      const colW = p.w / k;
      const maxDots = Math.max(...scene.columns.map((c) => c.lo + c.hi));
      // pick how many dots per row fills the space best
      let per = 2, s = 0;
      for (const n of [2, 3, 4, 5]) {
        const size = Math.min((colW - gap) / n, p.h / Math.ceil(maxDots / n));
        if (size > s) { s = size; per = n; }
      }
      scene.columns.forEach((c, i) => {
        const x0 = p.left + i * colW + (colW - per * s) / 2 + s / 2;
        for (let j = 0; j < c.lo + c.hi; j++) {
          out.push({
            x: x0 + (j % per) * s, y: p.bottom - Math.floor(j / per) * s - s / 2,
            c: j >= c.lo ? 1 : 0, r: s * 0.36, info: c.tip, col: i,
          });
        }
      });
      scene._units = { colW, s, per, p };
    } else {
      scene.points.forEach(([x, y, c, info]) => {
        out.push({ x: p.left + x * p.w, y: p.bottom - y * p.h, c, r: scene.r, info });
      });
    }
    return out;
  }

  function goTo(i, animate = true) {
    active = i;
    const scene = scenes[i];
    const t = targets(scene);
    // shuffle which dot goes where, so every change looks like a swarm rather than a slide
    const order = dots.map((_, k) => k).sort((a, b) => ((a * 7919 + i * 104729) % N) - ((b * 7919 + i * 104729) % N));
    order.forEach((di, k) => {
      const d = dots[di], g = t[k];
      d.fx = d.x; d.fy = d.y; d.fa = d.a; d.fc = d.c; d.fr = d.r;
      if (g) {
        d.tx = g.x; d.ty = g.y; d.ta = 1; d.tc = g.c; d.tr = g.r; d.info = g.info; d.col = g.col;
        d.delay = ((g.x - plot(scene).left) / Math.max(plot(scene).w, 1)) * STAGGER + Math.random() * 180;
      } else {                                   // spare dots drift off and fade
        d.tx = W / 2 + (Math.random() - 0.5) * W * 0.6; d.ty = H / 2 + (Math.random() - 0.5) * H * 0.6;
        d.ta = 0; d.tc = 0; d.tr = 1.5; d.info = null; d.col = null; d.delay = Math.random() * 300;
      }
      if (!animate) { d.x = d.tx; d.y = d.ty; d.a = d.ta; d.c = d.tc; d.r = d.tr; }
    });
    moveStart = performance.now();
    moving = animate;
    settled = true;
    labelAlpha = animate ? 0 : 1;
    tabs.forEach((b, k) => b.setAttribute("aria-pressed", k === i ? "true" : "false"));
    root.dispatchEvent(new CustomEvent("scenechange", { detail: i }));   // the results next to the chart follow along
    text.q.textContent = scene.q;
    text.a.textContent = scene.a;
    text.hi.textContent = scene.hi;
    text.lo.textContent = scene.lo;
    text.note.textContent = scene.note;
    text.link.href = scene.link;
    canvas.setAttribute("aria-label", scene.label);
    hideTip();
    if (!animate) draw();
  }

  // ---- drawing -------------------------------------------------------------------------------
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function mix(a, b, t) {
    const pa = parse(a), pb = parse(b);
    return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(",")})`;
  }
  const cache = {};
  function parse(c) {
    if (cache[c]) return cache[c];
    const probe = document.createElement("canvas").getContext("2d");
    probe.fillStyle = c;
    const hex = probe.fillStyle;                     // normalised to #rrggbb
    const v = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
    return (cache[c] = v);
  }

  function drawAxes(scene) {
    if (labelAlpha <= 0 || (scene.type === "units" && !scene._units)) return;
    const p = plot(scene);
    ctx.save();
    ctx.globalAlpha = labelAlpha;
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.fillStyle = colours.ink;
    ctx.strokeStyle = colours.faint;
    ctx.lineWidth = 1;
    if (scene.type === "units") {
      const u = scene._units;
      ctx.textAlign = "center";
      // every other year plus the last one, skipping any label that would touch its neighbour on narrow screens
      const n = scene.columns.length, x = (i) => p.left + i * u.colW + u.colW / 2;
      const half = (t) => ctx.measureText(t).width / 2;
      const lastLeft = x(n - 1) - half(scene.columns[n - 1].label);
      let prevRight = -Infinity;
      scene.columns.forEach((c, i) => {
        const isLast = i === n - 1;
        if (!isLast && i % 2) return;
        const l = x(i) - half(c.label), r = x(i) + half(c.label);
        if (!isLast && (l < prevRight + 6 || r > lastLeft - 6)) return;
        ctx.fillText(c.label, x(i), p.bottom + 17);
        prevRight = r;
      });
      const first = scene.columns[0], last = scene.columns[scene.columns.length - 1];
      const topOf = (c) => p.bottom - Math.ceil((c.lo + c.hi) / u.per) * u.s - 6;
      ctx.font = "600 12px Inter, system-ui, sans-serif";
      ctx.fillStyle = colours.ink;
      ctx.fillText(`${first.lo + first.hi}k`, p.left + u.colW / 2, topOf(first));
      ctx.fillText(`${last.lo + last.hi}k`, p.left + (scene.columns.length - 0.5) * u.colW, topOf(last));
    } else {
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      scene.y_ticks.forEach(([v, label]) => {
        const y = p.bottom - v * p.h;
        ctx.beginPath(); ctx.moveTo(p.left, y); ctx.lineTo(p.right, y); ctx.stroke();
        ctx.fillText(label, p.left - 6, y);
      });
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      scene.x_ticks.forEach(([v, label]) => ctx.fillText(label, p.left + v * p.w, p.bottom + 6));
      ctx.fillText(scene.x_label, p.left + p.w / 2, p.bottom + 20);
      ctx.save();
      ctx.translate(12, p.top + p.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(scene.y_label, 0, -6);
      ctx.restore();
      if (scene.line) {
        ctx.strokeStyle = colours.ink;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        scene.line.forEach(([x, y], k) => {
          const px = p.left + x * p.w, py = p.bottom - y * p.h;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  // ring and name the outliers (IPL: the biggest steals and busts); some names drop out on narrow screens
  function drawOutliers(scene) {
    if (!scene.outliers || labelAlpha <= 0) return;
    const p = plot(scene);
    ctx.save();
    ctx.globalAlpha = labelAlpha;
    ctx.font = "600 11px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for (const o of scene.outliers) {
      if (W < (o.min_w || 0)) continue;
      const [x, y] = scene.points[o.i];
      const px = p.left + x * p.w, py = p.bottom - y * p.h;
      ctx.strokeStyle = colours.text;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(px, py, scene.r + 3.5, 0, Math.PI * 2);
      ctx.stroke();
      const tw = ctx.measureText(o.label).width;
      const lx = Math.min(Math.max(o.side === "l" ? px - 11 - tw : px + 11, 2), W - tw - 2);
      ctx.lineWidth = 4;                              // a halo in the card colour keeps the name readable over dots
      ctx.strokeStyle = colours.surface;
      ctx.strokeText(o.label, lx, py);
      ctx.fillStyle = colours.text;
      ctx.fillText(o.label, lx, py);
    }
    ctx.restore();
  }

  function draw(now = performance.now()) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const scene = scenes[active];
    let done = true;
    if (moving) {
      const t = now - moveStart;
      for (const d of dots) {
        const k = Math.min(Math.max((t - d.delay) / MOVE, 0), 1);
        if (k < 1) done = false;
        const e = ease(k);
        d.x = d.fx + (d.tx - d.fx) * e; d.y = d.fy + (d.ty - d.fy) * e;
        d.a = d.fa + (d.ta - d.fa) * e; d.c = d.fc + (d.tc - d.fc) * e; d.r = d.fr + (d.tr - d.fr) * e;
      }
      if (done) moving = false;
    }
    if (!moving && settled) labelAlpha = Math.min(1, labelAlpha + 0.06);
    drawAxes(scene);
    for (const d of dots) {
      if (d.a <= 0.01) continue;
      ctx.globalAlpha = d.a * (hoverCol !== null && d.col !== undefined && d.col !== hoverCol ? 0.35 : 1);
      ctx.fillStyle = mix(colours.lo, colours.hi, d.c);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!moving && settled) drawOutliers(scene);
    if (hoverDot) {
      ctx.strokeStyle = colours.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hoverDot.x, hoverDot.y, hoverDot.r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    return moving || labelAlpha < 1;
  }

  let autoTimer = 0;
  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (!auto || hovered || !visible) return;
    autoTimer = setTimeout(() => {
      if (auto && !hovered && visible && !moving) { goTo((active + 1) % scenes.length); kick(); } else scheduleAuto();
    }, HOLD);
  }
  function loop(now) {
    frame = 0;
    if (draw(now)) frame = requestAnimationFrame(loop);
    else scheduleAuto();                            // idle: nothing to animate until the next scene
  }
  const kick = () => { if (!frame) frame = requestAnimationFrame(loop); };

  // ---- sizing --------------------------------------------------------------------------------
  function resize() {
    const box = stage.getBoundingClientRect();
    W = Math.max(200, box.width);
    H = Math.max(240, box.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
  }

  // ---- hover ---------------------------------------------------------------------------------
  let hoverDot = null, hoverCol = null;
  function hideTip() { tip.hidden = true; hoverDot = null; hoverCol = null; }
  function showTip(textValue, x, y) {
    tip.textContent = textValue;
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(x - tw / 2, 4), W - tw - 4) + "px";
    tip.style.top = Math.max(y - tip.offsetHeight - 12, 4) + "px";
  }
  stage.addEventListener("pointermove", (e) => {
    if (moving) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const scene = scenes[active];
    hoverDot = null; hoverCol = null;
    if (scene.type === "units") {
      const u = scene._units;
      const col = Math.floor((mx - u.p.left) / u.colW);
      if (col >= 0 && col < scene.columns.length && my > u.p.top - 10) {
        hoverCol = col;
        const c = scene.columns[col];
        showTip(c.tip, u.p.left + (col + 0.5) * u.colW, u.p.bottom - Math.ceil((c.lo + c.hi) / u.per) * u.s);
      } else hideTip();
    } else {
      let best = null, bestD = 14 * 14;
      for (const d of dots) {
        if (d.ta < 1 || !d.info) continue;
        const dd = (d.x - mx) ** 2 + (d.y - my) ** 2;
        if (dd < bestD) { bestD = dd; best = d; }
      }
      if (best) { hoverDot = best; showTip(best.info, best.x, best.y); } else hideTip();
    }
    draw();
  });
  stage.addEventListener("pointerleave", () => { hideTip(); draw(); });
  root.addEventListener("mouseenter", () => { hovered = true; clearTimeout(autoTimer); });
  root.addEventListener("mouseleave", () => { hovered = false; scheduleAuto(); });

  tabs.forEach((b, k) => b.addEventListener("click", () => {
    auto = false;                                   // the visitor is in charge now
    clearTimeout(autoTimer);
    if (k !== active) { goTo(k, !reduceMotion); kick(); }
  }));
  stage.addEventListener("click", () => {          // click the chart to replay the "messy to clear" move
    if (reduceMotion || moving) return;
    scatter();
    setTimeout(() => { goTo(active); kick(); }, 380);
    kick();
  });

  function scatter() {
    for (const d of dots) {
      d.fx = d.x; d.fy = d.y; d.fa = d.a; d.fc = d.c; d.fr = d.r;
      d.tx = Math.random() * W; d.ty = Math.random() * H; d.ta = 0.45; d.tc = 0; d.tr = 2; d.delay = Math.random() * 150;
    }
    moveStart = performance.now(); moving = true; settled = false; labelAlpha = 0; hideTip();
  }

  // ---- start ---------------------------------------------------------------------------------
  readColours();
  resize();
  if (reduceMotion) {
    goTo(0, false);
  } else {
    for (const d of dots) {                         // messy data in...
      d.x = Math.random() * W; d.y = Math.random() * H; d.a = 0.45; d.c = 0; d.r = 2;
    }
    draw();
    setTimeout(() => { goTo(0); kick(); }, 500);   // ...clear chart out
  }

  new ResizeObserver(() => {
    const oldW = W, oldH = H;
    resize();                                       // resizing the canvas also clears it...
    if (Math.abs(oldW - W) > 1 || Math.abs(oldH - H) > 1) goTo(active, false);
    else draw();                                    // ...so always redraw (with reduced motion nothing else would)
  }).observe(stage);

  new MutationObserver(() => { readColours(); draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColours(); draw(); });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) scheduleAuto(); else clearTimeout(autoTimer);
    }).observe(root);
  }
})();
