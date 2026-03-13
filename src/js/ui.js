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

/**
 * Öppnar modalen och fyller den med information om valt stopp.
 * @param {object} poi
 */
export function openPOIModal(poi) {
  const modal = document.getElementById("poi-modal");
  const title = document.getElementById("poi-modal-title");
  const type = document.getElementById("poi-type");
  const distance = document.getElementById("poi-distance");
  const navigateBtn = document.getElementById("navigate-btn");
  const showOnMapBtn = document.getElementById("show-on-map-btn");

  if (!modal || !title || !type || !distance || !navigateBtn || !showOnMapBtn) {
    return;
  }

  title.textContent = poi.name || "Namnlös plats";
  type.textContent = poi.category || poi.type || "Okänd typ";

  // Avstånd räknas ut senare
  distance.textContent = "Kommer snart";

  navigateBtn.href = `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lon}`;

  showOnMapBtn.dataset.poiId = poi.id;

  modal.hidden = false;
}

/**
 * Stänger POI-modalen.
 */
export function closePOIModal() {
  const modal = document.getElementById("poi-modal");

  if (!modal) {
    return;
  }

  modal.hidden = true;
}

/**
 * Kopplar eventlyssnare i stopplistan till modal.
 * @param {object[]} pois
 */
export function initPOIModalEvents(pois, onShowOnMap) {
  const container = document.getElementById("stops-groups");
  const modal = document.getElementById("poi-modal");

  if (!container || !modal) {
    return;
  }

  container.addEventListener("click", (event) => {
    const button = event.target.closest(".stop-item__button");

    if (!button) {
      return;
    }

    const poiId = button.dataset.poiId;
    const selectedPOI = pois.find((poi) => poi.id === poiId);

    if (!selectedPOI) {
      return;
    }

    openPOIModal(selectedPOI);
  });

  modal.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-close-modal='true']");

    if (closeTarget) {
      closePOIModal();
      return;
    }

    const showOnMapBtn = event.target.closest("#show-on-map-btn");

    if (!showOnMapBtn) {
      return;
    }

    const poiId = showOnMapBtn.dataset.poiId;
    const selectedPOI = pois.find((poi) => poi.id === poiId);

    if (!selectedPOI) {
      return;
    }

    if (typeof onShowOnMap === "function") {
      onShowOnMap(selectedPOI);
    }

    closePOIModal();
  });
}