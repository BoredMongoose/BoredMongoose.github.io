// Theme toggle: the site is cream by default; the visitor can switch to dark, and the choice is remembered
// when the browser allows storage
const root = document.documentElement;
const toggle = document.querySelector(".theme-toggle");

toggle.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("site-theme", next); } catch (e) { /* storage blocked: theme still switches */ }
});

// Coming back with the Back button restores the page as it was, including the clicked card's focus: clear it
window.addEventListener("pageshow", (event) => {
  if (event.persisted && document.activeElement) document.activeElement.blur();
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
