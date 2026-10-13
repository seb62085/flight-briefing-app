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

## Offline Use

1. Open the live app while connected and wait for **App ready for offline use** on the Upload tab.
2. Upload a flight plan and wait for **Last flight saved on this device**.
3. On iPad, use Safari's Share menu and **Add to Home Screen**. Open that Home Screen app online once and wait for the same ready messages there.
4. Turn on Airplane Mode. You can reopen the app, review the last flight, edit PIC and density, or upload another PDF already downloaded to your device.

The latest successfully parsed PDF, extracted text, and manual LM Chit edits are stored on this device. A new successful upload replaces the saved flight. A failed upload keeps the previous saved flight. Dark mode is also remembered.

Weather is the information contained in the uploaded PDF; offline mode does not fetch new weather. Clearing website data or using private browsing can remove the saved flight and offline cache. Browser tabs and Home Screen apps may have separate storage, so prepare offline use in the one you plan to use.

Offline caching is enabled in the production build, not the development server. To test it locally, run `npm run build` followed by `npm run preview`.

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
