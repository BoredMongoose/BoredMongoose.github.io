// Homepage: fill the wall with chart tiles, and open any of them large in a dialog.
(() => {
  const $ = (id) => document.getElementById(id), wall = $("work"), d = $("detail"), big = $("detail-chart");
  wall.innerHTML = window.PROJECTS.map((p, i) => `<button type="button" class="t" data-i="${i}" aria-label="${p.tag}: ${p.title}. Open the summary.">
      <small>${p.tag}</small><b>${p.title}</b>
      <div class="plot" data-chart="${p.chart}" data-small aria-hidden="true"></div>
      <div class="n">${p.stat}<span>${p.statText}</span></div></button>`).join("") +
    `<div class="t me" id="contact"><b>Open to data analyst roles, Delhi NCR or remote</b>
      <div><a href="mailto:milind.sax01@gmail.com">milind.sax01@gmail.com</a><a href="assets/Milind_Saxena_Resume.pdf">Download résumé</a></div></div>`;

  function open(i, push = true) {
    const p = window.PROJECTS[i]; if (!p) return;
    $("detail-tag").textContent = p.tag; $("detail-title").textContent = p.title; $("detail-note").textContent = p.note;
    $("detail-link").href = `projects/${p.page}.html`;
    const s = window.SUMMARIES[p.page] || {};
    ["q", "a", "rec", "data", "tools"].forEach((k) => { $("sum-" + k).textContent = s[k] || ""; });
    if (!d.open) d.showModal();
    big.dataset.chart = p.chart; window.CHARTS[p.chart](big, {});
    if (push) history.replaceState(null, "", "#" + p.id);
  }
  wall.addEventListener("click", (e) => { const b = e.target.closest("button.t"); if (b) open(+b.dataset.i); });
  $("detail-close").addEventListener("click", () => d.close());
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  d.addEventListener("close", () => { delete big.dataset.chart; big.innerHTML = ""; if (location.hash && !/^#(work|about|contact)$/.test(location.hash)) history.replaceState(null, "", location.pathname); });
  // a link like /#churn opens that chart straight away
  const fromHash = () => { const i = window.PROJECTS.findIndex((p) => "#" + p.id === location.hash); if (i >= 0) open(i, false); };
  addEventListener("hashchange", fromHash);

  window.drawAll();
  document.fonts.ready.then(window.drawAll);
  fromHash();
})();
