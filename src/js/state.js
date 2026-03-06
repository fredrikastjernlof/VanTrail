"use strict";

/* Här samlar jag appens data och tillstånd, tex valt tema, användarposition, väderdata, vald rutt mm. */

export const state = {
  currentTheme: "start",
  selectedRoute: null,
  userPosition: null,
  weatherData: null,
  pointsOfInterest: [],
};