"use strict"
/* importerar Leaflet-biblioteket och Leaflets egna CSS */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let map;
let routeLayer;
let poiLayers = [];

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
  // Om kartan inte finns eller om listan är tom gör vi inget
  if (!map || !pois?.length) {
    return;
  }

  // Ta bort gamla POI-markörer från kartan
  poiLayers.forEach((layer) => map.removeLayer(layer));
  // Töm listan så vi kan fylla den igen
  poiLayers = [];

  // Loopa igenom alla POI som hämtats från Overpass
  pois.forEach((poi) => {
    // Node har lat/lon direkt, medan way får center.lat / center.lon
    const lat = poi.lat ?? poi.center?.lat;
    const lon = poi.lon ?? poi.center?.lon;

    // Om koordinater saknas hoppar vi över detta POI
    if (!lat || !lon) {
      return;
    }

    // Hämta namn om det finns, annars visa standardtext
    const name = poi.tags?.name || 'Namnlös plats';
    // Hämta typ (amenity eller tourism)
    const type = poi.tags?.amenity || poi.tags?.tourism || 'Okänd typ';

    // Skapa markör och sätt ut den på kartan
    const marker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`${name}<br>${type}`);

    // Spara markören så vi kan ta bort den senare
    poiLayers.push(marker);
  });
}