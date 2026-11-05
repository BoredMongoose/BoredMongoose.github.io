// Homepage: fill the wall with chart tiles, and open any of them large in a dialog.
(() => {
  const $ = (id) => document.getElementById(id), wall = $("work"), d = $("detail"), big = $("detail-chart");
  wall.innerHTML = window.PROJECTS.map((p, i) => `<button type="button" class="t" data-i="${i}" aria-label="${p.tag}: ${p.title}. Open the chart.">
      <small>${p.tag}</small><b>${p.title}</b>
      <div class="plot" data-chart="${p.chart}" data-small aria-hidden="true"></div>
      <div class="n">${p.stat}<span>${p.statText}</span></div></button>`).join("") +
    `<div class="t me" id="contact"><b>Open to data analyst roles, Delhi NCR or remote</b>
      <div><a href="mailto:milind.sax01@gmail.com">milind.sax01@gmail.com</a><a href="assets/Milind_Saxena_Resume.pdf">Download résumé</a></div></div>`;

  wall.addEventListener("click", (e) => {
    const b = e.target.closest("button.t"); if (!b) return;
    const p = window.PROJECTS[+b.dataset.i];
    $("detail-tag").textContent = p.tag; $("detail-title").textContent = p.title; $("detail-note").textContent = p.note;
    $("detail-link").href = `projects/${p.page}.html`;
    d.showModal(); big.dataset.chart = p.chart; window.CHARTS[p.chart](big, {});
  });
  $("detail-close").addEventListener("click", () => d.close());
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  d.addEventListener("close", () => { delete big.dataset.chart; big.innerHTML = ""; });

  window.drawAll();
  document.fonts.ready.then(window.drawAll);
})();
