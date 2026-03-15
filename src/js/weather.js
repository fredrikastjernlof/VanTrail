"use strict";

import { state } from "./state.js";
import { initMap } from "./map.js";

/* Här samlas sånt som rör väder */

/**
 * Hämtar användarens position från webbläsaren.
 * Returnerar koordinater i formatet [lon, lat]
 *
 * @returns {Promise<[number, number]>}
 */
function getUserPosition() {
  return new Promise((resolve, reject) => {
    /* Kontrollera att geolocation stöds */
    if (!navigator.geolocation) {
      reject(new Error("Din webbläsare stödjer inte geolocation."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        /* Spara som [lon, lat] */
        resolve([lon, lat]);
      },
      (error) => {
        console.error("Fel vid hämtning av position:", error);
        reject(new Error("Kunde inte hämta din position."));
      }
    );
  });
}


/**
 * Skapar testplatser runt en startpunkt.
 *
 * @param {[number, number]} center 
 * @param {number} radiusKm 
 * @returns {object[]}
 */
function generateCandidatePlaces(center, radiusKm) {
  const [centerLon, centerLat] = center;

  /* Tillfälliga testplatser */
  const places = [
    {
      id: "sun-1",
      name: "Malmköping",
      lon: centerLon + 0.18,
      lat: centerLat + 0.08,
      weatherLabel: "Soligt",
      temperature: 17,
      distanceText: "122 km"
    },
    {
      id: "sun-2",
      name: "Mariefred",
      lon: centerLon + 0.10,
      lat: centerLat - 0.06,
      weatherLabel: "Lätt molnighet",
      temperature: 16,
      distanceText: "96 km"
    },
    {
      id: "sun-3",
      name: "Strängnäs",
      lon: centerLon - 0.12,
      lat: centerLat + 0.04,
      weatherLabel: "Klar himmel",
      temperature: 18,
      distanceText: "88 km"
    }
  ];

  return places;
}

/**
 * Renderar en enkel lista med platsnamn.
 *
 * @param {object[]} places
 */
function renderSunResultsList(places) {
  const list = document.getElementById("sun-results-list");

  if (!list) {
    console.log("Hittade inte #sun-results-list");
    return;
  }

  /* Töm tidigare innehåll */
  list.innerHTML = "";

  if (!places.length) {
    list.innerHTML = "<p>Inga platser hittades.</p>";
    return;
  }

  places.forEach((place) => {
    const item = document.createElement("article");
    item.className = "sun-result-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "sun-result-button";
    button.dataset.placeId = place.id;


    button.innerHTML = `<span>${place.name}</span>`;

    button.addEventListener("click", () => {
      console.log("Klick på plats i listan:", place);
      openSunModal(place);
    });

    item.appendChild(button);
    list.appendChild(item);
  });

  console.log("Resultatlista renderad");
}


/**
 * Öppnar sol-modalen och fyller den med data om vald plats.
 *
 * @param {object} place
 */
function openSunModal(place) {
  const modal = document.getElementById("sun-modal");
  const title = document.getElementById("sun-modal-title");
  const weather = document.getElementById("sun-weather");
  const temperature = document.getElementById("sun-temperature");
  const distance = document.getElementById("sun-distance");
  const showOnMapBtn = document.getElementById("sun-show-on-map-btn");
  const navigateBtn = document.getElementById("sun-navigate-btn");

  if (!modal || !title || !weather || !temperature || !distance || !showOnMapBtn || !navigateBtn) {
    console.log("Kunde inte öppna modalen - element saknas");
    return;
  }

  /* Fyller modalen med data för vald plats */
  title.textContent = place.name || "Namnlös plats";
  weather.textContent = place.weatherLabel || "Soligt";
  temperature.textContent = place.temperature ?? "Okänd";
  distance.textContent = place.distanceText || "Kommer snart";

  /* Spara vilket place-id som hör till knappen */
  showOnMapBtn.dataset.placeId = place.id;

  /* Google Maps-länk */
  navigateBtn.href = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`;
  navigateBtn.target = "_blank";
  navigateBtn.rel = "noopener noreferrer";

  modal.hidden = false;

  console.log("Modal öppnad för:", place);
}

/**
 * Stänger sol-modalen.
 */
function closeSunModal() {
  const modal = document.getElementById("sun-modal");

  if (!modal) {
    return;
  }

  modal.hidden = true;
  console.log("Modal stängd");
}

/**
 * Kopplar event till sol-modalen.
 * Körs en gång när solsidan startar.
 *
 * @param {Function} onShowOnMap
 */
function initSunModalEvents(onShowOnMap) {
  const modal = document.getElementById("sun-modal");

  if (!modal) {
    console.log("Ingen sol-modal hittades");
    return;
  }

  modal.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-close-modal='true']");

    /* Stäng modalen vid klick på overlay eller stängknapp */
    if (closeTarget) {
      closeSunModal();
      return;
    }

    const showOnMapBtn = event.target.closest("#sun-show-on-map-btn");

    /* Om klicket inte gäller knappen - gör inget */
    if (!showOnMapBtn) {
      return;
    }

    const placeId = showOnMapBtn.dataset.placeId;
    const selectedPlace = state.weatherData.find((place) => place.id === placeId);

    if (!selectedPlace) {
      console.log("Hittade ingen plats för Visa på kartan");
      return;
    }

    console.log("Klick på Visa på kartan:", selectedPlace);

    if (typeof onShowOnMap === "function") {
      onShowOnMap(selectedPlace);
    }

    closeSunModal();
  });
}



/**
 * Startar funktionalitet för solsidan.
 */
export function initWeather() {
  /* Hämta element från solsidan */
  const sunForm = document.getElementById("sun-form");
  const startInput = document.getElementById("sun-start-input");
  const useLocationBtn = document.getElementById("sun-use-location-btn");
  const statusMessage = document.getElementById("sun-status-message");
  const sunMapElement = document.getElementById("sun-map");

  /* Om vi inte är på solsidan - gör inget */
  if (!sunForm || !sunMapElement) {
    return;
  }

  /* Initiera egen karta för solsidan */
  initMap("sun-map", [62.0, 15.0], 5);

  /* Kopplar modalens knappar */
  initSunModalEvents((place) => {
    console.log("Här visas platsen på kartan:", place);
  });

  /* Klick på 'Hämta min position' */
  useLocationBtn?.addEventListener("click", async () => {
    try {
      statusMessage.textContent = "Hämtar din position...";

      const userPosition = await getUserPosition();

      /* Spara i globalt state */
      state.userPosition = userPosition;

      /* Visa i inputfältet att användaren valt sin position */
      startInput.value = "Min position";

      statusMessage.textContent = "Din position hämtades.";
    } catch (error) {
      console.error("Kunde inte hämta position:", error);
      statusMessage.textContent = error.message || "Något gick fel.";
    }
  });


  /* Submit på solsök-formuläret */
  sunForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const radiusSelect = document.getElementById("sun-radius");
      const radiusKm = Number(radiusSelect?.value || 200);

      let startCoords = null;

      /* Om användaren redan valt 'Min position' används state */
      if (startInput.value.trim() === "Min position" && state.userPosition) {
        startCoords = state.userPosition;
      } else {
        /* Tillfällig fallback */
        startCoords = [15.0, 59.0];
      }

      statusMessage.textContent = "Genererar testplatser...";

      const places = generateCandidatePlaces(startCoords, radiusKm);

      /* Spara tillfälligt i state så de kan användas i nästa block */
      state.weatherData = places;

      renderSunResultsList(places);

      statusMessage.textContent = `${places.length} testplatser skapades.`;
    } catch (error) {
      console.error("Fel vid submit:", error);
      statusMessage.textContent = error.message || "Något gick fel.";
    }
  });
}