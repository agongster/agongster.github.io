// AI assistance note: an AI coding assistant helped draft this theme-toggle logic.
// It was kept intentionally small and adapted for this portfolio's design.

const themeToggle = document.querySelector(".theme-toggle");
const savedTheme = localStorage.getItem("theme");

function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.textContent = isDark ? "☀ Day mode" : "🌙 Night mode";
}

setTheme(savedTheme || "light");

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", nextTheme);
  setTheme(nextTheme);
});

// Little flower bloom that follows each click
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!prefersReducedMotion) {
  const flowerPalettes = [
    ["#8fe9f0", "#eafcfd"],
    ["#5fd8e6", "#0f95ac"],
    ["#bcdff0", "#fff8ec"],
    ["#cdeef0", "#0b6d7d"],
  ];

  document.addEventListener("click", (event) => {
    const [petal, center] = flowerPalettes[Math.floor(Math.random() * flowerPalettes.length)];
    const flower = document.createElement("div");
    flower.className = "click-flower";
    flower.style.left = `${event.clientX}px`;
    flower.style.top = `${event.clientY}px`;
    flower.innerHTML = `
      <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
        <g fill="${petal}">
          <ellipse cx="20" cy="9" rx="5" ry="8" transform="rotate(0 20 20)" />
          <ellipse cx="20" cy="9" rx="5" ry="8" transform="rotate(72 20 20)" />
          <ellipse cx="20" cy="9" rx="5" ry="8" transform="rotate(144 20 20)" />
          <ellipse cx="20" cy="9" rx="5" ry="8" transform="rotate(216 20 20)" />
          <ellipse cx="20" cy="9" rx="5" ry="8" transform="rotate(288 20 20)" />
        </g>
        <circle cx="20" cy="20" r="4.5" fill="${center}" />
      </svg>
    `;
    document.body.appendChild(flower);
    flower.addEventListener("animationend", () => flower.remove());
  });
}

// Give each flying bird a random size, starting spot, and speed on every load
const flyingBirds = document.querySelectorAll(".flying-bird");
if (!prefersReducedMotion) {
  const isNarrow = window.innerWidth < 600;
  const widthRange = isNarrow ? [55, 100] : [80, 160];
  flyingBirds.forEach((bird) => {
    const width = widthRange[0] + Math.random() * (widthRange[1] - widthRange[0]);
    const top = 4 + Math.random() * 56;
    const left = -(15 + Math.random() * 28);
    const duration = 10 + Math.random() * 16;
    const delay = -(Math.random() * duration);
    bird.style.width = `${width.toFixed(0)}px`;
    bird.style.top = `${top.toFixed(1)}%`;
    bird.style.left = `${left.toFixed(1)}%`;
    bird.style.animationDuration = `${duration.toFixed(1)}s`;
    bird.style.animationDelay = `${delay.toFixed(1)}s`;
  });
}

// Fade content in as it scrolls into view
const revealEls = document.querySelectorAll(".reveal");
if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
}

// Headings shift through the hero's blue palette as they scroll past
if (!prefersReducedMotion) {
  const scrollHeadings = document.querySelectorAll(".section-head h2, .section-head h3");
  let scrollTicking = false;

  function updateScrollEffects() {
    const viewportH = window.innerHeight;

    scrollHeadings.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const progress = Math.min(1, Math.max(0, 1 - elCenter / viewportH));
      el.style.color = `color-mix(in srgb, var(--heading-scroll-end) ${(progress * 58).toFixed(1)}%, var(--ink))`;
    });

    scrollTicking = false;
  }

  function onScroll() {
    if (!scrollTicking) {
      requestAnimationFrame(updateScrollEffects);
      scrollTicking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateScrollEffects();
}

// Cards reveal their details on hover; clicking one pins it open
document.querySelectorAll(".expand-card").forEach((card) => {
  card.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    card.classList.toggle("is-open");
  });
});
