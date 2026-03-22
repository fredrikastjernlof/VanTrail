"use strict";

/* Här läggs kod som påverkar gränssnittet */

// Förhindrar att event listeners registreras flera gånger
let poiModalEventsInitialized = false;

/* Sparar senaste POI-listan och callbacken så modalen alltid använder aktuell data */
let currentModalPOIs = [];
let currentShowOnMapCallback = null;


/**
* Bygger etikett för stopp i listan.
* Visar namn och ort om ort finns.
*
* @param {object} poi
* @returns {string}
*/
function getStopListLabel(poi) {
const name = poi.name || "Namnlös plats";
const placeName = poi.placeName?.trim();

if (!placeName) {
return name;
}

return `${name}, ${placeName}`;
}

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

const toggleBtn = document.createElement("button");
toggleBtn.type = "button";
toggleBtn.className = "stops-group__toggle";

const icons = {
Toaletter: "🚻",
Tankstationer: "⛽",
"Mat & restauranger": "🍔",
"Ställplatser / camping": "🏕️",
Utsiktsplatser: "📷",
Övrigt: "📍"
};

const shortLabels = {
  "Mat & restauranger": "Mat",
  "Ställplatser / camping": "Camping"
};

const icon = icons[category] || "";

const count = groupedPOIs[category].length;
const shortCategory = shortLabels[category] || category;

toggleBtn.innerHTML = `
  <span class="label-full">${icon} ${category} (${count})</span>
  <span class="label-short" aria-hidden="true">${icon} ${shortCategory} (${count})</span>
`;

heading.appendChild(toggleBtn);
toggleBtn.setAttribute("aria-expanded", "false");

// Skapar en lista för stoppen i kategorin
const list = document.createElement("ul");
list.className = "stops-group__list";
list.hidden = true;

toggleBtn.addEventListener("click", () => {
const isOpen = toggleBtn.getAttribute("aria-expanded") === "true";

toggleBtn.setAttribute("aria-expanded", String(!isOpen));
list.hidden = isOpen;
});

// Loopa igenom alla POI i den aktuella kategorin
groupedPOIs[category].forEach((poi) => {
const item = document.createElement("li");
item.className = "stop-item";

const button = document.createElement("button");
button.type = "button";
button.className = "stop-item__button";
button.dataset.poiId = poi.id;

button.innerHTML = `<span class="stop-item__name">${getStopListLabel(poi)}</span>`;

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
const location = document.getElementById("poi-location");
const distance = document.getElementById("poi-distance");
const navigateBtn = document.getElementById("navigate-btn");
const showOnMapBtn = document.getElementById("show-on-map-btn");

if (!modal || !title || !type || !distance || !location || !navigateBtn || !showOnMapBtn) {
return;
}

title.textContent = poi.name || "Namnlös plats";
location.textContent = poi.placeName || "Okänd plats";
type.textContent = poi.category || poi.type || "Okänd typ";


/* Visa avstånd från rutten i meter eller kilometer */
if (typeof poi.distanceFromRouteKm === "number") {
if (poi.distanceFromRouteKm < 1) {
const meters = Math.round(poi.distanceFromRouteKm * 1000);
distance.textContent = `${meters} m`;
} else {
distance.textContent = `${poi.distanceFromRouteKm.toFixed(1)} km`;
}
} else {
distance.textContent = "Avstånd okänt";
}

navigateBtn.href = `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lon}`;
navigateBtn.target = "_blank";
navigateBtn.rel = "noopener noreferrer";

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
* Eventen registreras en gång, men använder alltid senaste POI-listan.
*
* @param {object[]} pois
* @param {Function} onShowOnMap
*/
export function initPOIModalEvents(pois, onShowOnMap) {
/* Uppdatera alltid aktuell data för modalen */
currentModalPOIs = Array.isArray(pois) ? pois : [];
currentShowOnMapCallback = onShowOnMap;

if (poiModalEventsInitialized) {
return;
}

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
const selectedPOI = currentModalPOIs.find((poi) => poi.id === poiId);

if (!selectedPOI) {
return;
}

openPOIModal(selectedPOI);
});

modal.addEventListener("click", (event) => {
const closeTarget = event.target.closest("[data-close-modal='true']");

/* Stäng modalen om användaren klickar på stäng-knappen */
if (closeTarget) {
closePOIModal();
return;
}

/* Kontrollera om användaren klickat på "Visa på kartan" */
const showOnMapBtn = event.target.closest("#show-on-map-btn");

if (!showOnMapBtn) {
return;
}

/* Hämta id för det POI som visas i modalen */
const poiId = showOnMapBtn.dataset.poiId;

/* Hitta rätt POI i aktuell array */
const selectedPOI = currentModalPOIs.find((poi) => poi.id === poiId);

if (!selectedPOI) {
return;
}

/* Kör callbacken som skickats in från main.js */
if (typeof currentShowOnMapCallback === "function") {
currentShowOnMapCallback(selectedPOI);
}

/* Stäng modalen efter att kartan uppdaterats */
closePOIModal();
});

poiModalEventsInitialized = true;
}
