"use strict"

/**
 * Hanterar val av tema och sparar det i localStorage
 */
export function initTheme() {
  const themeButtons = document.querySelectorAll(".btn--theme");

  if (!themeButtons.length) return;

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTheme = button.dataset.theme;

      if (!selectedTheme) return;

      // sätt tema på body
      document.body.dataset.theme = selectedTheme;

      // spara tema
      localStorage.setItem("vantrail-theme", selectedTheme);

      console.log("Tema valt:", selectedTheme);
    });
  });
}