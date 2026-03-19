"use strict"
/* importerar Leaflet-biblioteket och Leaflets egna CSS */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let map;
let routeLayer;
/* Sparar POI-markörer med poi.id som nyckel så att rätt markör lätt kan hittas senare */
let poiLayers = new Map();

/**
 * Initierar kartan.
 * @param {string} mapId
 * @param {[number, number]} initialView [lat, lon]
 * @param {number} initialZoom
 * @returns {L.Map | null}
 */
export function initMap(mapId = "map", initialView = [62.0, 15.0], initialZoom = 5) {
  /* Hämtar rätt karta i DOM utifrån skickat id */
  const mapElement = document.getElementById(mapId);

  /* Om elementet inte finns ska funktionen inte krascha */
  if (!mapElement) {
    console.log(`[initMap] Hittade inget element med id "${mapId}"`);
    return null;
  }

  /* Skapar Leaflet-karta i valt HTML-element */
  map = L.map(mapElement).setView(initialView, initialZoom);

  /* Lägger på kartbakgrunden */
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  console.log(`[initMap] Karta initierad i #${mapId}`);
  return map;
}

/**
 * Ritar rutt på kartan.
 * @param {number[][]} coordinates ORS-koordinater i [lon, lat]
 */
export function drawRoute(coordinates) {
  /* Om kartan inte finns - gör inget, om koordinatlistan är tom - gör inget */
  if (!map || !coordinates?.length) {
    return;
  }

  /* Om det finns en tidigare rutt på kartan, ta bort den först */
  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  /* Loopar igenom alla koordinater och byter plats på värdena för att få dem i den ordning Leaflet vill ha */
  const latLngs = coordinates.map(([lon, lat]) => [lat, lon]);

  /* Här ritas en linje mellan punkterna på kartan, linjen sparas i routeLayer så att den kan tas bort senare */
  routeLayer = L.polyline(latLngs).addTo(map);

  /* Zoomar kartan så att hela rutten syns */
  map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });
}

/**
 * Hämtar emoji för ett POI beroende på typ.
 *
 * @param {object} poi
 * @returns {string}
 */
function getPoiMarkerEmoji(poi) {
  if (["restaurant", "cafe", "fast_food"].includes(poi.type)) {
    return "🍔";
  }

  if (poi.type === "toilets") {
    return "🚻";
  }

  if (poi.type === "fuel") {
    return "⛽";
  }

  if (["camp_site", "caravan_site"].includes(poi.type)) {
    return "🏕️";
  }

  if (poi.type === "viewpoint") {
    return "📷";
  }

  return "📍";
}

/**
 * Skapar en enkel emoji-ikon för POI-markörer.
 *
 * @param {object} poi
 * @returns {L.DivIcon}
 */
function createPoiMarkerIcon(poi) {
  const emoji = getPoiMarkerEmoji(poi);

  return L.divIcon({
    className: "poi-emoji-marker",
    html: `<div style="font-size: 1.5rem; line-height: 1;">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}


/**
 * Ritar POI-markörer på kartan.
 * @param {object[]} pois
 */
export function drawPOIs(pois) {
  // Om kartan inte finns gör vi inget
  if (!map) {
    return;
  }

  // Ta bort gamla POI-markörer från kartan
  poiLayers.forEach((layer) => map.removeLayer(layer));
  // Töm samlingen så vi kan spara nya markörer för den aktuella sökningen
  poiLayers.clear();

  // Om listan är tom efter rensning, avsluta
  if (!pois?.length) {
    return;
  }

  // Loopa igenom alla POI
  pois.forEach((poi) => {
    const lat = poi.lat;
    const lon = poi.lon;

    if (lat == null || lon == null) {
      return;
    }

    const name = poi.name || "Namnlös plats";
    const placeName = poi.placeName ? `<br>${poi.placeName}` : "";
    const type = poi.category || poi.type || "Okänd typ";

    const marker = L.marker([lat, lon], {
      icon: createPoiMarkerIcon(poi)
    })
      .addTo(map)
      .bindPopup(`
        <strong>${name}</strong><br>
        ${type}
        ${placeName}<br>
        <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}" target="_blank" rel="noopener noreferrer">
          Navigera hit
        </a>
      `);

    /* Sparar markören med POI:ens id som nyckel */
    poiLayers.set(poi.id, marker);
  });
}

/**
 * Visar ett specifikt POI på kartan genom att zooma till markören
 * och öppna dess popup.
 * @param {object} poi
 */
export function showPOIOnMap(poi) {
  // Om kartan eller POI saknas ska inget hända
  if (!map || !poi) {
    return;
  }

  // Hämta rätt markör via poi.id
  const marker = poiLayers.get(poi.id);

  // Om ingen markör hittas ska funktionen avbrytas
  if (!marker) {
    return;
  }

  // Zooma till markören
  map.setView([poi.lat, poi.lon], 14);

  // Öppna popup för den valda markören
  marker.openPopup();
}

/*=========== SOLSIDAN ============*/

/**
 * Returnerar emoji för en väderplats.
 *
 * @param {object} place
 * @returns {string}
 */
function getSunnyPlaceMarkerEmoji(place) {
  return place.weatherIcon || "☀️";
}

/**
 * Skapar en enkel emoji-ikon för vädermarkörer i Leaflet.
 *
 * @param {object} place
 * @returns {L.DivIcon}
 */
function createSunnyPlaceMarkerIcon(place) {
  const emoji = getSunnyPlaceMarkerEmoji(place);

  return L.divIcon({
    className: "poi-emoji-marker",
    html: `<div style="font-size: 1.5rem; line-height: 1;">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

/**
 * Ritar ut solplatser som markörer på kartan.
 *
 * @param {object[]} places
 */
export function drawSunnyPlaces(places) {
  if (!map) {
    console.log("Ingen karta finns att rita på");
    return;
  }

  /* Ta bort gamla markörer */
  poiLayers.forEach((layer) => map.removeLayer(layer));
  poiLayers.clear();

  if (!places?.length) {
    console.log("Inga solplatser att rita ut");
    return;
  }

  places.forEach((place) => {
    const marker = L.marker([place.lat, place.lon], {
      icon: createSunnyPlaceMarkerIcon(place)
    })
      .addTo(map)
      .bindPopup(`
        <strong>${place.weatherIcon || "☀️"} ${place.name}</strong><br>
        ${place.weatherLabel}<br>
        ${place.temperature}°C
      `);

    poiLayers.set(place.id, marker);
  });

  console.log("Solmarkörer ritades ut");
}


/**
 * Zoomar till en vald solplats på kartan.
 *
 * @param {object} place
 */
export function showSunnyPlaceOnMap(place) {
  if (!map || !place) {
    console.log("Kunde inte visa plats på kartan");
    return;
  }

  const marker = poiLayers.get(place.id);

  if (!marker) {
    console.log("Hittade ingen markör för vald plats");
    return;
  }

  map.setView([place.lat, place.lon], 10);
  marker.openPopup();

  console.log("Visar plats på kartan:", place.name);
}
