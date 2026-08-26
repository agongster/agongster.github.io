// AI assistance note: an AI coding assistant helped draft this theme-toggle logic.
// It was kept intentionally small and adapted for this portfolio's design.

const themeToggle = document.querySelector(".theme-toggle");
const savedTheme = localStorage.getItem("theme");

function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.textContent = isDark ? "Switch to light mode" : "Switch to dark mode";
}

setTheme(savedTheme || "light");

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", nextTheme);
  setTheme(nextTheme);
});
