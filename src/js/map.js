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
 * @returns {L.Map | null}
 */
export function initMap() {
  /* Hämtar element i DOM */
  const mapElement = document.getElementById('map');

  /* Om elementet inte finns ska funktionen inte krascha */
  if (!mapElement) {
    return null;
  }

  /* Skapar Leaflet-karta i HTML-elementet */
  map = L.map(mapElement).setView([62.0, 15.0], 5);

  /* Lägger på själva kartbakgrunden */
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

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
    const type = poi.category || poi.type || "Okänd typ";

    const marker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`
        <strong>${name}</strong><br>
        ${type}<br>
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
