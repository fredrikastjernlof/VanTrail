"use strict";
import "../styles/main.scss";
import { state } from "./state.js";
import { initUI } from "./ui.js";
import { initWeather } from "./weather.js";

import { fetchPOIs, normalizePOIs, groupPOIsByCategory } from "./poi.js";
import { initMap, drawRoute, drawPOIs } from './map.js';
import { geocodePlace, fetchRoute } from './route.js';

/* Startar kartan direkt när sidan laddas */
initMap();


/* Hämtar element som JS ska jobba med */
const form = document.getElementById('route-form');
const startInput = document.getElementById('start-input');
const destinationInput = document.getElementById('destination-input');
const statusMessage = document.getElementById('status-message');

/* Om formuläret finns - lyssna på när det skickas, callbacken är async eftersom den ska använda await */
form?.addEventListener('submit', async (event) => {
  /* Stoppar sidan från att laddas om automatiskt */
  event.preventDefault();

  /* Läser in vad användaren skrivit och tar bort onödiga mellanslag i början och slutet */
  const start = startInput.value.trim();
  const destination = destinationInput.value.trim();

  /* Validering - om något fält är tomt: visa meddelande och avbryt funktionen  */
  if (!start || !destination) {
    statusMessage.textContent = 'Fyll i startplats och destination.';
    return;
  }

  try {
    statusMessage.textContent = 'Hämtar rutt...'; // Visar status för användaren

    /* Använder funktionen från route.js, inväntar svar (await) innan vi går vidare  */
    const startCoords = await geocodePlace(start);
    const endCoords = await geocodePlace(destination);

    /* Hämtar rutten mellan de två punkterna */
    const routeCoordinates = await fetchRoute(startCoords, endCoords);

    /* Skickar datan vidare till map.js som ritar rutten på kartan */
    drawRoute(routeCoordinates);

    /* Hämta stopp */
    const rawPOIs = await fetchPOIs(routeCoordinates);
    console.log("Rå POI-data:", rawPOIs);

    /* Normalisera stopp */
    const normalizedPOIs = normalizePOIs(rawPOIs);
    console.log("Normaliserade POI:", normalizedPOIs);

    /* Gruppera stopp efter kategori så de senare kan visas i stopplistan */
    const groupedPOIs = groupPOIsByCategory(normalizedPOIs);
    console.log("Grupperade POI:", groupedPOIs);

    /* Rita stopp på kartan */
    drawPOIs(normalizedPOIs);

    statusMessage.textContent = 'Rutt och stopp hämtade.'; // Visar om allt gått som det ska

  } catch (error) {
    //Om något går fel:
    console.error(error);
    statusMessage.textContent = error.message || 'Något gick fel.';
  }
});