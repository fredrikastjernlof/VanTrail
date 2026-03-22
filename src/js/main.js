"use strict";
import "../styles/main.scss";
import { initTheme } from "./theme.js";
import { state } from "./state.js";
import { initWeather } from "./weather.js";
import { fetchPOIs, normalizePOIs, groupPOIsByCategory, limitPOIsPerCategory, getDistanceFromRouteKm, sortPOIsAlongRoute } from "./poi.js";
import { initMap, drawRoute, drawPOIs, showPOIOnMap } from "./map.js";
import { geocodePlace, fetchRoute } from "./route.js";
import { renderStopsGroups, initPOIModalEvents } from "./ui.js";


/* Startar kartan direkt när sidan laddas */
initMap();
initWeather();
initTheme();

/* Hämtar element som JS ska jobba med */
const form = document.getElementById("route-form");
const startInput = document.getElementById("start-input");
const destinationInput = document.getElementById("destination-input");
const statusMessage = document.getElementById("status-message");
const visibleCountSelect = document.getElementById("visible-count");
const useLocationBtn = document.getElementById("use-location-btn");

/* Sparar alla normaliserade POI från senaste sökningen */
let currentPOIs = [];

/* Hämtar filter-checkboxar */
const filterToilets = document.getElementById("filter-toilets");
const filterFood = document.getElementById("filter-food");
const filterFuel = document.getElementById("filter-fuel");
const filterCamping = document.getElementById("filter-camping");
const filterViewpoints = document.getElementById("filter-viewpoints");

/**
 * Läser av vilka filter i 'Visa stopp längs vägen' som är aktiva just nu.
 * @returns {object}
 */
function getActiveFilters() {
  return {
    toilets: filterToilets?.checked ?? false,
    food: filterFood?.checked ?? false,
    fuel: filterFuel?.checked ?? false,
    camping: filterCamping?.checked ?? false,
    viewpoints: filterViewpoints?.checked ?? false
  };
}

/**
 * Filtrerar POI utifrån vilka checkboxar som är aktiva.
 * @param {object[]} pois
 * @param {object} filters
 * @returns {object[]}
 */
function filterPOIs(pois, filters) {
  return pois.filter((poi) => {
    if (poi.type === "toilets") {
      return filters.toilets;
    }

    if (["restaurant", "cafe", "fast_food"].includes(poi.type)) {
      return filters.food;
    }

    if (poi.type === "fuel") {
      return filters.fuel;
    }

    if (["camp_site", "caravan_site"].includes(poi.type)) {
      return filters.camping;
    }

    if (poi.type === "viewpoint") {
      return filters.viewpoints;
    }

    /* Övriga typer visas som standard */
    return true;
  });
}

/**
 * Uppdaterar karta och stopplista utifrån aktiva filter.
 */
function updateFilteredPOIView() {
  const activeFilters = getActiveFilters();
  const filteredPOIs = filterPOIs(currentPOIs, activeFilters);
  const groupedPOIs = groupPOIsByCategory(filteredPOIs);

  const maxPerCategory = Number(visibleCountSelect?.value || 10);
  const limitedGroupedPOIs = limitPOIsPerCategory(groupedPOIs, maxPerCategory);
  const limitedPOIs = Object.values(limitedGroupedPOIs).flat();

  drawPOIs(limitedPOIs);
  renderStopsGroups(limitedGroupedPOIs);
}

/* Hämtar användarens position när man klickar på knappen */
useLocationBtn?.addEventListener("click", () => {
  /* Kontrollerar att geolocation finns */
  if (!navigator.geolocation) {
    statusMessage.textContent = "Din webbläsare stödjer inte geolocation.";
    return;
  }

  statusMessage.textContent = "Hämtar din position...";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      /* Hämta lat/lon från webbläsaren */
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      /* Spara i state i formatet [lon, lat] */
      state.userPosition = [lon, lat];

      /* Skriv in i startfältet så användaren ser vad som valts */
      startInput.value = "Min position";

      statusMessage.textContent = "Din position hämtades.";
    },
    () => {
      statusMessage.textContent = "Kunde inte hämta din position.";
    }
  );
});

/* Om formuläret finns - lyssna på när det skickas, callbacken är async eftersom den ska använda await */
form?.addEventListener("submit", async (event) => {
  /* Stoppar sidan från att laddas om automatiskt */
  event.preventDefault();

  /* Läser in vad användaren skrivit och tar bort onödiga mellanslag i början och slutet */
  const start = startInput.value.trim();
  const destination = destinationInput.value.trim();

  /* Validering - om något fält är tomt: visa meddelande och avbryt funktionen */
  if (!start || !destination) {
    statusMessage.textContent = "Fyll i startplats och destination.";
    return;
  }

  try {
    statusMessage.textContent = "Hämtar rutt...";

    const startCoords = start === "Min position" && state.userPosition
      ? state.userPosition
      : await geocodePlace(start);

    const endCoords = await geocodePlace(destination);

    /* Hämtar rutten mellan de två punkterna */
    const routeCoordinates = await fetchRoute(startCoords, endCoords);

    /* Skickar datan vidare till map.js som ritar rutten på kartan */
    drawRoute(routeCoordinates);

    /* Hämta stopp */
    const rawPOIs = await fetchPOIs(routeCoordinates);

    /* Normalisera stopp */
    const normalizedPOIs = normalizePOIs(rawPOIs);

    /* Lägg till avstånd från rutten på varje stopp */
    const normalizedPOIsWithDistance = normalizedPOIs.map((poi) => ({
      ...poi,
      /* Sparar kortaste avståndet till rutten i km */
      distanceFromRouteKm: getDistanceFromRouteKm(poi, routeCoordinates)
    }));

    /* Sortera stoppen i ruttens ordning så urvalet blir mer utspritt */
    const sortedPOIsAlongRoute = sortPOIsAlongRoute(
      normalizedPOIsWithDistance,
      routeCoordinates
    );

    /* Spara alla stopp från senaste sökningen */
    currentPOIs = sortedPOIsAlongRoute;

    /* Uppdatera karta och stopplista utifrån valda filter */
    updateFilteredPOIView();

    /* Koppla klick i stopplistan till modalen med POI som redan har ruttavstånd */
    initPOIModalEvents(sortedPOIsAlongRoute, showPOIOnMap);

    statusMessage.textContent = "Rutt och stopp hämtade.";
  } catch (error) {
    statusMessage.textContent = error.message || "Något gick fel.";
  }
});

/* När användaren ändrar filter ska kartan och listan uppdateras direkt */
[
  filterToilets,
  filterFood,
  filterFuel,
  filterCamping,
  filterViewpoints
].forEach((checkbox) => {
  checkbox?.addEventListener("change", () => {
    updateFilteredPOIView();
  });
});

/* Ändra antal visningar i listan */
visibleCountSelect?.addEventListener("change", () => {
  updateFilteredPOIView();
});
