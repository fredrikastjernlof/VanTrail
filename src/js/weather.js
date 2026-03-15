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

  /* Bara tillfällig test för submit i detta block */
  sunForm.addEventListener("submit", (event) => {
    event.preventDefault();

    console.log("Form submit är med");
    console.log("Startvärde i input:", startInput.value);

    statusMessage.textContent = "Formuläret fungerar.";
  });
}