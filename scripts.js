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

setTheme(savedTheme || "dark");

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

// Twinkling stars (dark mode) and falling petals (light mode) drift behind the content
if (!prefersReducedMotion) {
  const starsBg = document.getElementById("stars-bg");
  if (starsBg) {
    const starFragment = document.createDocumentFragment();
    for (let i = 0; i < 70; i++) {
      const star = document.createElement("span");
      star.className = "star";
      const size = 1 + Math.random() * 2;
      star.style.left = `${(Math.random() * 100).toFixed(2)}%`;
      star.style.top = `${(Math.random() * 100).toFixed(2)}%`;
      star.style.width = `${size.toFixed(1)}px`;
      star.style.height = `${size.toFixed(1)}px`;
      star.style.animationDuration = `${(1.8 + Math.random() * 3).toFixed(1)}s`;
      star.style.animationDelay = `${(-Math.random() * 4).toFixed(1)}s`;
      starFragment.appendChild(star);
    }
    starsBg.appendChild(starFragment);
  }

  const petalsBg = document.getElementById("petals-bg");
  if (petalsBg) {
    const petalColors = ["#ffd3e6", "#ffb8d6", "#ffe8f0", "#ffc2da"];
    const petalFragment = document.createDocumentFragment();
    for (let i = 0; i < 22; i++) {
      const petal = document.createElement("span");
      petal.className = `petal${Math.random() < 0.5 ? " drift-b" : ""}`;
      const size = 10 + Math.random() * 10;
      const duration = 9 + Math.random() * 10;
      petal.style.left = `${(Math.random() * 100).toFixed(2)}%`;
      petal.style.width = `${size.toFixed(0)}px`;
      petal.style.height = `${size.toFixed(0)}px`;
      petal.style.animationDuration = `${duration.toFixed(1)}s`;
      petal.style.animationDelay = `${(-Math.random() * duration).toFixed(1)}s`;
      petal.style.opacity = (0.35 + Math.random() * 0.3).toFixed(2);
      const color = petalColors[Math.floor(Math.random() * petalColors.length)];
      petal.innerHTML = `<svg viewBox="0 0 20 28" aria-hidden="true"><ellipse cx="10" cy="14" rx="9" ry="13" fill="${color}" /></svg>`;
      petalFragment.appendChild(petal);
    }
    petalsBg.appendChild(petalFragment);
  }
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

// Cards reveal their details on hover; clicking one pins it open and pulses
document.querySelectorAll(".expand-card").forEach((card) => {
  card.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    // event.detail is 2+ on the second click of a fast double-click; ignoring it
    // stops the two toggles from cancelling each other out and leaving the card
    // looking like the click "didn't work".
    if (event.detail > 1) return;
    card.classList.toggle("is-open");
    if (!prefersReducedMotion) {
      card.classList.remove("card-pulse");
      void card.offsetWidth; // restart the animation if clicked again quickly
      card.classList.add("card-pulse");
      card.addEventListener("animationend", () => card.classList.remove("card-pulse"), { once: true });
    }
  });
});

// The hero button pulses on click too
const heroButton = document.querySelector(".hero .button");
if (heroButton && !prefersReducedMotion) {
  heroButton.addEventListener("click", () => {
    heroButton.classList.remove("button-pulse");
    void heroButton.offsetWidth;
    heroButton.classList.add("button-pulse");
    heroButton.addEventListener("animationend", () => heroButton.classList.remove("button-pulse"), { once: true });
  });
}

// Draggable music companion: click the cat to play/pause, drag it anywhere
const musicWidget = document.getElementById("music-widget");
if (musicWidget) {
  const audio = document.getElementById("bg-music");
  const muteBtn = musicWidget.querySelector(".music-mute");
  const volumeSlider = musicWidget.querySelector(".music-volume");
  audio.volume = Number(volumeSlider.value);

  // Show a "drag me" hint every visit: fades out on its own after a few
  // seconds, or immediately once the visitor actually starts dragging.
  function hideDragHint() {
    musicWidget.classList.add("hint-hidden");
  }
  setTimeout(hideDragHint, 5000);

  function setPlaying(isPlaying) {
    musicWidget.classList.toggle("is-playing", isPlaying);
    musicWidget.setAttribute("aria-pressed", String(isPlaying));
    musicWidget.setAttribute("aria-label", isPlaying ? "Pause music" : "Play music");
  }

  function togglePlay() {
    if (audio.paused) {
      audio.play().catch(() => {});
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  musicWidget.addEventListener("keydown", (event) => {
    if (event.target !== musicWidget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePlay();
    }
  });

  muteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    audio.muted = !audio.muted;
    muteBtn.textContent = audio.muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", String(audio.muted));
  });

  volumeSlider.addEventListener("pointerdown", (event) => event.stopPropagation());
  volumeSlider.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    audio.volume = value;
    if (value === 0) {
      audio.muted = true;
      muteBtn.textContent = "🔇";
      muteBtn.setAttribute("aria-pressed", "true");
    } else if (audio.muted) {
      audio.muted = false;
      muteBtn.textContent = "🔊";
      muteBtn.setAttribute("aria-pressed", "false");
    }
  });

  // Drag anywhere on screen; a click that doesn't move toggles playback
  let dragging = false;
  let moved = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;
  const DRAG_THRESHOLD = 6;

  function lockPosition() {
    const rect = musicWidget.getBoundingClientRect();
    musicWidget.style.left = `${rect.left}px`;
    musicWidget.style.top = `${rect.top}px`;
    musicWidget.style.right = "auto";
    musicWidget.style.bottom = "auto";
  }

  musicWidget.addEventListener("pointerdown", (event) => {
    if (event.target === muteBtn || event.target === volumeSlider) return;
    dragging = true;
    moved = false;
    lockPosition();
    startX = event.clientX;
    startY = event.clientY;
    startLeft = musicWidget.offsetLeft;
    startTop = musicWidget.offsetTop;
    musicWidget.setPointerCapture(event.pointerId);
  });

  musicWidget.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) moved = true;
    if (!moved) return;
    hideDragHint();
    const maxLeft = window.innerWidth - musicWidget.offsetWidth;
    const maxTop = window.innerHeight - musicWidget.offsetHeight;
    musicWidget.style.left = `${Math.min(Math.max(startLeft + dx, 0), maxLeft)}px`;
    musicWidget.style.top = `${Math.min(Math.max(startTop + dy, 0), maxTop)}px`;
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    if (musicWidget.hasPointerCapture(event.pointerId)) {
      musicWidget.releasePointerCapture(event.pointerId);
    }
    if (!moved) togglePlay();
  }

  musicWidget.addEventListener("pointerup", endDrag);
  musicWidget.addEventListener("pointercancel", endDrag);
}
