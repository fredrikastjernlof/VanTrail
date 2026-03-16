"use strict";

/* Här samlas funktioner för sevärdigheter och stopp */


/**
 * Räknar ut ungefärligt avstånd i kilometer mellan två koordinater.
 * Använder Haversine-beräkning för sampling längs rutt.
 *
 * @param {[number, number]} pointA [lon, lat]
 * @param {[number, number]} pointB [lon, lat]
 * @returns {number}
 */
function getDistanceKm(pointA, pointB) {
  /* Plockar ut longitud och latitud från punkt A och punkt B */
  const [lon1, lat1] = pointA;
  const [lon2, lat2] = pointB;

  /* Hjälpfunktion: trigonometriska funktioner i JS använder radianer, inte grader */
  const toRadians = (value) => (value * Math.PI) / 180;

  /* Jordens ungefärliga radie i kilometer */
  const earthRadiusKm = 6371;

  /* Räknar ut skillnaden mellan punkterna i latitud och longitud */
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  /* Första delen av formeln används för att ta hänsyn till att jorden är rund */
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  /* Andra delen av formeln omvandlar mellanvärdet till ett vinkelavstånd på jordytan */
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  /* Slutligt avstånd i kilometer */
  return earthRadiusKm * c;
}

/**
 * Räknar ut minsta avstånd i kilometer mellan ett POI och en rutt.
 * Jämför POI:t med alla koordinatpunkter i rutten och tar det minsta värdet.
 *
 * @param {object} poi
 * @param {number[][]} routeCoords
 * @returns {number}
 */
export function getDistanceFromRouteKm(poi, routeCoords) {
  /* Om POI eller rutt saknas går det inte att räkna */
  if (!poi || !routeCoords?.length) {
    return Infinity;
  }

  /* Startvärde: väldigt stort tal så att första riktiga avståndet blir mindre */
  let shortestDistanceKm = Infinity;

  /* Gå igenom varje punkt i rutten */
  routeCoords.forEach((routePoint) => {
    const distanceKm = getDistanceKm([poi.lon, poi.lat], routePoint);

    /* Spara bara det kortaste avståndet */
    if (distanceKm < shortestDistanceKm) {
      shortestDistanceKm = distanceKm;
    }
  });

  return shortestDistanceKm;
}

/**
 * Väljer ut stopp-punkter med jämnt avstånd längs rutten.
 *
 * @param {number[][]} routeCoords
 * @param {number} sampleDistanceKm
 * @returns {number[][]}
 */
function getSamplePointsByDistance(routeCoords, sampleDistanceKm) {
  /* Om rutten saknar koordinater finns inga sample-punkter att välja */
  if (!routeCoords?.length) {
    return [];
  }

  /* Börja med ruttens första punkt */
  const samplePoints = [routeCoords[0]];

  /* Håller koll på hur långt vi rört oss sedan senaste valda stopp-punkt */
  let distanceSinceLastSample = 0;

  /* Gå igenom rutten punkt för punkt */
  for (let index = 1; index < routeCoords.length; index++) {
    const previousPoint = routeCoords[index - 1];
    const currentPoint = routeCoords[index];

    /* Lägg till avståndet mellan föregående och nuvarande punkt */
    distanceSinceLastSample += getDistanceKm(previousPoint, currentPoint);

    /* När vi nått önskat avstånd sparas punkten som ny stopp-punkt och räknaren börjar om */
    if (distanceSinceLastSample >= sampleDistanceKm) {
      samplePoints.push(currentPoint);
      distanceSinceLastSample = 0;
    }
  }

  const lastPoint = routeCoords[routeCoords.length - 1];
  const lastSample = samplePoints[samplePoints.length - 1];

  /* Säkerställ att även ruttens slut kommer med som stopp-punkt */
  if (lastSample !== lastPoint) {
    samplePoints.push(lastPoint);
  }

  return samplePoints;
}

/**
 * Räknar ut ungefärlig total längd i kilometer för en rutt.
 *
 * @param {number[][]} routeCoords
 * @returns {number}
 */
function getRouteLengthKm(routeCoords) {
  if (!routeCoords?.length) {
    return 0;
  }

  let totalDistanceKm = 0;

  for (let index = 1; index < routeCoords.length; index++) {
    totalDistanceKm += getDistanceKm(routeCoords[index - 1], routeCoords[index]);
  }

  return totalDistanceKm;
}

/**
 * Hämtar JSON från Overpass och provar flera endpoints om en instans faller bort.
 *
 * @param {string} query
 * @returns {Promise<object>}
 */
async function fetchOverpassWithFallback(query) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      console.log("Försöker Overpass-endpoint:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`Overpass svarade med status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn("Overpass-endpoint misslyckades:", endpoint, error);
      lastError = error;
    }
  }

  throw lastError || new Error("Kunde inte hämta stopp.");
}


/**
 * Hämtar POI nära en lista av koordinater.
 * Använder dynamisk sampling för att undvika onödigt stor fråga på långa rutter.
 *
 * @param {number[][]} routeCoords
 * @returns {Promise<object[]>}
 */
export async function fetchPOIs(routeCoords) {
  console.log("TEST FETCH START");

  if (!routeCoords?.length) {
    return [];
  }

  /* Anpassa sampling efter ruttens längd men håll kvar samma grundidé */
  const totalRouteDistanceKm = getRouteLengthKm(routeCoords);
  const minSampleDistanceKm = 8;
  const maxSamplePoints = 25;

  const sampleDistanceKm = Math.max(
    minSampleDistanceKm,
    totalRouteDistanceKm / maxSamplePoints
  );

  const samplePoints = getSamplePointsByDistance(routeCoords, sampleDistanceKm);

  console.log("Ruttlängd i km:", totalRouteDistanceKm.toFixed(1));
  console.log("Antal routeCoords:", routeCoords.length);
  console.log("Sample-avstånd i km:", sampleDistanceKm.toFixed(1));
  console.log("Antal samplePoints:", samplePoints.length);

  /* Hitta noder/ways inom visst avstånd från koordinater längs rutten */
  const queries = samplePoints.map(([lon, lat]) => `
    node(around:500,${lat},${lon})["amenity"~"toilets|restaurant|fuel|cafe|fast_food"];
    way(around:500,${lat},${lon})["amenity"~"toilets|restaurant|fuel|cafe|fast_food"];

    node(around:1000,${lat},${lon})["tourism"~"camp_site|caravan_site|viewpoint"];
    way(around:1000,${lat},${lon})["tourism"~"camp_site|caravan_site|viewpoint"];
  `);

  /* Gör en fråga av alla del-frågor */
  const overpassQuery = `
    [out:json][timeout:25];
    (
      ${queries.join("\n")}
    );
    out center;
  `;

  const data = await fetchOverpassWithFallback(overpassQuery);

  /* Ta bort dubletter eftersom samma stopp kan hittas från flera stopp-punkter */
  const uniquePOIs = (data.elements || []).filter((element, index, array) => {
    return index === array.findIndex((item) => item.id === element.id && item.type === element.type);
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
 * Hämtar platsnamn för ett POI från OSM-taggar.
 * Försöker hitta ort eller kommun i en enkel prioriterad ordning.
 *
 * @param {object} tags
 * @returns {string}
 */
function getPoiPlaceName(tags = {}) {
  return (
    tags["addr:city"] ||
    tags["addr:town"] ||
    tags["addr:village"] ||
    tags["addr:municipality"] ||
    tags["is_in:city"] ||
    tags["is_in:town"] ||
    tags["is_in:village"] ||
    tags["is_in"] ||
    ""
  );
}

/**
 * Normaliserar rå POI-data från Overpass till ett enhetligt format.
 * @param {object[]} pois
 * @returns {object[]}
 */
export function normalizePOIs(pois) {
  return pois
    .map((poi) => {
      const type = detectPoiType(poi.tags);

      console.log("POI platsnamn från tags:", getPoiPlaceName(poi.tags));

      return {
        id: `${poi.type}-${poi.id}`,
        name: poi.tags?.name || getPoiCategory(type),
        type,
        category: getPoiCategory(type),
        placeName: getPoiPlaceName(poi.tags),
        // Node har lat/lon direkt medan way brukar ha center.lat / center.lon
        lat: poi.lat ?? poi.center?.lat ?? null,
        lon: poi.lon ?? poi.center?.lon ?? null,
        tags: poi.tags || {}
      };
    })
    // Filtrera bort objekt utan användbara koordinater
    .filter((poi) => poi.lat !== null && poi.lon !== null);
}

/**
 * Sorterar POI i den ordning de ligger längs rutten.
 * Närmaste punkt i routeCoords används som ungefärlig position.
 *
 * @param {object[]} pois
 * @param {number[][]} routeCoords
 * @returns {object[]}
 */
export function sortPOIsAlongRoute(pois, routeCoords) {
  if (!pois?.length || !routeCoords?.length) {
    return pois;
  }

  return [...pois].sort((a, b) => {
    const aIndex = getClosestRouteIndex(a, routeCoords);
    const bIndex = getClosestRouteIndex(b, routeCoords);

    return aIndex - bIndex;
  });
}

/**
 * Hittar index för den punkt i rutten som ligger närmast ett POI.
 *
 * @param {object} poi
 * @param {number[][]} routeCoords
 * @returns {number}
 */
function getClosestRouteIndex(poi, routeCoords) {
  let closestIndex = 0;
  let closestDistance = Infinity;

  routeCoords.forEach(([lon, lat], index) => {
    const distance =
      Math.abs(lat - poi.lat) + Math.abs(lon - poi.lon);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

/**
 * Väljer ut POI jämnt utspridda över en redan sorterad lista.
 *
 * @param {object[]} pois
 * @param {number} maxPerCategory
 * @returns {object[]}
 */
function pickEvenlyDistributedPOIs(pois, maxPerCategory) {
  if (!pois?.length || maxPerCategory <= 0) {
    return [];
  }

  if (pois.length <= maxPerCategory) {
    return pois;
  }

  if (maxPerCategory === 1) {
    return [pois[0]];
  }

  const selectedPOIs = [];
  const lastIndex = pois.length - 1;

  for (let index = 0; index < maxPerCategory; index++) {
    const targetIndex = Math.round((index * lastIndex) / (maxPerCategory - 1));
    const candidate = pois[targetIndex];

    if (candidate && !selectedPOIs.some((poi) => poi.id === candidate.id)) {
      selectedPOIs.push(candidate);
    }
  }

  /* Fyll på om avrundning råkar ge dubletter */
  pois.forEach((poi) => {
    const alreadySelected = selectedPOIs.some((selected) => selected.id === poi.id);

    if (!alreadySelected && selectedPOIs.length < maxPerCategory) {
      selectedPOIs.push(poi);
    }
  });

  return selectedPOIs.slice(0, maxPerCategory);
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
 * Begränsar antal POI per kategori.
 * Förutsätter att listan redan är sorterad i ruttens ordning.
 *
 * @param {Object<string, object[]>} groupedPOIs
 * @param {number} maxPerCategory
 * @returns {Object<string, object[]>}
 */
export function limitPOIsPerCategory(groupedPOIs, maxPerCategory) {
  return Object.fromEntries(
    Object.entries(groupedPOIs).map(([category, pois]) => [
      category,
      pickEvenlyDistributedPOIs(pois, maxPerCategory)
    ])
  );
}
