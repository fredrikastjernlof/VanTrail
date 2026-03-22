"use strict"

/**
 * Hanterar val av tema och sparar det i localStorage
 */

// Byter favicon utifrån valt tema
function updateFavicon(theme) {
    const favicon = document.getElementById("favicon");

    if (!favicon) return;

    const icons = {
        forest: "/images/favicon_forest.png",
        sunset: "/images/favicon_sunset.png",
        ocean: "/images/favicon_ocean.png"
    };

    favicon.href = icons[theme] || icons.forest;

    console.log("Favicon uppdaterad:", theme); 
}

export function initTheme() {

    const defaultTheme = "forest";
    const savedTheme = localStorage.getItem("vantrail-theme") || defaultTheme;

    document.body.dataset.theme = savedTheme;
    updateFavicon(savedTheme);

    const themeButtons = document.querySelectorAll(".btn--theme");

    if (!themeButtons.length) return;

    themeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedTheme = button.dataset.theme;

            if (!selectedTheme) return;

            // Sätt tema på body
            document.body.dataset.theme = selectedTheme;
            updateFavicon(selectedTheme);

            // Spara tema
            localStorage.setItem("vantrail-theme", selectedTheme);

        });
    });
}