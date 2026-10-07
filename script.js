// Coming back with the Back button restores the page as it was, including the clicked card's focus: clear it
window.addEventListener("pageshow", (event) => {
  if (event.persisted && document.activeElement) document.activeElement.blur();
});

// Header gets a little more solid once the page scrolls
const header = document.querySelector(".site-header");
if (header) {
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// Fade sections in as they enter the viewport
const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });   // fires as soon as a section peeks in, however tall
  reveals.forEach((el) => observer.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("visible"));
}

// Project carousel: centre card plus faded neighbours, arrows, dots, keyboard and swipe
document.querySelectorAll(".cc").forEach((root) => {
  const cards = [...root.querySelectorAll(".cc-card")];
  const dots = [...root.parentElement.querySelectorAll(".cc-dot")];
  const live = root.querySelector(".cc-live");
  const n = cards.length;
  let active = 0;

  function render() {
    cards.forEach((card, i) => {
      let d = (i - active + n) % n;
      if (d > n / 2) d -= n;                                   // shortest way round the loop
      card.dataset.pos = Math.abs(d) <= 2 ? String(d) : "hidden";
      const isActive = d === 0;
      card.setAttribute("aria-hidden", isActive ? "false" : "true");
      card.querySelectorAll("a").forEach((a) => { a.tabIndex = isActive ? 0 : -1; });
    });
    dots.forEach((dot, i) => dot.setAttribute("aria-current", i === active ? "true" : "false"));
    if (live) live.textContent = "Project " + (active + 1) + " of " + n + ": " + cards[active].querySelector("h3").textContent;
  }

  const go = (i) => { active = (i + n) % n; render(); };
  root.querySelector(".cc-prev").addEventListener("click", () => go(active - 1));
  root.querySelector(".cc-next").addEventListener("click", () => go(active + 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => go(i)));

  // clicking any card (centre or side) opens that project; a swipe never counts as a click
  let swiped = false;
  cards.forEach((card) => card.addEventListener("click", (e) => {
    if (swiped) { e.preventDefault(); swiped = false; return; }
    const link = card.querySelector("h3 a");
    if (!e.target.closest("a") && link) window.location.href = link.href;
  }));

  // clicking empty space moves the carousel in that direction
  root.addEventListener("click", (e) => {
    if (e.target.closest(".cc-card, button, a")) return;
    const box = root.getBoundingClientRect();
    go(active + (e.clientX < box.left + box.width / 2 ? -1 : 1));
  });

  // left/right arrow keys work whenever the carousel is on screen
  const onScreen = () => {
    const r = root.getBoundingClientRect();
    return r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.25;
  };
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (!onScreen() && !root.contains(document.activeElement)) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    e.preventDefault();
    go(active + (e.key === "ArrowRight" ? 1 : -1));
  });

  let startX = null;
  root.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  root.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) { swiped = true; go(active + (dx < 0 ? 1 : -1)); setTimeout(() => { swiped = false; }, 0); }
  });

  render();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));   // no slide-in on page load
});

// The four results next to the hero chart change with it (IPL, subway delays, churn)
const RESULTS = [
  ["projects/ipl.html", [["10%", "of IPL performance explained by auction price"], ["₹1,180cr", "spent at auction on 226 players"],
    ["36%", "of budget buys never played"], ["290k+", "ball-by-ball records analysed"]]],
  ["projects/ttc.html", [["+85%", "more subway delay minutes than in 2014–16"], ["76%", "of the rise comes from passengers, not trains"],
    ["−12%", "train breakdowns actually fell"], ["47%", "fewer signal delays on Line 1 after its upgrade"]]],
  ["projects/churn.html", [["+$92k", "profit from one targeted campaign"], ["−$122k", "if you offer it to everyone instead"],
    ["29%", "of customers are worth an offer"], ["30 / 30", "cost scenarios where targeting wins"]]],
];
const viz = document.querySelector(".hero-viz");
const results = [...document.querySelectorAll(".results .result")];
if (viz && results.length === 4) {
  let shown = 0;
  const show = (k) => {
    if (k === shown || !RESULTS[k]) return;
    shown = k;
    const [href, rows] = RESULTS[k];
    results.forEach((el, n) => {
      el.classList.add("swap");
      setTimeout(() => {
        el.href = href;
        el.querySelector("b").textContent = rows[n][0];
        el.querySelector("span").textContent = rows[n][1];
        el.classList.remove("swap");
      }, 150 + n * 50);
    });
  };
  viz.addEventListener("scenechange", (e) => show(e.detail));                     // the chart moved on by itself
  viz.querySelectorAll(".viz-tab").forEach((tab, k) => tab.addEventListener("click", () => show(k)));   // or a tab was clicked
}
