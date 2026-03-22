"use strict";

/* Här samlar jag logik för rutter och vägval */

const API_KEY = import.meta.env.VITE_ORS_API_KEY; /* Sparar min API-nyckel i en variabel */

/**
 * Geokodar en plats till koordinater.
 * @param {string} query
 * @returns {Promise<number[]>} [lon, lat]
 */
export async function geocodePlace(query) {
  /* Skapar ett URL-objekt med grunden till geokodnings-endpointen och lägger till query-parametrar i URL:en */
  const url = new URL('https://api.openrouteservice.org/geocode/search');
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('text', `${query}, Sverige`);
  url.searchParams.set('size', '1');
  url.searchParams.set('boundary.country', 'SE');

  /* Anropet skickas till API:t, inväntar ett response-objekt */
  const response = await fetch(url);

  /* Kontrollerar om anropet lyckades */
  if (!response.ok) {
    throw new Error('Kunde inte hitta platsen.');
  }

  /* Omvandlar svaret från JSON till ett JS-objekt */
  const data = await response.json();
  const feature = data.features?.[0];


  /* Om ingen träff hittades får vi ett tydligare fel */
  if (!feature) {
    throw new Error(`Ingen plats hittades för "${query}".`);
  }

  /* Returnerar koordinaterna */
  return feature.geometry.coordinates;
}



/**
 * Hämtar en rutt mellan två koordinater.
 * @param {number[]} startCoords [lon, lat]
 * @param {number[]} endCoords [lon, lat]
 * @returns {Promise<number[][]>}
 */
export async function fetchRoute(startCoords, endCoords) {
  /* Anropar routing-endpointen som räknar ut själva rutten */
  const response = await fetch(
    'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
    {
      method: 'POST', /* POST istället för GET - för att jag skickar med data i min request */
      headers: {
        Authorization: API_KEY, // Skickar med min nyckel
        'Content-Type': 'application/json' // Talar om att jag skickar JSON-data
      },
      /* Bygger ett JS-objekt och gör om det till JSON-text med JSON.stringify() */
      body: JSON.stringify({
        coordinates: [startCoords, endCoords]
      })
    }
  );

  /* Avbryt om API:t inte svarar korrekt */
  if (!response.ok) {
    throw new Error('Kunde inte hämta rutten.');
  }

  /* Omvandla svaret till et JS-objekt och plocka ut ruttens koordinater */
  const data = await response.json();
  return data.features[0].geometry.coordinates;
}