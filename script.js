// Theme toggle: remembers the visitor's choice when the browser allows storage
const root = document.documentElement;
const toggle = document.querySelector(".theme-toggle");

function currentTheme() {
  if (root.dataset.theme) return root.dataset.theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

toggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) { /* storage blocked: theme still switches */ }
});

// Header border once the page scrolls
const header = document.querySelector(".site-header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

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
const showcase = document.querySelector(".showcase");
if (showcase) {
  const cards = [...showcase.querySelectorAll(".sc-card")];
  const dots = [...showcase.querySelectorAll(".sc-dot")];
  const live = showcase.querySelector(".sc-live");
  const touch = window.matchMedia("(hover: none)").matches;
  const n = cards.length;
  let active = 0;

  if (touch) showcase.querySelectorAll(".sc-hint").forEach((h) => { h.textContent = "Tap for details"; });

  function render() {
    cards.forEach((card, i) => {
      let d = (i - active + n) % n;
      if (d > n / 2) d -= n;                                   // shortest way round the loop
      card.dataset.pos = Math.abs(d) <= 2 ? String(d) : "hidden";
      const isActive = d === 0;
      card.setAttribute("aria-hidden", isActive ? "false" : "true");
      card.querySelectorAll("a, .sc-frame").forEach((el) => { el.tabIndex = isActive ? 0 : -1; });
      if (!isActive) card.classList.remove("is-open");
    });
    dots.forEach((dot, i) => dot.setAttribute("aria-current", i === active ? "true" : "false"));
    live.textContent = "Project " + (active + 1) + " of " + n + ": " + cards[active].querySelector(".sc-title").textContent;
  }

  const go = (i) => { active = (i + n) % n; render(); };
  showcase.querySelector(".sc-prev").addEventListener("click", () => go(active - 1));
  showcase.querySelector(".sc-next").addEventListener("click", () => go(active + 1));
  dots.forEach((dot) => dot.addEventListener("click", () => go(Number(dot.dataset.go))));

  cards.forEach((card, i) => {
    card.querySelector(".sc-frame").addEventListener("click", (e) => {
      if (i !== active) { e.preventDefault(); go(i); return; }       // a side card brings itself to the centre
      if (touch && !e.target.closest("a")) card.classList.toggle("is-open");
    });
  });

  showcase.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    go(active + (e.key === "ArrowRight" ? 1 : -1));
    cards[active].querySelector(".sc-frame").focus({ preventScroll: true });
  });

  let startX = null;
  const stage = showcase.querySelector(".showcase-stage");
  stage.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  stage.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) go(active + (dx < 0 ? 1 : -1));
  });

  render();
}
