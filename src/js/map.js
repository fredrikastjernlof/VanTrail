"use strict"
/* importerar Leaflet-biblioteket och Leaflets egna CSS */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let map;
let routeLayer;

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