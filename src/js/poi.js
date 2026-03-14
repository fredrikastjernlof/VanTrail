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
  /* För att undvika extremt stora Overpass-frågor begränsas antal sökpunkter längs rutten 
  till max 50. */
  const maxSamples = 50;
  const step = Math.max(1, Math.ceil(routeCoords.length / maxSamples));
  const samplePoints = routeCoords.filter((_, index) => index % step === 0);

  console.log("Antal routeCoords:", routeCoords.length);
  console.log("Antal samplePoints:", samplePoints.length);

  /* Hitta noder inom 500 - 1000 meter från koordinaten */
  const queries = samplePoints.map(([lon, lat]) => `
  node(around:500,${lat},${lon})["amenity"~"toilets|restaurant|fuel|cafe|fast_food"];
  way(around:500,${lat},${lon})["amenity"~"toilets|restaurant|fuel|cafe|fast_food"];

  node(around:1000,${lat},${lon})["tourism"~"camp_site|caravan_site|viewpoint"];
  way(around:1000,${lat},${lon})["tourism"~"camp_site|caravan_site|viewpoint"];
` );

  /* Gör "en stor fråga av alla små frågor" */
  const overpassQuery = `
  [out:json][timeout:25];
  (
    ${queries.join('\n')}
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

/**
 * Avgör vilken typ av POI ett objekt är baserat på tags.
 * @param {object} tags
 * @returns {string}
 */
function detectPoiType(tags = {}) {
  if (tags.amenity === "toilets") return "toilets";
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "cafe") return "cafe";
  if (tags.amenity === "fast_food") return "fast_food";
  if (tags.amenity === "fuel") return "fuel";
  if (tags.tourism === "camp_site") return "camp_site";
  if (tags.tourism === "caravan_site") return "caravan_site";
  if (tags.tourism === "viewpoint") return "viewpoint";
  return "other";
}

/**
 * Översätter teknisk POI-typ till ett användarvänligt kategorinamn.
 * @param {string} type
 * @returns {string}
 */
function getPoiCategory(type) {
  const categoryMap = {
    toilets: "Toaletter",
    restaurant: "Mat & restauranger",
    cafe: "Mat & restauranger",
    fast_food: "Mat & restauranger",
    fuel: "Tankstationer",
    camp_site: "Ställplatser / camping",
    caravan_site: "Ställplatser / camping",
    viewpoint: "Utsiktsplatser",
    other: "Övrigt"
  };

  return categoryMap[type] || "Övrigt";
}

/**
 * Normaliserar rå POI-data från Overpass till ett enhetligt format.
 * @param {object[]} pois
 * @returns {object[]}
 */
export function normalizePOIs(pois) {
  return pois.map((poi) => {
    const type = detectPoiType(poi.tags);

    return {
      id: `${poi.type}-${poi.id}`,
      name: poi.tags?.name || getPoiCategory(type),
      type,
      category: getPoiCategory(type),
      // Node har lat/lon direkt medan way brukar ha center.lat / center.lon
      lat: poi.lat ?? poi.center?.lat ?? null,
      lon: poi.lon ?? poi.center?.lon ?? null,
      tags: poi.tags || {}
    };
    // Filtrera bort objekt utan användbara koordinater
  }).filter((poi) => poi.lat !== null && poi.lon !== null);
}

/**
 * Grupperar normaliserade POI efter kategori.
 * @param {object[]} pois
 * @returns {Object<string, object[]>}
 */
export function groupPOIsByCategory(pois) {
  return pois.reduce((groups, poi) => {
    const category = poi.category || "Övrigt";

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(poi);

    return groups;
  }, {});
}

/**
 * Begränsar antal POI som visas per kategori.
 *
 * @param {Object<string, object[]>} groupedPOIs
 * @param {number} maxPerCategory
 * @returns {Object<string, object[]>}
 */
export function limitPOIsPerCategory(groupedPOIs, maxPerCategory) {
  return Object.fromEntries(
    Object.entries(groupedPOIs).map(([category, pois]) => [
      category,
      pois.slice(0, maxPerCategory)
    ])
  );
}