"use strict";
import "../styles/main.scss";
import { state } from "./state.js";
import { initUI } from "./ui.js";
import { initMap } from "./map.js";
import { initRoute } from "./route.js";
import { initPOI } from "./poi.js";
import { initWeather } from "./weather.js";

function initApp() {
  console.log("Appen har startat!");
  console.log("State:", state);

  initMap();
  initPOI();
  initRoute();
  initUI();
  initWeather();
}

initApp();