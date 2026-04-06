# Projektuppgift – VanTrail 🚐🌍

Detta repository innehåller projektet VanTrail, utvecklat inom kursen Frontend-baserad webbutveckling.

VanTrail är en webbapplikation för roadtrips och vanlife, där användaren kan planera en resa, hitta intressanta stopp längs vägen och utforska platser baserat på väderförhållanden.

Projektet är byggt utan ramverk och använder flera externa API:er som tillsammans skapar en mashup-applikation.


## Syfte 🏁
Syftet med projektet är att:

- Bygga en webbapplikation utan frontend-ramverk
- Använda och kombinera flera externa JSON-baserade API:er
- Skapa en användarvänlig och responsiv design
- Arbeta med en modern utvecklingsmiljö (Vite)
- Strukturera kod modulärt i JavaScript och SCSS
- Implementera interaktivitet och förbättrad UX
- Dokumentera kod med JSDoc
- Publicera webbplatsen via automatiserad arbetsprocess

## Tekniker 🧩
- Vite
- HTML, 
- SCSS
- JavaScript
- Fetch API
- OpenRouteService (routing & geokodning)
- OpenStreetMap / Leaflet (kartfunktionalitet)
- Open-Meteo (väderdata)
- Overpass API (intressepunkter)
- PWA (vite-plugin-pwa)
- Sharp (bildoptimering)
- JSDoc
- Git & GitHub

## Funktionalitet

### 🗺️ Ruttplanering
Användaren kan:

- Ange start och destination
- Få en rutt visualiserad på en karta
- Se rutten anpassad efter vald väg

### 📍 Stopp längs vägen
- Hämtar sevärdigheter via Overpass API
- Filtrering av stopp (t.ex. mat, camping, tankstationer och utsiktsplatser)
- Stoppen grupperas per kategori
- Begränsning av antal stopp per kategori
- Visas både i lista och på karta

### ☀️ Kör mot solen (väderfunktion)
- Hämtar användarens position
- Genererar alternativa platser
- Hämtar väderdata via Open-Meteo
- Visar platser med bäst väderförhållanden

### 🎨 Tema & UI
- Dynamiskt temasystem (forest, sunset, ocean)
- Tema sparas i localStorage
- CSS custom properties används för design
- Responsiv layout

### PWA 📱
Applikationen är konfigurerad som en Progressive Web App:

- Service worker registreras automatiskt
- Manifest definierar appens metadata
- Ikoner för installation finns inkluderade
- Möjlighet att installera appen på enheter

## Publicering 💻

Webbplatsen är publicerad via Netlify:

[Öppna webbplatsen](https://vantrail.netlify.app/) 

## Dokumentation 📄
JSDoc används för att dokumentera funktioner och moduler i projektet.

[Öppna dokumentationen](https://vantrail.netlify.app/docs/index.html)

## Projektrapport 📝

[Öppna projektrapporten](Projektrapport.pdf)

## Det här tar jag med mig från uppgiften ✅🙌
Det här projektet har gett en djupare förståelse för hur en webbapplikation byggs från grunden utan ramverk. Att kombinera flera API:er till en fungerande helhet var väldigt utmanande och samtidigt också mycket lärorikt, särskilt när det gällde att strukturera koden på ett tydligt sätt.

Arbetet med kartan och de externa API:erna var nog det som var svårast. Det var inte alltid som saker fungerade som jag tänkt, och jag fick flera gånger justera min lösning. Till exempel när jag försökte få till reverse geocoding och stötte på problem med CORS, vilket gjorde att jag fick backa och tänka om. Det var ganska frustrerande och ibland kändes det som att allt gick emot mig, vilket gjorde det svårt att hålla motivationen uppe ett tag.

Samtidigt var det just de delarna som lärde mig mest. Jag fick en bättre förståelse för hur det faktiskt är att jobba med riktiga API:er, där man inte alltid får exakt det man vill ha och måste anpassa sig efter hur tjänsterna fungerar.

Jag tar särskilt med mig:

- Ökad förståelse för hur API:er samverkar i en mashup
- Bättre strukturering av kod i moduler (JS och SCSS)
- Erfarenhet av att arbeta med Vite och automatiserad build
- Hur viktigt UX och små interaktioner är för helhetsupplevelsen
- Att problemlösning är en iterativ process där man ofta får testa, justera och förbättra

