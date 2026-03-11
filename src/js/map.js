"use strict"

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Initierar Leaflet-kartan i #map.
 * @returns {L.Map | null}
 */
export function initMap() {
  const mapElement = document.getElementById('map');

  if (!mapElement) {
    return null;
  }

  const map = L.map(mapElement).setView([62.0, 15.0], 5);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  L.marker([59.329, 18.0686])
  .addTo(map)
  .bindPopup('Testmarkör: Stockholm')
  .openPopup();

  return map;
}