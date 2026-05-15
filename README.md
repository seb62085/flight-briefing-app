# Flight Briefing App

Flight Briefing App is a browser-based tool for reading PDF flight plans and turning key dispatch information into a cleaner briefing view.

The app is designed to run on desktop browsers and iPad Safari. It reads the PDF locally in the browser, extracts text from the flight plan, and organizes selected information into tabs.

## What It Shows

- General flight information such as plan number, trip number, compute time, revision, dispatcher, flight number, date, aircraft registration, origin, destination, and alternates
- Fuel summary values, including burn, taxi, payload, ramp fuel, required fuel, reserves, fuel bias, and related fields
- Route summary
- Crew list
- Aerodrome weather from the flight plan, including METAR and TAF sections
- Loadmaster chit information, including editable PIC and density fields
- FAK weight totals and itemized FAK weights

## How To Use

1. Open the app in a browser.
2. Go to the Upload tab.
3. Choose a PDF flight plan.
4. Wait for the app to finish parsing the PDF.
5. Review the Summary, Route, and LM Chit tabs.
6. Use the Show extracted text button on the Upload tab if you need to inspect the raw PDF text.

## Live App

The app is deployed with GitHub Pages:

https://seb62085.github.io/flight-briefing-app/

## Important Note

This app is a briefing aid only. Always verify parsed information against the official flight plan, dispatch release, weather package, and applicable company procedures before using the information operationally.

## Local Development

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Build the production version:

```bash
npm run build
```
