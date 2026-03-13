"use strict";

/* Hä läggs kod som påverkar gränssnittet */

/**
 * Renderar grupperade stopp i stopplistan.
 * @param {Object<string, object[]>} groupedPOIs
 */
export function renderStopsGroups(groupedPOIs) {
  const container = document.getElementById("stops-groups");

  if (!container) {
    return;
  }

  // Töm tidigare innehåll innan nya stopp renderas
  container.innerHTML = "";

  const categories = Object.keys(groupedPOIs);

  // Visa meddelande om inga stopp hittades
  if (!categories.length) {
    container.innerHTML = "<p>Inga stopp hittades längs rutten.</p>";
    return;
  }

  // Loopa genom varje kategori
  categories.forEach((category) => {
    const section = document.createElement("section");
    section.className = "stops-group";

    // Skapar en rubrik för kategorin
    const heading = document.createElement("h3");
    heading.className = "stops-group__title";
    heading.textContent = `${category} (${groupedPOIs[category].length})`;

    // Skapar en lista för stoppen i kategorin
    const list = document.createElement("ul");
    list.className = "stops-group__list";

    // Loopa igenom alla POI i den aktuella kategorin
    groupedPOIs[category].forEach((poi) => {
      const item = document.createElement("li");
      item.className = "stop-item";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "stop-item__button";
      button.dataset.poiId = poi.id;

      button.innerHTML = `<span class="stop-item__name">${poi.name}</span>`;

      item.appendChild(button);
      list.appendChild(item);
    });

    section.appendChild(heading);
    section.appendChild(list);
    container.appendChild(section);
  });
}