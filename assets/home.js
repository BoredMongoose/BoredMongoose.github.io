// Homepage: live dot field, the numbers beside the board, the project ring, the toolkit cards and the clock.
// Everything that animates pauses when it's off screen or the tab is hidden, and stays still with reduced motion.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = () => matchMedia("(max-width: 760px)").matches;

  // run a frame loop only while the element is on screen and the tab is visible
  function whileVisible(el, step) {
    let on = false, raf = 0;
    const loop = (t) => { step(t); raf = requestAnimationFrame(loop); };
    const set = (v) => { if (v === on) return; on = v; if (on) raf = requestAnimationFrame(loop); else cancelAnimationFrame(raf); };
    let seen = false;
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; set(seen && !document.hidden); }).observe(el);
    document.addEventListener("visibilitychange", () => set(seen && !document.hidden));
  }

  // ---- clock ------------------------------------------------------------------------------
  const clock = document.getElementById("clock");
  if (clock) {
    const tick = () => clock.textContent = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
    tick(); setInterval(tick, 30000);
  }

  // ---- hero: a field of dots that lights up around the cursor, with a slow wave through it --
  const cv = document.getElementById("field");
  if (cv) {
    const ctx = cv.getContext("2d"), hero = cv.parentElement;
    const out = { x: document.getElementById("tx"), y: document.getElementById("ty"), rows: document.getElementById("trows"), chk: document.getElementById("tchk") };
    let W = 0, H = 0, g = 15, mx = -999, my = -999, rows = 0, last = 0;
    const size = () => { const d = Math.min(devicePixelRatio || 1, phone() ? 1.5 : 2); W = hero.clientWidth; H = hero.clientHeight; g = phone() ? 19 : 15;
      cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener("resize", size);
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
      out.x.textContent = (mx / W).toFixed(3); out.y.textContent = (my / H).toFixed(3);
      rows += 7; out.rows.textContent = String(rows).padStart(6, "0"); if (rows % 49 === 0) out.chk.textContent = rows / 49;
    });
    hero.addEventListener("pointerleave", () => { mx = my = -999; });
    const draw = (now) => {
      const t = now / 1000; ctx.clearRect(0, 0, W, H);
      const gx = mx < -900 ? W * (.72 + Math.sin(t * .4) * .12) : mx, gy = mx < -900 ? H * (.42 + Math.cos(t * .5) * .1) : my;
      for (let y = g / 2; y < H; y += g) for (let x = g / 2; x < W; x += g) {
        const wave = Math.sin(x / 140 + t * .6) * 70 + H * .62 + Math.sin(x / 47 - t) * 14;
        const band = Math.max(0, 1 - Math.abs(y - wave) / 60) * (x / W) ** .8;
        const near = Math.max(0, 1 - Math.hypot(x - gx, y - gy) / 170);
        const a = Math.min(1, .1 + ((x * 7 + y * 13) % 17) / 90 + band * .8 + near * .9), r = 1 + band * 1.4 + near * 2;
        ctx.fillStyle = near > .05 || band > .25 ? `rgba(255,${80 - near * 40 | 0},${60 - near * 30 | 0},${a})` : `rgba(236,232,239,${a * .7})`;
        ctx.fillRect(x - r / 2, y - r / 2, r, r);
      }
    };
    if (reduce) draw(0);
    else whileVisible(hero, (now) => { if (phone() && now - last < 33) return; last = now; draw(now); });   // ~30fps on phones
  }

  // ---- the four numbers beside the board follow the chart --------------------------------
  const RESULTS = [
    ["projects/ipl.html", [["10%", "of IPL performance explained by auction price"], ["₹1,180cr", "spent at auction on 226 players"], ["36%", "of budget buys never played"], ["290k+", "ball-by-ball records analysed"]]],
    ["projects/ttc.html", [["+85%", "more subway delay minutes than in 2014–16"], ["76%", "of the rise comes from passengers, not trains"], ["−12%", "train breakdowns actually fell"], ["47%", "fewer signal delays on Line 1 after its upgrade"]]],
    ["projects/churn.html", [["+$92k", "profit from one targeted campaign"], ["−$122k", "if you offer it to everyone instead"], ["29%", "of customers are worth an offer"], ["30 / 30", "cost scenarios where targeting wins"]]],
  ];
  const viz = document.querySelector(".hero-viz"), results = [...document.querySelectorAll(".results .result")];
  if (viz && results.length === 4) {
    let shown = 0;
    const show = (k) => {
      if (k === shown || !RESULTS[k]) return;
      shown = k; const [href, rows] = RESULTS[k];
      results.forEach((el, n) => { el.classList.add("swap"); setTimeout(() => { el.href = href; el.querySelector("b").textContent = rows[n][0]; el.querySelector("span").textContent = rows[n][1]; el.classList.remove("swap"); }, 150 + n * 50); });
    };
    viz.addEventListener("scenechange", (e) => show(e.detail));
    viz.querySelectorAll(".viz-tab").forEach((tab, k) => tab.addEventListener("click", () => show(k)));
  }

  // ---- project ring: drag, arrows or keys on desktop; a swipe row on phones ----------------
  const wrap = document.getElementById("ringwrap");
  if (wrap) {
    const ring = wrap.querySelector(".ring"), cards = [...ring.children], n = cards.length, step = 360 / n;
    const label = document.getElementById("ringlabel"), prev = document.getElementById("prev"), next = document.getElementById("next");
    const R = Math.round(292 / (2 * Math.tan(Math.PI / n)));
    let angle = 0, target = 0, vel = 0, drag = false, lastX = 0, moved = 0;
    const flat = () => phone() || reduce;
    const front = () => ((Math.round(-angle / step) % n) + n) % n;
    function render() {
      if (flat()) return;
      ring.style.transform = `translateZ(${-R}px) rotateY(${angle}deg)`;
      const f = front();
      cards.forEach((c, i) => {
        const facing = Math.max(0, Math.cos((i * step + angle) * Math.PI / 180));
        c.style.transform = `rotateY(${i * step}deg) translateZ(${R}px)`;
        c.style.opacity = (.16 + facing * .84).toFixed(3);
        c.style.filter = `brightness(${(.45 + facing * .55).toFixed(3)})`;
        c.classList.toggle("front", i === f);
        c.tabIndex = i === f ? 0 : -1;
      });
      label.textContent = `Drag to explore · ${String(f + 1).padStart(2, "0")} / ${n}`;
    }
    function frame() {
      if (!drag) {
        if (Math.abs(vel) > .05) { target += vel; vel *= .92; } else { vel = 0; target = Math.round(target / step) * step; }
        angle += (target - angle) * .12;
      }
      render();
    }
    function mode() {
      wrap.classList.toggle("flat", flat());
      if (flat()) { label.textContent = `Swipe · ${n} projects`; cards.forEach((c) => { c.tabIndex = 0; c.classList.remove("front"); }); }
      else render();
    }
    // on phones: the card closest to the middle of the row, and how to centre any card
    const centred = () => {
      const mid = wrap.scrollLeft + wrap.clientWidth / 2, dist = (c) => Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      return cards.reduce((best, c, i) => (dist(c) < dist(cards[best]) ? i : best), 0);
    };
    const centre = (i) => {   // if smooth scrolling is unavailable, jump there instead
      const c = cards[(i + n) % n], left = c.offsetLeft - (wrap.clientWidth - c.offsetWidth) / 2, from = wrap.scrollLeft;
      wrap.scrollTo({ left, behavior: "smooth" });
      setTimeout(() => { if (wrap.scrollLeft === from) wrap.scrollTo({ left, behavior: "instant" }); }, 350);
    };
    const go = (d) => {
      if (flat()) { centre(centred() + d); return; }
      vel = 0; target = Math.round(target / step) * step - d * step;
    };
    prev.addEventListener("click", () => go(-1)); next.addEventListener("click", () => go(1));
    wrap.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); });
    wrap.addEventListener("pointerdown", (e) => { if (flat()) return; drag = true; moved = 0; lastX = e.clientX; vel = 0; });
    addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); angle += dx * .22; target = angle; vel = dx * .22; });
    addEventListener("pointerup", () => { drag = false; });
    // A click only opens the card in front. Clicking a side card (or the empty space beside the ring)
    // turns the ring that way instead.
    wrap.addEventListener("click", (e) => {
      if (moved > 6) { e.preventDefault(); moved = 0; return; }
      const card = e.target.closest(".card"), i = cards.indexOf(card);
      if (flat()) {
        if (card && i !== centred()) { e.preventDefault(); centre(i); }
        return;
      }
      const f = front();
      if (card && i === f) return;                          // the front card: follow its link
      e.preventDefault();
      if (card) { const d = ((i - f + n + Math.floor(n / 2)) % n) - Math.floor(n / 2); go(d); }   // shortest way round
      else { const r = wrap.getBoundingClientRect(); go(e.clientX < r.left + r.width / 2 ? -1 : 1); }
    }, true);
    wrap.addEventListener("dragstart", (e) => e.preventDefault());
    addEventListener("resize", mode); mode();
    whileVisible(wrap, () => { if (!flat()) frame(); });
  }

  // ---- toolkit: halftone field (SQL card), bars (Python card), the typing terminal ----------
  const ht = document.getElementById("halftone");
  if (ht) {
    const c = ht.getContext("2d");
    const draw = () => {
      const w = ht.clientWidth, h = ht.clientHeight, d = Math.min(devicePixelRatio || 1, 2); if (!w) return;
      ht.width = w * d; ht.height = h * d; c.setTransform(d, 0, 0, d, 0, 0);
      const blobs = [[.3, .4, .22], [.68, .35, .2], [.5, .72, .16]];
      for (let y = 6; y < h; y += 9) for (let x = 6; x < w; x += 9) {
        let v = 0; blobs.forEach(([bx, by, br]) => { v += Math.exp(-(((x / w - bx) ** 2) + ((y / h - by) ** 2)) / (br * br)); });
        const streak = y / h < .85 ? Math.exp(-(((x / w) - (y / h) * .9 - .12) ** 2) / .004) : 0;
        c.fillStyle = streak > .3 ? `rgba(255,59,47,${.4 + streak * .6})` : `rgba(18,16,20,${Math.min(.85, .15 + v * .6)})`;
        c.beginPath(); c.arc(x, y, streak > .3 ? 1.6 : Math.min(2.6, v * 2 + .25), 0, 7); c.fill();
      }
    };
    draw(); new ResizeObserver(draw).observe(ht);
  }
  const bars = document.getElementById("bars");
  if (bars) [34, 52, 45, 68, 60, 74, 66, 80, 72, 88, 84, 95, 90, 100].forEach((h) => { const i = document.createElement("i"); i.style.height = h + "%"; bars.appendChild(i); });
  const tq = document.getElementById("tq");
  if (tq) {
    const Q = [["which customers should get the retention offer?", "7,043", "passed", "29% of them"], ["what is really slowing the subway down?", "267,571", "passed", "passengers: 76%"], ["are IPL teams paying for wins?", "290k+ balls", "passed", "barely: 10%"]];
    const r = ["tr1", "tr2", "tr3"].map((id) => document.getElementById(id));
    let k = 0, timer = 0, active = false;
    const run = () => {
      const [text, ...vals] = Q[k++ % Q.length]; let i = 0;
      r.forEach((x) => x.textContent = "–"); tq.textContent = "";
      timer = setInterval(() => {
        tq.textContent = text.slice(0, ++i);
        if (i < text.length) return;
        clearInterval(timer); vals.forEach((v, j) => setTimeout(() => r[j].textContent = v, 400 + j * 450));
        timer = setTimeout(() => active && run(), 4200);
      }, 38);
    };
    if (reduce) { tq.textContent = Q[0][0]; Q[0].slice(1).forEach((v, j) => r[j].textContent = v); }
    else new IntersectionObserver(([e]) => { if (e.isIntersecting && !active) { active = true; run(); } else if (!e.isIntersecting) { active = false; clearInterval(timer); clearTimeout(timer); } }).observe(tq);
  }
})();
