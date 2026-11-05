// One small chart library for all three calm designs. Colours come from CSS variables, so each design themes it.
// Every chart is drawn from the real project data in data.js and redraws at any size.
(() => {
  const NS = "http://www.w3.org/2000/svg", P = window.P;
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const el = (p, t, a = {}, txt) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; p.appendChild(e); return e; };
  const scale = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
  const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true;
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(tip));
  const show = (e, text) => { tip.textContent = text; tip.hidden = false; const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8); tip.style.left = Math.max(8, x) + "px"; tip.style.top = e.clientY + 16 + "px"; };
  const hide = () => { tip.hidden = true; };
  const hover = (n, text) => { n.addEventListener("pointermove", (e) => show(e, text)); n.addEventListener("pointerleave", hide); };

  function frame(box, m) {
    box.innerHTML = "";
    const W = Math.max(100, box.clientWidth), H = Math.max(70, box.clientHeight);
    const s = el(box, "svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" });
    return { s, W, H, x0: m[3], x1: W - m[1], y0: m[0], y1: H - m[2], ink: css("--ink"), ink2: css("--ink-2"), ink3: css("--ink-3"), grid: css("--grid"), surface: css("--card") };
  }
  const text = (f, x, y, t, o = {}) => el(f.s, "text", { x, y, fill: o.fill || f.ink2, "font-size": o.size || 11.5, "text-anchor": o.a || "start", "font-weight": o.w || 400 }, t);
  const hline = (f, y) => el(f.s, "line", { x1: f.x0, x2: f.x1, y1: y, y2: y, stroke: f.grid, "stroke-width": 1 });
  const line = (pts) => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
  function crosshair(f, pts, label) {
    const g = el(f.s, "g", { opacity: 0 }), v = el(g, "line", { y1: f.y0, y2: f.y1, stroke: f.ink3, "stroke-width": 1 }), d = el(g, "circle", { r: 5, fill: css("--c1"), stroke: f.surface, "stroke-width": 2 });
    const hit = el(f.s, "rect", { x: f.x0, y: f.y0, width: f.x1 - f.x0, height: f.y1 - f.y0, fill: "transparent" });
    hit.addEventListener("pointermove", (e) => {
      const r = f.s.getBoundingClientRect(), mx = (e.clientX - r.left) * (f.W / r.width); let b = 0;
      pts.forEach((p, i) => { if (Math.abs(p[0] - mx) < Math.abs(pts[b][0] - mx)) b = i; });
      g.setAttribute("opacity", 1); v.setAttribute("x1", pts[b][0]); v.setAttribute("x2", pts[b][0]); d.setAttribute("cx", pts[b][0]); d.setAttribute("cy", pts[b][1]); show(e, label(b));
    });
    hit.addEventListener("pointerleave", () => { g.setAttribute("opacity", 0); hide(); });
  }

    const f_bottom = (box) => (box.clientWidth < 420 ? 72 : 54);   // room for the legend to wrap on phones

  const C = {
    // Price against runs added: a nearly flat line says price barely predicts performance
    ipl(box, o = {}) {
      const f = frame(box, o.small ? [8, 8, 8, 8] : [14, 14, 32, 44]), xs = scale(0, 27, f.x0, f.x1), ys = scale(-90, 165, f.y1, f.y0), d = P.ipl;
      if (!o.small) { [-50, 0, 50, 100, 150].forEach((v) => { hline(f, ys(v)); text(f, f.x0 - 8, ys(v) + 4, v > 0 ? "+" + v : v, { a: "end" }); }); [0, 5, 10, 15, 20, 25].forEach((v) => text(f, xs(v), f.y1 + 18, "₹" + v + "cr", { a: "middle" })); }
      else hline(f, ys(0));
      d.forEach(([n, p, r]) => { const c = el(f.s, "circle", { cx: xs(p), cy: ys(r), r: o.small ? 2 : (f.W > 700 ? 5.5 : f.W < 420 ? 3.2 : 4.5), fill: r > 0 ? css("--c1") : css("--muted"), "fill-opacity": 0.75, stroke: f.surface, "stroke-width": o.small || f.W < 420 ? 0 : 1 }); hover(c, `${n}: ₹${p} cr, ${r > 0 ? "+" : ""}${r} runs added`); });
      const n = d.length, mx = d.reduce((a, x) => a + x[1], 0) / n, my = d.reduce((a, x) => a + x[2], 0) / n, b = d.reduce((a, x) => a + (x[1] - mx) * (x[2] - my), 0) / d.reduce((a, x) => a + (x[1] - mx) ** 2, 0), a = my - b * mx;
      el(f.s, "line", { x1: xs(0), x2: xs(27), y1: ys(a), y2: ys(a + 27 * b), stroke: css("--c2"), "stroke-width": 2, "stroke-linecap": "round" });
      if (!o.small && f.W >= 420) text(f, f.x1, ys(a + 27 * b) - 10, "what price predicts", { a: "end", fill: f.ink });
    },
    // Delay minutes in the past 12 months
    ttc(box, o = {}) {
      const f = frame(box, o.small ? [8, 8, 8, 8] : [14, 14, 30, 44]), d = P.ttcTrend, xs = scale(0, d.length - 1, f.x0, f.x1), ys = scale(0, 85000, f.y1, f.y0), pts = d.map((p, i) => [xs(i), ys(p[1])]);
      if (!o.small) { [0, 20000, 40000, 60000, 80000].forEach((v) => { hline(f, ys(v)); text(f, f.x0 - 8, ys(v) + 4, v / 1000 + "k", { a: "end" }); }); d.forEach((p, i) => { if (p[0].endsWith("-01") && +p[0].slice(0, 4) % 2 === 0) text(f, xs(i), f.y1 + 18, p[0].slice(0, 4), { a: "middle" }); }); }
      el(f.s, "path", { d: line(pts) + `L${f.x1} ${f.y1}L${f.x0} ${f.y1}Z`, fill: css("--c1"), "fill-opacity": 0.12 });
      el(f.s, "path", { d: line(pts), fill: "none", stroke: css("--c1"), "stroke-width": 2, "stroke-linejoin": "round" });
      if (!o.small) crosshair(f, pts, (i) => `${d[i][0]}: ${d[i][1].toLocaleString()} minutes in the past 12 months`);
    },
    // What changed: passengers and the public drove the rise
    ttcCause(box, o = {}) {
      const d = P.ttcCause, f = frame(box, [8, 54, 8, o.small ? 8 : 166]), xs = scale(-2500, 13000, f.x0, f.x1), rh = (f.y1 - f.y0) / d.length, z = xs(0);
      el(f.s, "line", { x1: z, x2: z, y1: f.y0, y2: f.y1, stroke: f.ink3, "stroke-width": 1 });
      d.forEach(([n, fam, v], i) => { const y = f.y0 + i * rh, h = Math.min(rh - 3, 15), x = v >= 0 ? z : xs(v), w = Math.abs(xs(v) - z), r = el(f.s, "rect", { x, y: y + (rh - h) / 2, width: Math.max(w, 1), height: h, rx: 3, fill: /Passengers/.test(fam) ? css("--c2") : css("--muted") }); hover(r, `${n}: ${v > 0 ? "+" : ""}${Math.round(v).toLocaleString()} minutes a year`);
        if (!o.small) { text(f, f.x0 - 8, y + rh / 2 + 4, n.length > 25 ? n.slice(0, 24) + "…" : n, { a: "end" }); text(f, (v >= 0 ? xs(v) + 6 : z + 6), y + rh / 2 + 4, (v > 0 ? "+" : "") + Math.round(v).toLocaleString()); } });
    },
    // Each dot is a customer; coloured dots are worth a retention offer
    churn(box, o = {}) {
      const f = frame(box, o.small ? [8, 8, 8, 8] : [14, 14, 34, 44]), xs = scale(18, 120, f.x0, f.x1), ys = scale(0, 1, f.y1, f.y0);
      if (!o.small) { [0, 0.25, 0.5, 0.75, 1].forEach((v) => { hline(f, ys(v)); text(f, f.x0 - 8, ys(v) + 4, v * 100 + "%", { a: "end" }); }); [20, 40, 60, 80, 100, 120].forEach((v) => text(f, xs(v), f.y1 + 18, "$" + v, { a: "middle" })); }
      const c1 = css("--c1"), m = css("--muted"), r = o.small ? 1.5 : 2.8, g = el(f.s, "g");
      g.innerHTML = P.churn.map(([p, b, off]) => `<circle cx="${xs(b).toFixed(1)}" cy="${ys(p).toFixed(1)}" r="${r}" fill="${off ? c1 : m}" fill-opacity="${off ? 0.85 : 0.4}"/>`).join("");
    },
    // Weeks of the year across, years down: the dark band each November is the smog season
    delhi(box, o = {}) {
      const f = frame(box, o.small ? [6, 6, 6, 6] : [8, 10, 24, 44]), yrs = [2015, 2016, 2017, 2018, 2019, 2020], cw = (f.x1 - f.x0) / 52, ch = (f.y1 - f.y0) / 6, lo = css("--seq-lo"), hi = css("--seq-hi");
      const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = hex(lo), B = hex(hi), col = (v) => { const t = Math.min(1, Math.max(0, (v - 25) / 300)) ** 0.8; return `rgb(${A.map((c, i) => Math.round(c + (B[i] - c) * t))})`; };
      P.delhi.forEach(([y, w, v]) => { const r = el(f.s, "rect", { x: f.x0 + w * cw, y: f.y0 + yrs.indexOf(y) * ch, width: Math.max(cw - 1.5, 1), height: Math.max(ch - 2, 2), rx: 1.5, fill: col(v) }); hover(r, `${y}, week ${w + 1}: PM2.5 about ${v}`); });
      if (!o.small) { yrs.forEach((y, i) => text(f, f.x0 - 8, f.y0 + i * ch + ch / 2 + 4, y, { a: "end" })); ["Jan", "Mar", "May", "Jul", "Sep", "Nov"].forEach((m, i) => text(f, f.x0 + i * 8.7 * cw, f.y1 + 16, m)); }
    },
    // Cash stays near 12% of GDP
    cash(box, o = {}) {
      const f = frame(box, o.small ? [8, 8, 8, 8] : [20, 14, 30, 40]), d = P.cash, xs = scale(0, d.length - 1, f.x0, f.x1), ys = scale(0, 16, f.y1, f.y0), pts = d.map((p, i) => [xs(i), ys(p[1])]);
      if (!o.small) { [0, 4, 8, 12, 16].forEach((v) => { hline(f, ys(v)); text(f, f.x0 - 8, ys(v) + 4, v + "%", { a: "end" }); }); d.forEach((p, i) => { if (i % 5 === 0) text(f, xs(i), f.y1 + 18, p[0], { a: i === d.length - 1 ? "end" : i === 0 ? "start" : "middle" }); }); }
      el(f.s, "path", { d: line(pts), fill: "none", stroke: css("--c1"), "stroke-width": 2, "stroke-linejoin": "round" });
      if (!o.small) { const i = d.findIndex((p) => p[0] === "2016-17"); text(f, pts[i][0], pts[i][1] + 20, "demonetisation", { a: "middle", fill: f.ink }); crosshair(f, pts, (b) => `${d[b][0]}: cash ${d[b][1]}% of GDP${d[b][2] ? " · " + d[b][2] : ""}`); }
    },
    // Every draw: the stream decides the score you need
    ee(box, o = {}) {
      const f = frame(box, o.small ? [8, 8, 8, 8] : [14, 14, f_bottom(box), 40]), t0 = +new Date("2015-01-01"), t1 = +new Date("2026-12-31"), xs = scale(t0, t1, f.x0, f.x1), ys = scale(50, 950, f.y1, f.y0);
      const fam = { "All programs": "--c3", "Canadian Experience Class": "--c1", "Provincial nominees": "--c4", "French speakers": "--c2", "Occupation categories": "--c5", "Other federal programs": "--muted" };
      if (!o.small) { [200, 400, 600, 800].forEach((v) => { hline(f, ys(v)); text(f, f.x0 - 8, ys(v) + 4, v, { a: "end" }); }); [2015, 2017, 2019, 2021, 2023, 2025].forEach((y) => text(f, xs(+new Date(y + "-01-01")), f.y1 + 18, y, { a: "middle" })); }
      P.ee.forEach(([d, v, s]) => { const c = el(f.s, "circle", { cx: xs(+new Date(d)), cy: ys(v), r: o.small ? 1.7 : 3.4, fill: css(fam[s]), "fill-opacity": 0.85 }); hover(c, `${d}: ${s}, cutoff ${v}`); });
      if (!o.small) { let x = f.x0, y = f.y1 + 40; [["All programs", "--c3"], ["CEC", "--c1"], ["Provincial", "--c4"], ["French", "--c2"], ["Category", "--c5"], ["Other", "--muted"]].forEach(([n, c]) => { const w = 26 + n.length * 6.6; if (x + w > f.W - 4) { x = f.x0; y += 18; } el(f.s, "circle", { cx: x + 5, cy: y - 4, r: 5, fill: css(c) }); text(f, x + 15, y, n); x += w; }); }
    },
    // Yearly return of each fund, with the index fund picked out
    funds(box, o = {}) {
      const d = P.funds, f = frame(box, [8, 46, 8, o.small ? 8 : 150]), xs = scale(9, 15, f.x0, f.x1), rh = (f.y1 - f.y0) / d.length, ix = d.find((x) => x[2]);
      d.slice().reverse().forEach(([n, v, isI], i) => { const y = f.y0 + i * rh + rh / 2, c = isI ? css("--c2") : css("--c1"); el(f.s, "line", { x1: xs(9), x2: xs(v), y1: y, y2: y, stroke: isI ? c : f.grid, "stroke-width": 1.5 }); const p = el(f.s, "circle", { cx: xs(v), cy: y, r: o.small ? 2.2 : 4, fill: c }); hover(p, `${n}: ${v}% a year`);
        if (!o.small && rh > 11) { text(f, f.x0 - 8, y + 4, n.slice(0, 22), { a: "end", size: 11, fill: isI ? f.ink : f.ink2, w: isI ? 600 : 400 }); text(f, xs(v) + 8, y + 4, v + "%", { size: 11 }); } });
      el(f.s, "line", { x1: xs(ix[1]), x2: xs(ix[1]), y1: f.y0, y2: f.y1, stroke: css("--c2"), "stroke-width": 1, "stroke-dasharray": "3 4" });
    },
    // 7-day retention by group, and why the split mattered
    cats(box, o = {}) {
      const f = frame(box, o.small ? [10, 10, 18, 10] : [24, 14, 44, 44]), seg = ["reached level 30", "never reached level 30"], ys = scale(0, 50, f.y1, f.y0), gw = (f.x1 - f.x0) / 2, bw = Math.min(gw * 0.26, 54);
      if (!o.small) [0, 25, 50].forEach((v) => { hline(f, ys(v)); text(f, f.x0 - 8, ys(v) + 4, v + "%", { a: "end" }); });
      seg.forEach((sg, i) => { ["gate_30", "gate_40"].forEach((g, k) => { const r = P.cats.find((x) => x[0] === sg && x[1] === g), x = f.x0 + i * gw + gw / 2 + (k ? 2 : -bw - 2), b = el(f.s, "rect", { x, y: ys(r[3]), width: bw, height: f.y1 - ys(r[3]), rx: 4, fill: k ? css("--c2") : css("--c1") }); hover(b, `${sg}, ${g.replace("_", " ")}: ${r[3]}% back after 7 days, ${r[2].toLocaleString()} players`); if (!o.small) text(f, x + bw / 2, ys(r[3]) - 7, r[3] + "%", { a: "middle", fill: f.ink }); });
        if (!o.small) text(f, f.x0 + i * gw + gw / 2, f.y1 + 18, sg, { a: "middle" }); });
      if (!o.small) { const y = f.y1 + 36; let x = f.x0; [["Gate 30", "--c1"], ["Gate 40", "--c2"]].forEach(([n, c]) => { el(f.s, "rect", { x, y: y - 9, width: 10, height: 10, rx: 2, fill: css(c) }); text(f, x + 15, y, n); x += 76; }); }
    },
    // Share of men by sector
    work(box, o = {}) {
      const d = P.work, f = frame(box, [8, 46, 8, o.small ? 8 : 150]), xs = scale(0, 100, f.x0, f.x1), rh = (f.y1 - f.y0) / d.length;
      d.forEach(([n, v], i) => { const y = f.y0 + i * rh, h = Math.min(rh - 3, 15), r = el(f.s, "rect", { x: f.x0, y: y + (rh - h) / 2, width: xs(v) - f.x0, height: h, rx: 3, fill: i === 0 ? css("--c2") : css("--c1"), "fill-opacity": i === 0 ? 1 : 0.7 }); hover(r, `${n}: ${v}% men, 2023`); if (!o.small) { text(f, f.x0 - 8, y + rh / 2 + 4, n, { a: "end" }); text(f, xs(v) + 6, y + rh / 2 + 4, Math.round(v) + "%"); } });
    },
    // Share of attacks: a single proportion, drawn as a 100-square grid
    terror(box, o = {}) {
      box.innerHTML = ""; const W = Math.max(100, box.clientWidth), H = Math.max(70, box.clientHeight), s = el(box, "svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" }), n = 10, g = Math.min((W - 20) / n, (H - 20) / n), x0 = (W - g * n) / 2, y0 = (H - g * n) / 2;
      for (let i = 0; i < 100; i++) el(s, "rect", { x: x0 + (i % n) * g, y: y0 + Math.floor(i / n) * g, width: g - 3, height: g - 3, rx: 2, fill: i < 46 ? css("--c2") : css("--muted"), "fill-opacity": i < 46 ? 1 : 0.35 });
    },
  };

  // the projects, in the order they appear; the title of each chart is its finding
  window.PROJECTS = [
    { id: "ipl", chart: "ipl", tag: "IPL 2025", title: "Auction price barely predicts performance", stat: "10%", statText: "of performance explained by price", note: "Each dot is a player. Coloured dots beat the average player, grey fell short.", page: "ipl" },
    { id: "ttc", chart: "ttc", tag: "Toronto subway", title: "Subway delays nearly doubled", stat: "+85%", statText: "delay minutes vs 2014–16", note: "Minutes of delay in the past 12 months.", page: "ttc" },
    { id: "cause", chart: "ttcCause", tag: "Toronto subway", title: "Passengers drove the rise, not trains", stat: "76%", statText: "of the extra delay", note: "Change in delay minutes a year, 2014–16 to 2023–25. Orange is passengers and the public.", page: "ttc" },
    { id: "churn", chart: "churn", tag: "Telecom churn", title: "Only 29% of customers are worth an offer", stat: "+$92k", statText: "vs −$122k offering everyone", note: "Each dot is a customer, by bill and chance of leaving. Coloured dots are worth the offer.", page: "churn" },
    { id: "delhi", chart: "delhi", tag: "Delhi air", title: "The smog comes back every November", stat: "~60%", statText: "of early-November smog is crop fires", note: "Weekly PM2.5, 2015–2020. The stronger the colour, the worse the air.", page: "delhi" },
    { id: "cash", chart: "cash", tag: "UPI vs cash", title: "UPI won, yet cash stayed near 12% of GDP", stat: "~12%", statText: "of GDP, same as before UPI", note: "Cash in circulation as a share of GDP.", page: "upi" },
    { id: "ee", chart: "ee", tag: "Canada PR", title: "Your stream decides the score you need", stat: "169–523", statText: "CRS cutoffs across 2026 streams", note: "All 448 Express Entry draws. Each dot is a draw's cutoff.", page: "express-entry" },
    { id: "funds", chart: "funds", tag: "Mutual funds", title: "19 of 20 surviving funds beat the index", stat: "19 of 20", statText: "surviving funds ahead", note: "Yearly return, 2013–2026. Nine closed funds aren't shown, so real results are worse.", page: "funds" },
    { id: "cats", chart: "cats", tag: "Cookie Cats A/B test", title: "A broken split changed the answer", stat: "823", statText: "extra low-activity players in one group", note: "Share of players back after 7 days. Gate 40 got 823 extra players in the group that barely plays, on the right.", page: "ab-test" },
    { id: "work", chart: "work", tag: "US workforce", title: "Construction is 89% men", stat: "89%", statText: "of construction workers are men", note: "Share of men by sector, 2023.", page: "workforce" },
    { id: "terror", chart: "terror", tag: "Global terrorism", title: "Three countries had 46% of attacks", stat: "46%", statText: "of 2012–17 attacks", note: "Iraq, Pakistan and Afghanistan, out of every 100 attacks.", page: "terrorism" },
  ];
  window.CHARTS = C;
  window.drawAll = () => document.querySelectorAll("[data-chart]").forEach((b) => C[b.dataset.chart](b, { small: b.dataset.small !== undefined }));
  let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(window.drawAll, 150); });
})();
