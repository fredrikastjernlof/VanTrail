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

        console.log("Hämtad position:", { lat, lon });

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
    { id: "sun-1", name: "Malmköping", lon: centerLon + 0.18, lat: centerLat + 0.08 },
    { id: "sun-2", name: "Mariefred", lon: centerLon + 0.10, lat: centerLat - 0.06 },
    { id: "sun-3", name: "Strängnäs", lon: centerLon - 0.12, lat: centerLat + 0.04 }
  ];

  console.log("Genererade testplatser:", places);
  console.log("Vald radie i km:", radiusKm);

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
    list.innerHTML = "<li>Inga platser hittades.</li>";
    return;
  }

  places.forEach((place) => {
    const item = document.createElement("li");
    item.className = "sun-result-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "sun-result-button";
    button.dataset.placeId = place.id;

    button.innerHTML = `<span>${place.name}</span>`;

    /* Tillfälligt klickbeteende i detta block */
    button.addEventListener("click", () => {
      console.log("Klick på plats i listan:", place);
    });

    item.appendChild(button);
    list.appendChild(item);
  });

  console.log("Resultatlista renderad");
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
    console.log("Inte på solsidan - initWeather avbryts");
    return;
  }

  console.log("Solsidan hittad - startar initWeather");

  /* Initiera egen karta för solsidan */
  initMap("sun-map", [62.0, 15.0], 5);

  /* Klick på 'Hämta min position' */
  useLocationBtn?.addEventListener("click", async () => {
    try {
      statusMessage.textContent = "Hämtar din position...";
      console.log("Startar hämtning av användarposition");

      const userPosition = await getUserPosition();

      /* Spara i globalt state */
      state.userPosition = userPosition;

      /* Visa i inputfältet att användaren valt sin position */
      startInput.value = "Min position";

      console.log("Sparad användarposition i state:", state.userPosition);
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

      console.log("Form submit är med");
      console.log("Startvärde i input:", startInput.value);
      console.log("Vald radie:", radiusKm);

      let startCoords = null;

      /* Om användaren redan valt 'Min position' används state */
      if (startInput.value.trim() === "Min position" && state.userPosition) {
        startCoords = state.userPosition;
        console.log("Använder sparad användarposition:", startCoords);
      } else {
        /* Tillfällig fallback */
        startCoords = [15.0, 59.0];
        console.log("Ingen riktig startposition vald - använder testposition:", startCoords);
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