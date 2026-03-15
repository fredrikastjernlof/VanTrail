"use strict";

import { state } from "./state.js";
import { initMap, drawSunnyPlaces, showSunnyPlaceOnMap } from "./map.js";

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
 * Skapar kandidatplatser runt en startpunkt.
 *
 * @param {[number, number]} center
 * @param {number} radiusKm
 * @returns {object[]}
 */
function generateCandidatePlaces(center, radiusKm) {
  const [centerLon, centerLat] = center;
  const places = [];

  /* Punkt nära användaren */
  places.push({
    id: "sun-center",
    name: "Nära dig",
    lon: centerLon,
    lat: centerLat
  });

  /* Generera punkter i en cirkel runt användaren */
  const count = 12;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const distanceKm = radiusKm * 0.75;

    const latOffset = (distanceKm / 111) * Math.cos(angle);
    const lonOffset =
      (distanceKm / (111 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);

    places.push({
      id: `sun-${i + 1}`,
      name: `Solplats ${i + 1}`,
      lon: centerLon + lonOffset,
      lat: centerLat + latOffset
    });
  }

  console.log("Genererade kandidatplatser:", places);
  return places;
}

/**
 * Räknar ut avstånd i km mellan två punkter.
 *
 * @param {[number, number]} pointA
 * @param {[number, number]} pointB
 * @returns {number}
 */
function getDistanceKm(pointA, pointB) {
  const [lon1, lat1] = pointA;
  const [lon2, lat2] = pointB;

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

/**
 * Returnerar en enkel vädertext utifrån API-data.
 *
 * @param {number} weatherCode
 * @param {number} cloudCover
 * @param {number} precipitation
 * @returns {string}
 */
function getWeatherLabel(weatherCode, cloudCover, precipitation) {
  if (precipitation > 0.2) return "Nederbörd";
  if (weatherCode === 0) return "Klar himmel";
  if (cloudCover <= 25) return "Soligt";
  if (cloudCover <= 50) return "Lätt molnighet";
  return "Molnigt";
}

/**
 * Avgör om vädret räknas som fint.
 *
 * @param {object} weather
 * @returns {boolean}
 */
function isGoodWeather(weather) {
  return (
    weather.is_day === 1 &&
    weather.precipitation <= 0.2 &&
    weather.cloud_cover <= 50
  );
}

/**
 * Hämtar väderdata för en plats från Open-Meteo.
 *
 * @param {object} place
 * @returns {Promise<object>}
 */
async function fetchWeatherForPlace(place) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.searchParams.set("latitude", place.lat);
  url.searchParams.set("longitude", place.lon);
  url.searchParams.set(
    "current",
    "temperature_2m,precipitation,cloud_cover,weather_code,is_day"
  );

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Kunde inte hämta väderdata.");
  }

  const data = await response.json();
  const current = data.current;
  const placeName = await getPlaceName(place.lat, place.lon);

  return {
    ...place,
    name: placeName,
    temperature: current.temperature_2m,
    precipitation: current.precipitation,
    cloud_cover: current.cloud_cover,
    weather_code: current.weather_code,
    is_day: current.is_day,
    weatherLabel: getWeatherLabel(
      current.weather_code,
      current.cloud_cover,
      current.precipitation
    )
  };
}

/**
 * Hämtar ortnamn från koordinater via OpenStreetMap Nominatim.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>}
 */
async function getPlaceName(lat, lon) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");

    url.searchParams.set("format", "json");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);
    url.searchParams.set("zoom", "10");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "VanTrail-App"
      }
    });

    if (!response.ok) {
      throw new Error("Kunde inte hämta ortnamn");
    }

    const data = await response.json();

    /* försök hitta bästa ortnamn */
    const name =
      data.address?.town ||
      data.address?.village ||
      data.address?.city ||
      data.address?.municipality ||
      data.display_name;

    return name || "Okänd plats";
  } catch (error) {
    console.error("Fel vid reverse geocoding:", error);
    return "Okänd plats";
  }
}

/**
 * Renderar en enkel lista med platsnamn.
 *
 * @param {object[]} places
 */
function renderSunResultsList(places) {
  const list = document.getElementById("sun-results-list");

  if (!list) {
    console.log("Hittade inte #sun-results-list");
    return;
  }

  /* Töm tidigare innehåll */
  list.innerHTML = "";

  if (!places.length) {
    list.innerHTML = "<p>Inga platser hittades.</p>";
    return;
  }

  places.forEach((place) => {
    const item = document.createElement("article");
    item.className = "sun-result-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "sun-result-button";
    button.dataset.placeId = place.id;


    button.innerHTML = `<span>${place.name}</span>`;

    button.addEventListener("click", () => {
      console.log("Klick på plats i listan:", place);
      openSunModal(place);
    });

    item.appendChild(button);
    list.appendChild(item);
  });

  console.log("Resultatlista renderad");
}


/**
 * Öppnar sol-modalen och fyller den med data om vald plats.
 *
 * @param {object} place
 */
function openSunModal(place) {
  const modal = document.getElementById("sun-modal");
  const title = document.getElementById("sun-modal-title");
  const weather = document.getElementById("sun-weather");
  const temperature = document.getElementById("sun-temperature");
  const distance = document.getElementById("sun-distance");
  const showOnMapBtn = document.getElementById("sun-show-on-map-btn");
  const navigateBtn = document.getElementById("sun-navigate-btn");

  if (!modal || !title || !weather || !temperature || !distance || !showOnMapBtn || !navigateBtn) {
    console.log("Kunde inte öppna modalen - element saknas");
    return;
  }

  /* Fyller modalen med data för vald plats */
  title.textContent = place.name || "Namnlös plats";
  weather.textContent = place.weatherLabel || "Soligt";
  temperature.textContent = place.temperature !== undefined ? `${place.temperature} °C` : "Okänd";
  distance.textContent = place.distanceKm !== undefined ? `${Math.round(place.distanceKm)} km` : "Okänt";

  /* Spara vilket place-id som hör till knappen */
  showOnMapBtn.dataset.placeId = place.id;

  /* Google Maps-länk */
  navigateBtn.href = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`;
  navigateBtn.target = "_blank";
  navigateBtn.rel = "noopener noreferrer";

  modal.hidden = false;

  console.log("Modal öppnad för:", place);
}

/**
 * Stänger sol-modalen.
 */
function closeSunModal() {
  const modal = document.getElementById("sun-modal");

  if (!modal) {
    return;
  }

  modal.hidden = true;
  console.log("Modal stängd");
}

/**
 * Kopplar event till sol-modalen.
 * Körs en gång när solsidan startar.
 *
 * @param {Function} onShowOnMap
 */
function initSunModalEvents(onShowOnMap) {
  const modal = document.getElementById("sun-modal");

  if (!modal) {
    console.log("Ingen sol-modal hittades");
    return;
  }

  modal.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-close-modal='true']");

    /* Stäng modalen vid klick på overlay eller stängknapp */
    if (closeTarget) {
      closeSunModal();
      return;
    }

    const showOnMapBtn = event.target.closest("#sun-show-on-map-btn");

    /* Om klicket inte gäller knappen - gör inget */
    if (!showOnMapBtn) {
      return;
    }

    const placeId = showOnMapBtn.dataset.placeId;
    const selectedPlace = state.weatherData.find((place) => place.id === placeId);

    if (!selectedPlace) {
      console.log("Hittade ingen plats för Visa på kartan");
      return;
    }

    console.log("Klick på Visa på kartan:", selectedPlace);

    if (typeof onShowOnMap === "function") {
      onShowOnMap(selectedPlace);
    }

    closeSunModal();
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
    return;
  }

  /* Initiera egen karta för solsidan */
  initMap("sun-map", [62.0, 15.0], 5);

  /* Kopplar modalens knappar */
  initSunModalEvents((place) => {
    showSunnyPlaceOnMap(place);
  });

  /* Klick på 'Hämta min position' */
  useLocationBtn?.addEventListener("click", async () => {
    try {
      statusMessage.textContent = "Hämtar din position...";

      const userPosition = await getUserPosition();

      /* Spara i globalt state */
      state.userPosition = userPosition;

      /* Visa i inputfältet att användaren valt sin position */
      startInput.value = "Min position";

      statusMessage.textContent = "Din position hämtades.";
    } catch (error) {
      console.error("Kunde inte hämta position:", error);
      statusMessage.textContent = error.message || "Något gick fel.";
    }
  });


  /* Submit på solsök-formuläret */
  sunForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const radiusSelect = document.getElementById("sun-radius");
      const radiusKm = Number(radiusSelect?.value || 200);

      let startCoords = null;

      /* Om användaren redan valt 'Min position' används state */
      if (startInput.value.trim() === "Min position" && state.userPosition) {
        startCoords = state.userPosition;
      } else {
        /* Tillfällig fallback */
        startCoords = [15.0, 59.0];
      }

      statusMessage.textContent = "Söker efter soligt väder...";

      /* Generera kandidatplatser runt startpunkten */
      const candidates = generateCandidatePlaces(startCoords, radiusKm);

      /* Hämta väder för alla kandidatplatser */
      const weatherResults = await Promise.all(
        candidates.map((place) => fetchWeatherForPlace(place))
      );

      console.log("Väderresultat:", weatherResults);

      /* Filtrera ut platser med fint väder */
      const sunnyPlaces = weatherResults
        .filter(isGoodWeather)
        .map((place) => ({
          ...place,
          distanceKm: getDistanceKm(startCoords, [place.lon, place.lat])
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);

      console.log("Filtrerade solplatser:", sunnyPlaces);

      /* Spara i state */
      state.weatherData = sunnyPlaces;

      /* Uppdatera UI */
      drawSunnyPlaces(sunnyPlaces);
      renderSunResultsList(sunnyPlaces);

      statusMessage.textContent = sunnyPlaces.length
        ? `${sunnyPlaces.length} soliga platser hittades.`
        : "Ingen tydligt solig plats hittades just nu.";
    } catch (error) {
      console.error("Fel vid submit:", error);
      statusMessage.textContent = error.message || "Något gick fel.";
    }
  });
}