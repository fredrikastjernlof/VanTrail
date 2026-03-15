"use strict"

/**
 * Hanterar val av tema och sparar det i localStorage
 */
export function initTheme() {

    //Ladda sparat tema
    const savedTheme = localStorage.getItem("vantrail-theme");

    if (savedTheme) {
        document.body.dataset.theme = savedTheme;
    }
    const themeButtons = document.querySelectorAll(".btn--theme");

    if (!themeButtons.length) return;

    themeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedTheme = button.dataset.theme;

            if (!selectedTheme) return;

            // Sätt tema på body
            document.body.dataset.theme = selectedTheme;

            // Spara tema
            localStorage.setItem("vantrail-theme", selectedTheme);

            console.log("Tema valt:", selectedTheme);
        });
    });
}