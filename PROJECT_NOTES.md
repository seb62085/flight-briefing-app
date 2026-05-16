# Project Notes

These notes capture development context for future Codex sessions.

## Project Goal

Flight Briefing App is a browser-based iPad-friendly web app for uploading PDF flight plans and turning selected dispatch information into readable briefing tabs.

The app currently reads PDFs locally in the browser using `pdfjs-dist`. It extracts raw text and parses specific sections from National Airlines-style flight plans.

iPad Safari compatibility note: `src/polyfills.js` is loaded from `src/main.jsx` before `App.jsx` imports PDF.js. This covers newer JavaScript helpers that may be missing on some iPadOS Safari versions.

## Current Deployment

- GitHub repo: `https://github.com/seb62085/flight-briefing-app`
- Live app: `https://seb62085.github.io/flight-briefing-app/`
- GitHub Pages deployment uses `.github/workflows/deploy.yml`
- Vite base path is set in `vite.config.js`:
  - `base: '/flight-briefing-app/'`

## Current App Tabs

- Upload
  - PDF file picker
  - parse status
  - collapsible raw extracted text
- Summary
  - admin strip: plan, trip, compute time, revision, dispatcher
  - flight strip: date, flight, registration
  - origin, destination, primary alternate
  - additional alternates if found
  - fuel summary
  - crew
- Route
  - route summary
  - additional alternates
  - aerodrome weather cards for origin, destination, alternate, takeoff alternates, and enroute alternates
  - METARs split into separate lines
  - TAF shown as one block
  - NOTAM parsing was tested but intentionally removed from display for now
- LM Chit
  - burn
  - taxi
  - editable PIC, prefilled from fuel section `CAPT:`
  - payload
  - editable density
  - RF from total fuel
  - SOB from parsed crew count
  - FAK weights with total

## Parser Assumptions

The parser currently expects extracted PDF text to be normalized with:

```js
text.replace(/\s+/g, ' ')
```

Important patterns currently supported:

- Header:
  - `PLAN #`
  - `TRIP #`
  - `COMPUTE TIME:`
  - `REVISION:`
  - `DISPATCHER :`
  - flight/date examples:
    - `NCR4902/24APR26`
    - `NCR873 /21APR26`
- Airports:
  - `ORIGIN JFK/KJFK JOHN F KENNEDY INTL N40384W073458 0405Z`
  - `DESTINATION TLV/LLBG TEL-AVIV/BEN-GURION N32006E034531 1433Z`
  - `ALTERNATE LCA/LCLK LARNAKA INTERNATIONA N34527E033378 1512Z`
  - coordinates support N/S and E/W
- Additional alternates:
  - `ENROUTE ALTN YYR/CYYR GOOSE BAY N53192W060256`
  - `ENROUTE ALTN SNN/EINN SHANNON/INTERNATIONA N52421W008555`
  - takeoff alternate parsing has a first-pass pattern for `TAKEOFF ALTN`, `TKOF ALTN`, and `DEP ALTN`, but needs a real sample before trusting it
- Fuel:
  - detects B043 / B044 / redispatch
  - parses burn, flight time, alternate fuel, hold fuel/time, reserve, second reserve, additional, ballast, payload, ZFW, TOW, ELW, RCMD AF, REQ, taxi, extra, total, distance, fuel bias, and PIC
  - `ALTN + 7.5` is calculated as:
    - alternate fuel / 1000
    - rounded up to nearest tenth
    - plus 7.5
- Crew:
  - parses after `WIND ... MXSH ...` and before `--- FLIGHT LEVEL CALCULATION ---`
  - roles: `CPT`, `FO`, `LM`, `MX`, `DH`, `J/S`
  - `DH` entries may not include employee numbers
  - ignores base
  - SOB currently equals parsed crew count
- FAK:
  - parses from `FAK WEIGHTS:`
  - totals all `... ### KGS` items
  - cleans `KTY STRAPS` down to `STRAPS`
- Weather:
  - parses blocks starting with `DEPARTURE:`, `ARRIVAL:`, and `OTHER:`
  - identifies airport ICAO from first `METAR ICAO`
  - separates METARs into individual lines
  - TAF is currently shown as one block
- ETP:
  - parses depressurization ETP blocks such as `DEPRESSURIZATION ETP FOR KLAX/PHNL LOC N31560W141026`
  - first-pass support for two-engine-inop labels such as `2 ENG INOP ETP` and `TWO ENGINE INOP ETP`
  - captures ETP type, airport pair, location, and airport validity windows when listed as `KLAX VALIDITY WINDOW 12:42Z TO 20:04Z`

## Important User Preferences

- Keep the UI compact and briefing-oriented, not decorative.
- Use tabs to avoid one long scrolling page.
- Route tab should focus on route and aerodrome weather.
- LM Chit should become printable later and include loadmaster-relevant information.
- NOTAMs are not displayed for now.
- Future goal: possibly detect red/blue PDF text in weather/NOTAM sections, but this requires rendered-page/color analysis rather than text extraction.
- Always commit useful milestones to Git.

## Useful Commands

Start local dev server:

```bash
npm.cmd run dev
```

Build:

```bash
npm.cmd run build
```

Git status:

```bash
git status --short --branch
```

Push:

```bash
git push
```

## Next Likely Work

- Tune weather parser against more real PDFs.
- Tune ETP parser against two-engine-inop examples.
- Add weather cards for takeoff alternates once real formatting is provided.
- Improve TAF formatting.
- Add printable LM Chit styling.
- Decide whether to parse or ignore NOTAMs.
- Add optional red/blue text detection later using rendered PDF pages/canvas analysis.
