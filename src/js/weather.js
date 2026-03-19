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
  if (weatherCode === 0 && cloudCover <= 15) return "Klart";
  if (cloudCover <= 25) return "Lätt molnighet";
  if (cloudCover <= 50) return "Halvklart";
  return "Molnigt";
}

/**
 * Returnerar vädertyp för sortering och presentation.
 *
 * @param {object} weather
 * @returns {string}
 */
function getWeatherType(weather) {
  if (weather.precipitation > 0.2) {
    return "bad";
  }

  if (weather.is_day === 1 && weather.weather_code === 0 && weather.cloud_cover <= 15) {
    return "sunny";
  }

  if (weather.cloud_cover <= 25) {
    return "clear";
  }

  if (weather.cloud_cover <= 50) {
    return "partly-cloudy";
  }

  return "dry";
}

/**
 * Returnerar ikon för vald vädertyp.
 *
 * @param {string} weatherType
 * @returns {string}
 */
function getWeatherIcon(weatherType) {
  if (weatherType === "sunny") return "☀️";
  if (weatherType === "clear") return "🌤️";
  if (weatherType === "partly-cloudy") return "⛅️";
  if (weatherType === "dry") return "☁️";
  return "🌧️";
}

/**
 * Avgör om vädret räknas som fint.
 *
 * @param {object} weather
 * @returns {boolean}
 */
function isGoodWeather(weather) {
  const weatherType = getWeatherType(weather);

  return weatherType !== "bad";
}

/**
 * Hämtar väderdata för en viss timme i prognosen.
 *
 * @param {object} hourly
 * @param {number} index
 * @returns {object|null}
 */
function getHourlyWeatherAtIndex(hourly, index) {
  if (!hourly?.time?.length || index < 0 || index >= hourly.time.length) {
    return null;
  }

  return {
    temperature: hourly.temperature_2m?.[index],
    precipitation: hourly.precipitation?.[index],
    cloud_cover: hourly.cloud_cover?.[index],
    weather_code: hourly.weather_code?.[index],
    is_day: hourly.is_day?.[index]
  };
}

/**
 * Bygger ett väderobjekt med typ, ikon och etikett.
 *
 * @param {object} basePlace
 * @param {object} weather
 * @returns {object}
 */
function buildWeatherSnapshot(basePlace, weather) {
  if (!weather) {
    return null;
  }

  const weatherData = {
    ...basePlace,
    temperature: weather.temperature,
    precipitation: weather.precipitation,
    cloud_cover: weather.cloud_cover,
    weather_code: weather.weather_code,
    is_day: weather.is_day
  };

  const weatherType = getWeatherType(weatherData);

  return {
    ...weatherData,
    weatherType,
    weatherIcon: getWeatherIcon(weatherType),
    weatherLabel: getWeatherLabel(
      weather.weather_code,
      weather.cloud_cover,
      weather.precipitation
    )
  };
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
    "temperature_2m,precipitation,cloud_cover,weather_code,is_day");
  url.searchParams.set(
    "hourly",
    "temperature_2m,precipitation,cloud_cover,weather_code,is_day");
  url.searchParams.set(
    "forecast_days", "2");


  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Kunde inte hämta väderdata.");
  }

  const data = await response.json();
  const current = data.current;
  const hourly = data.hourly;
  const placeName = place.name;

  const currentSnapshot = buildWeatherSnapshot(
    {
      ...place,
      name: placeName
    },
    {
      temperature: current.temperature_2m,
      precipitation: current.precipitation,
      cloud_cover: current.cloud_cover,
      weather_code: current.weather_code,
      is_day: current.is_day
    }
  );

  /* Enkel första prognos:
     senare idag = ungefär 6 timmar fram
     imorgon = ungefär 24 timmar fram */
  const laterTodaySnapshot = buildWeatherSnapshot(
    {
      ...place,
      name: placeName
    },
    getHourlyWeatherAtIndex(hourly, 6)
  );

  const tomorrowSnapshot = buildWeatherSnapshot(
    {
      ...place,
      name: placeName
    },
    getHourlyWeatherAtIndex(hourly, 24)
  );

  return {
    ...currentSnapshot,
    forecasts: {
      now: currentSnapshot,
      laterToday: laterTodaySnapshot,
      tomorrow: tomorrowSnapshot
    }
  };
}


async function getPlaceName(lat, lon) {
  return "";
}

/**
 * Grupperar väderplatser för nu, senare idag och imorgon.
 *
 * @param {object[]} places
 * @returns {Object<string, object[]>}
 */
function groupSunPlacesByTime(places) {
  return {
    "Bra väder just nu": places
      .map((place) => place.forecasts?.now)
      .filter((place) => place && isGoodWeather(place)),

    "Bra väder senare idag": places
      .map((place) => place.forecasts?.laterToday)
      .filter((place) => place && isGoodWeather(place)),

    "Bra väder imorgon": places
      .map((place) => place.forecasts?.tomorrow)
      .filter((place) => place && isGoodWeather(place))
  };
}

/**
 * Renderar grupperade väderresultat i utfällbara listor.
 *
 * @param {object[]} places
 */
function renderSunResultsList(places) {
  const container = document.getElementById("sun-results-list");

  if (!container) {
    console.log("Hittade inte #sun-results-list");
    return;
  }

  /* Töm tidigare innehåll */
  container.innerHTML = "";

  const groupedPlaces = groupSunPlacesByTime(places);
  const groups = Object.entries(groupedPlaces);

  if (!groups.length) {
    container.innerHTML = "<p>Inga platser hittades.</p>";
    return;
  }

  groups.forEach(([groupTitle, groupPlaces]) => {
    const group = document.createElement("div");
    group.className = "sun-results-group";

    const heading = document.createElement("h3");
    heading.className = "sun-results-group__title";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
        toggleBtn.className = "sun-results-group__toggle";
    toggleBtn.textContent = `${groupTitle} (${groupPlaces.length})`;
    toggleBtn.setAttribute("aria-expanded", "false");

    const list = document.createElement("ul");
    list.className = "sun-results-group__list";
    list.hidden = true;

    toggleBtn.addEventListener("click", () => {
      const isOpen = toggleBtn.getAttribute("aria-expanded") === "true";

      toggleBtn.setAttribute("aria-expanded", String(!isOpen));
      list.hidden = isOpen;
    });

    if (!groupPlaces.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "stop-item";
      emptyItem.textContent = "Inga platser hittades.";
      list.appendChild(emptyItem);
    }

    groupPlaces.forEach((place, index) => {
      const item = document.createElement("li");
      item.className = "stop-item";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "stop-item__button";
      button.dataset.placeId = place.id;

      const placeLabel = place.id === "sun-center"
        ? "Nära dig"
        : `Plats ${index + 1}`;

      button.innerHTML = `<span class="stop-item__name">${place.weatherIcon || "☀️"} ${placeLabel}</span>`;

      button.addEventListener("click", () => {
        console.log("Klick på plats i listan:", place);
        openSunModal(place);
      });

      item.appendChild(button);
      list.appendChild(item);
    });

    heading.appendChild(toggleBtn);
    group.appendChild(heading);
    group.appendChild(list);
    container.appendChild(group);
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

      /* Hämta väder för alla kandidatplatser. Promise.allSettled gör 
      att vi kan visa de anrop som lyckas även om vissa misslyckas 
      (t.ex. vid rate limiting). */
      const weatherResultsSettled = await Promise.allSettled(
        candidates.map((place) => fetchWeatherForPlace(place))
      );

      const weatherResults = weatherResultsSettled
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

      console.log("Väderresultat:", weatherResults);
      console.log("Första platsens forecasts:", weatherResults[0]?.forecasts);
      console.log("Första platsens laterToday:", weatherResults[0]?.forecasts?.laterToday);
      console.log("Första platsens tomorrow:", weatherResults[0]?.forecasts?.tomorrow);

      /* Filtrera bort dåligt väder, sortera bästa vädret först och döp om platserna i resultatordning */
      const weatherPriority = {
        sunny: 1,
        clear: 2,
        "partly-cloudy": 3,
        dry: 4
      };

      const sunnyPlaces = weatherResults
        .filter(isGoodWeather)
        .map((place) => ({
          ...place,
          distanceKm: getDistanceKm(startCoords, [place.lon, place.lat])
        }))
        .sort((a, b) => {
          const priorityA = weatherPriority[a.weatherType] || 99;
          const priorityB = weatherPriority[b.weatherType] || 99;

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          return a.distanceKm - b.distanceKm;
        })
        .map((place, index) => ({
          ...place,
          name: index === 0 && place.id === "sun-center"
            ? "Nära dig"
            : `Plats ${index + 1}`
        }));

      console.log("Filtrerade solplatser:", sunnyPlaces);

      /* Spara i state */
      state.weatherData = sunnyPlaces;

      /* Uppdatera UI */
      drawSunnyPlaces(sunnyPlaces);
      renderSunResultsList(sunnyPlaces);

      statusMessage.textContent = sunnyPlaces.length
        ? `${sunnyPlaces.length} platser med bra väder hittades.`
        : "Ingen plats med bra väder hittades just nu.";
    } catch (error) {
      console.error("Fel vid submit:", error);
      statusMessage.textContent = error.message || "Något gick fel.";
    }
  });
}