// Retention dashboard: filters + offer economics -> KPIs, a risk-vs-bill scatter, reasons and a contact list.
// Data: assets/data/retention.json (built by site-tools/build_dashboard_data.py from the churn project).
(async () => {
  const $ = (id) => document.getElementById(id);
  const MONTHS_KEPT = 12, MARGIN = 0.6;
  const TENURE = [["0–6 months", 0, 6], ["7–12 months", 7, 12], ["1–2 years", 13, 24], ["2–4 years", 25, 48], ["4–6 years", 49, 72]];

  let data;
  try {
    data = await (await fetch("../assets/data/retention.json")).json();
  } catch (e) {
    document.querySelector(".dash-main").insertAdjacentHTML("afterbegin", '<p class="dash-error">The data could not be loaded.</p>');
    return;
  }
  const L = data.levels;
  const customers = data.rows.map((r) => ({
    id: r[0], p: r[1], bill: r[2], tenure: r[3], contract: r[4], internet: r[5], payment: r[6],
    reason1: L.reasons[r[7]], reason2: L.reasons[r[8]],
    tenureBand: TENURE.findIndex(([, lo, hi]) => r[3] >= lo && r[3] <= hi),
  }));

  // ---- state and controls ------------------------------------------------------------------
  const options = { contract: L.contract, internet: L.internet.map((v) => (v === "No" ? "No internet" : v)), payment: L.payment, tenure: TENURE.map((t) => t[0]) };
  const state = {};
  function resetState() {
    state.cost = 60; state.rate = 0.3;
    for (const key of Object.keys(options)) state[key] = new Set(options[key].map((_, i) => i));
    $("cost").value = 60; $("rate").value = 30;
  }
  resetState();

  document.querySelectorAll(".chips").forEach((box) => {
    const key = box.dataset.filter;
    options[key].forEach((label, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = label; b.setAttribute("aria-pressed", "true");
      b.addEventListener("click", () => {
        if (state[key].has(i) && state[key].size === 1) return;     // keep at least one option selected
        state[key].has(i) ? state[key].delete(i) : state[key].add(i);
        b.setAttribute("aria-pressed", state[key].has(i) ? "true" : "false");
        update();
      });
      box.appendChild(b);
    });
  });
  $("cost").addEventListener("input", (e) => { state.cost = +e.target.value; update(); });
  $("rate").addEventListener("input", (e) => { state.rate = +e.target.value / 100; update(); });
  $("reset").addEventListener("click", () => {
    resetState();
    document.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", "true"));
    update();
  });

  // ---- calculations ----------------------------------------------------------------------------
  const valueIfSaved = (bill) => MONTHS_KEPT * MARGIN * bill;
  const money = (v, digits = 0) => (v < 0 ? "−" : "") + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const pct = (v) => `${(100 * v).toFixed(0)}%`;

  let view = [], targets = [];
  function compute() {
    view = customers.filter((c) => state.contract.has(c.contract) && state.internet.has(c.internet)
      && state.payment.has(c.payment) && state.tenure.has(c.tenureBand));
    for (const c of view) c.ev = c.p * state.rate * valueIfSaved(c.bill) - state.cost;
    targets = view.filter((c) => c.ev > 0).sort((a, b) => b.ev - a.ev);
  }

  function renderKpis() {
    const n = view.length;
    const leave = view.reduce((s, c) => s + c.p, 0);
    const risk = view.reduce((s, c) => s + c.p * c.bill, 0);
    const profit = targets.reduce((s, c) => s + c.ev, 0);
    const kept = targets.reduce((s, c) => s + c.p * state.rate, 0);
    $("k-customers").textContent = n.toLocaleString("en-US");
    $("k-customers-sub").textContent = n === customers.length ? "all customers" : `of ${customers.length.toLocaleString("en-US")}`;
    $("k-leave").textContent = Math.round(leave).toLocaleString("en-US");
    $("k-leave-sub").textContent = n ? `${pct(leave / n)} of these customers` : "";
    $("k-risk").textContent = money(risk);
    $("k-target").textContent = targets.length.toLocaleString("en-US");
    $("k-target-sub").textContent = n ? `${pct(targets.length / n)} of these customers` : "";
    $("k-profit").textContent = money(profit);
    $("k-profit-sub").textContent = `${money(targets.length * state.cost)} spent, ~${Math.round(kept)} customers kept`;
    $("cost-out").textContent = money(state.cost);
    $("rate-out").textContent = pct(state.rate);
  }

  function bars(rows, format = (v) => v.toLocaleString("en-US")) {
    const max = Math.max(...rows.map((r) => r[1]), 1);
    return rows.map(([k, v]) => `<div class="bar-row"><span class="bar-label">${k}</span><span class="bar-track"><span class="bar-fill" style="width:${(100 * v) / max}%"></span></span><span class="bar-value">${format(v)}</span></div>`).join("");
  }

  function renderRiskByContract() {
    const rows = L.contract.map((name, i) => [name, view.filter((c) => c.contract === i).reduce((s, c) => s + c.p * c.bill, 0)])
      .filter((r) => r[1] > 0);
    $("risk-contract").innerHTML = rows.length ? bars(rows, (v) => money(v)) : '<p class="dash-empty">No customers in view.</p>';
  }

  function renderReasons() {
    const counts = new Map();
    for (const c of targets) {
      const key = c.reason1.split(":")[0];
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    $("reasons").innerHTML = rows.length ? bars(rows)
      : '<p class="dash-empty">No customer in this view is worth an offer at these settings.</p>';
  }

  function renderTable() {
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    $("contact-rows").innerHTML = targets.slice(0, 25).map((c) => `<tr><td class="mono">${c.id}</td><td>${pct(c.p)}</td>
      <td>${money(c.bill, 2)}</td><td><strong>${money(c.ev)}</strong></td><td>${esc(c.reason1)}</td><td>${esc(c.reason2)}</td></tr>`).join("")
      || '<tr><td colspan="6" class="dash-empty">Nobody to contact at these settings.</td></tr>';
    $("download").disabled = !targets.length;
  }

  $("download").addEventListener("click", () => {
    const head = "customer_id,churn_probability,monthly_bill,expected_profit,contract,internet,payment,tenure_months,main_reason,second_reason";
    const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = targets.map((c) => [c.id, c.p, c.bill, c.ev.toFixed(2), L.contract[c.contract], L.internet[c.internet],
      L.payment[c.payment], c.tenure, q(c.reason1), q(c.reason2)].join(","));
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `retention_contact_list_cost${state.cost}_keep${Math.round(state.rate * 100)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // ---- scatter -----------------------------------------------------------------------------
  const canvas = document.querySelector(".dash-scatter canvas");
  const ctx = canvas.getContext("2d");
  const tip = document.querySelector(".dash-scatter .viz-tip");
  const X0 = 18, X1 = 120;
  let W = 0, H = 0, dpr = 1, plot = null, colours = {};

  function readColours() {
    const css = getComputedStyle(document.documentElement);
    colours = { hi: css.getPropertyValue("--accent").trim(), lo: css.getPropertyValue("--ink-3").trim(),
                ink: css.getPropertyValue("--ink-2").trim(), line: css.getPropertyValue("--line").trim() };
  }
  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    W = box.width; H = box.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    plot = { left: 50, right: W - 14, top: 10, bottom: H - 34 };
    plot.w = plot.right - plot.left; plot.h = plot.bottom - plot.top;
  }
  const px = (bill) => plot.left + ((bill - X0) / (X1 - X0)) * plot.w;
  const py = (p) => plot.bottom - p * plot.h;

  function drawScatter(highlight = null) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.strokeStyle = colours.line; ctx.fillStyle = colours.ink; ctx.lineWidth = 1;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.beginPath(); ctx.moveTo(plot.left, py(v)); ctx.lineTo(plot.right, py(v)); ctx.stroke();
      ctx.fillText(`${v * 100}%`, plot.left - 6, py(v));
    }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (const v of [20, 40, 60, 80, 100, 120]) ctx.fillText(`$${v}`, px(v), plot.bottom + 6);
    ctx.fillText("Monthly bill", plot.left + plot.w / 2, plot.bottom + 20);
    ctx.save(); ctx.translate(12, plot.top + plot.h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("Chance of leaving", 0, -6); ctx.restore();

    for (const pass of [0, 1]) {                         // draw the "not worth it" dots first, the targets on top
      ctx.fillStyle = pass ? colours.hi : colours.lo;
      ctx.globalAlpha = pass ? 0.85 : 0.35;
      for (const c of view) {
        if ((c.ev > 0) !== Boolean(pass)) continue;
        ctx.beginPath(); ctx.arc(px(c.bill), py(c.p), 2.1, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // break-even line: risk where the offer exactly pays for itself
    ctx.strokeStyle = colours.ink; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    let started = false;
    for (let bill = X0; bill <= X1; bill += 0.5) {
      const p = state.cost / (state.rate * valueIfSaved(bill));
      if (p > 1) continue;
      started ? ctx.lineTo(px(bill), py(p)) : ctx.moveTo(px(bill), py(p));
      started = true;
    }
    ctx.stroke(); ctx.setLineDash([]);
    if (highlight) {
      ctx.strokeStyle = colours.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px(highlight.bill), py(highlight.p), 5, 0, Math.PI * 2); ctx.stroke();
    }
  }

  canvas.parentElement.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bestD = 10 * 10;
    for (const c of view) {
      const d = (px(c.bill) - mx) ** 2 + (py(c.p) - my) ** 2;
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) { tip.hidden = true; drawScatter(); return; }
    tip.textContent = `${best.id} · ${money(best.bill, 2)} a month · ${pct(best.p)} risk · offer ${best.ev > 0 ? "worth " + money(best.ev) : "not worth it"}`;
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(px(best.bill) - tw / 2, 4), W - tw - 4) + "px";
    tip.style.top = Math.max(py(best.p) - tip.offsetHeight - 12, 4) + "px";
    drawScatter(best);
  });
  canvas.parentElement.addEventListener("pointerleave", () => { tip.hidden = true; drawScatter(); });

  // ---- wire up -------------------------------------------------------------------------------
  let pending = 0;
  function render() {
    compute(); renderKpis(); renderReasons(); renderRiskByContract(); renderTable(); drawScatter();
  }
  function update() {                 // slider drags: at most one render per frame
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(render);
  }
  readColours();
  resize();
  render();                           // first render straight away, even in a background tab
  new ResizeObserver(() => { resize(); drawScatter(); }).observe(canvas.parentElement);
  new MutationObserver(() => { readColours(); drawScatter(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColours(); drawScatter(); });
})();
