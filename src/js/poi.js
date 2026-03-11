"use strict";

/* Här samlas funktioner för sevärdigheter och stopp */

/**
 * Hämtar POI nära en lista av koordinater.
 * @param {number[][]} routeCoords
 * @returns {Promise<object[]>}
 */
export async function fetchPOIs(routeCoords) {// Funktionen tar emot routeCoords som är alla koordinater i rutten
  if (!routeCoords?.length) {
    return [];
  }
  /* Eftersom en rutt kan ha 100-tals korrdinater så plockar vi ut var 10:e punkt för att hitta stopp längs vägen */
  const samplePoints = routeCoords.filter((_, index) => index % 10 === 0);
  /* Hitta noder inom 1000 meter från koordinaten */
  const queries = samplePoints.map(([lon, lat]) => `
  node(around:1000,${lat},${lon})["amenity"~"toilets|restaurant|fuel|cafe|fast_food"];
  way(around:1000,${lat},${lon})["amenity"~"toilets|restaurant|fuel|cafe|fast_food"];

  node(around:1000,${lat},${lon})["tourism"~"camp_site|caravan_site|viewpoint"];
  way(around:1000,${lat},${lon})["tourism"~"camp_site|caravan_site|viewpoint"];
`);

/* Gör "en stor fråga av alla små frågor" */
  const overpassQuery = `
  [out:json];
  (
    ${ queries.join('\n') }
    );
    out center;
  `;

   /* Skickar förfrågan till Overpass */
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: overpassQuery
  });

  if (!response.ok) {
    throw new Error('Kunde inte hämta stopp.');
  }

  const data = await response.json();

  const uniquePOIs = data.elements.filter((element, index, array) => {
    return index === array.findIndex((item) => item.id === element.id);
  });

  return uniquePOIs;
}