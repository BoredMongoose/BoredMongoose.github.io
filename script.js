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

  // a side card brings itself to the centre instead of opening
  cards.forEach((card, i) => card.addEventListener("click", (e) => {
    if (i !== active) { e.preventDefault(); go(i); }
  }));

  root.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    go(active + (e.key === "ArrowRight" ? 1 : -1));
  });

  let startX = null;
  root.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  root.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) go(active + (dx < 0 ? 1 : -1));
  });

  render();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));   // no slide-in on page load
});
