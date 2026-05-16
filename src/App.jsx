import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'
import './App.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

function findMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)

    if (match) {
      return match[1].trim()
    }
  }

  return 'Not found'
}

function getPdfErrorMessage(error) {
  if (error?.name === 'PasswordException') {
    return 'This PDF is password protected, so the app cannot read it yet.'
  }

  if (error?.name === 'InvalidPDFException') {
    return 'This file does not look like a valid PDF.'
  }

  if (error?.name === 'MissingPDFException') {
    return 'The selected PDF could not be opened from this location.'
  }

  if (error?.message) {
    return `PDF read failed: ${error.message}`
  }

  return 'Sorry, I could not read text from that PDF.'
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) {
    return 'unknown size'
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatMelNumber(rawMelNumber) {
  const digits = rawMelNumber.replace(/^M/i, '')

  return `MEL ${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

function parseMelItems(text) {
  const melSection = findMatch(text, [
    /END REMARKS\/+\s+THIS\s+FLIGHT PLAN.*?FAA NOTICES\s+(.*?)(?=NATIONAL\s+AIRLINES)/i,
  ])

  if (melSection === 'Not found') {
    return []
  }

  const melMatches = [
    ...melSection.matchAll(
      /(M\d{8})\s+\/\s+EXPIRES DD-MM-YY\s+([0-9]{2}-[0-9]{2}-[0-9]{2})\s+\/\s+DMI#\s+(\d+)\s+(.*?)(?=\s+M\d{8}\s+\/\s+EXPIRES DD-MM-YY|\s+NATIONAL\s+AIRLINES|$)/gi,
    ),
  ]

  return melMatches.map((match) => ({
    melNumber: formatMelNumber(match[1]),
    expiryDate: match[2].trim(),
    dmiNumber: match[3].trim(),
    note: match[4].trim(),
  }))
}

function calculateAlternatePlusReserve(alternateFuel) {
  const numericFuel = Number(alternateFuel)

  if (!Number.isFinite(numericFuel)) {
    return 'Not found'
  }

  const roundedAlternate = Math.ceil((numericFuel / 1000) * 10) / 10
  return (roundedAlternate + 7.5).toFixed(1)
}

function parseFuelSection(text) {
  const fuelSection = findMatch(text, [
    /(THIS IS A .*?FUEL\s+COST AT .*?NATIONAL\s+AIRLINES)/i,
    /([A-Z]{4}\/[A-Z]{4}\s+WEIGHTS\s+BURN\s+.*?NATIONAL\s+AIRLINES)/i,
  ])

  if (fuelSection === 'Not found') {
    return null
  }

  return {
    isB043: /B043|BRAVO\s*43/i.test(fuelSection) ? 'Yes' : 'No',
    isB044Redispatch: /B044|BRAVO\s*44|RE-?DISPATCH/i.test(fuelSection)
      ? 'Yes'
      : 'No',
    burn: findMatch(fuelSection, [
      /BURN\s+(\d+)\s+\d{4}\s+[A-Z]{4}\s+BOW/i,
    ]),
    flightTime: findMatch(fuelSection, [
      /BURN\s+\d+\s+(\d{4})\s+[A-Z]{4}\s+BOW/i,
    ]),
    alternateFuel: findMatch(fuelSection, [
      /ALTN\s+(\d+)\s+\d{4}\s+[A-Z]{4}/i,
    ]),
    alternatePlusReserve: calculateAlternatePlusReserve(
      findMatch(fuelSection, [
        /ALTN\s+(\d+)\s+\d{4}\s+[A-Z]{4}/i,
      ]),
    ),
    holdFuel: findMatch(fuelSection, [
      /HOLD\s+(\d+)\s+\d{4}/i,
    ]),
    holdTime: findMatch(fuelSection, [
      /HOLD\s+\d+\s+(\d{4})/i,
    ]),
    reserveFuel: findMatch(fuelSection, [
      /RESV\s+(\d+)\s+(\d+)\s+TOF/i,
    ]),
    reserveMinutes: findMatch(fuelSection, [
      /RESV\s+\d+\s+(\d+)\s+TOF/i,
    ]),
    secondReserveFuel: findMatch(fuelSection, [
      /RESV\s+(\d+)\s+TOW/i,
    ]),
    additionalFuel: findMatch(fuelSection, [
      /ADDN\s+(\d+)\s+\d{4}/i,
    ]),
    additionalTime: findMatch(fuelSection, [
      /ADDN\s+\d+\s+(\d{4})/i,
    ]),
    ballast: findMatch(fuelSection, [
      /BLST\s+(\d+)/i,
    ]),
    payload: findMatch(fuelSection, [
      /PYLD\s+(\d+)/i,
    ]),
    zeroFuelWeight: findMatch(fuelSection, [
      /ZFW\s+(\d+)/i,
    ]),
    takeoffWeight: findMatch(fuelSection, [
      /TOW\s+(\d+)/i,
    ]),
    estimatedLandingWeight: findMatch(fuelSection, [
      /ELW\s+(\d+)/i,
    ]),
    recommendedArrivalFuel: findMatch(fuelSection, [
      /RCMD AF\s+(\d+)/i,
    ]),
    requiredFuel: findMatch(fuelSection, [
      /REQ\s+(\d+)/i,
    ]),
    taxiFuel: findMatch(fuelSection, [
      /TAXI\s+(\d+)/i,
    ]),
    extraFuel: findMatch(fuelSection, [
      /XTRA\s+(\d+)/i,
    ]),
    totalFuel: findMatch(fuelSection, [
      /TOT\s+(\d+)/i,
    ]),
    distance: findMatch(fuelSection, [
      /DST\s+(\d+)/i,
    ]),
    fuelBias: findMatch(fuelSection, [
      /FUEL\s+BIAS:\s*([+-]?\d+(?:\.\d+)?)/i,
    ]),
    pic: findMatch(fuelSection, [
      /CAPT:\s+([A-Z\s]+?)\s+CAPT SIGNATURE/i,
    ]),
  }
}

function parseRouteSection(text) {
  const route = findMatch(text, [
    /(-N\d{4}F\d{3}.*?)(?=\s+-{5,}\s+-{5,}\s+WIND)/i,
  ])

  if (route === 'Not found') {
    return null
  }

  const routeDetailMatch = text.match(
    /-{5,}\s+-{5,}\s+WIND\s+([MP]\d{3})\s+MXSH\s+([0-9]+\/[A-Z0-9]+)/i,
  )

  return {
    route,
    wind: routeDetailMatch ? routeDetailMatch[1].trim() : 'Not found',
    maxShear: routeDetailMatch ? routeDetailMatch[2].trim() : 'Not found',
  }
}

function parseCrewSection(text) {
  const crewSection = findMatch(text, [
    /WIND\s+[MP]\d{3}\s+MXSH\s+[0-9]+\/[A-Z0-9]+\s+(.*?)(?=\s+---\s+FLIGHT LEVEL CALCULATION)/i,
  ])

  if (crewSection === 'Not found') {
    return null
  }

  const crewMembers = [
    ...crewSection.matchAll(
      /\b(CPT|FO|LM|MX|DH|J\/S)\s+(.+?)(?=\s+(?:CPT|FO|LM|MX|DH|J\/S)\b|$)/gi,
    ),
  ].map((match) => {
    const role = match[1].toUpperCase()
    const details = match[2].replace(/\s+/g, ' ').trim()
    const employeeMatch = details.match(/(?:\s+[A-Z]{2,4})?\s+(\d{4,6})$/)

    return {
      role,
      name: employeeMatch
        ? details.slice(0, employeeMatch.index).trim()
        : details,
      employeeNumber: employeeMatch ? employeeMatch[1].trim() : '',
    }
  })

  if (crewMembers.length === 0) {
    return null
  }

  return {
    members: crewMembers,
    sob: crewMembers.length,
    captains: crewMembers.filter((member) => member.role === 'CPT'),
    firstOfficers: crewMembers.filter((member) => member.role === 'FO'),
    loadmasters: crewMembers.filter((member) => member.role === 'LM'),
    maintenance: crewMembers.filter((member) => member.role === 'MX'),
    jumpseaters: crewMembers.filter((member) => member.role === 'J/S'),
  }
}

function parseFakWeights(text) {
  const fakSection = findMatch(text, [
    /FAK\s+WEIGHTS:\s+(.*?)(?=\s+MTOW\s+LTD|\s+NATIONAL\s+AIRLINES|$)/i,
  ])

  if (fakSection === 'Not found') {
    return null
  }

  const items = [
    ...fakSection.matchAll(
      /([A-Z0-9 .\/]+?)\.{2,}\s*(\d+)\s+KGS/gi,
    ),
  ].map((match) => {
    const label = match[1]
      .replace(/.*INPUTTED BY:\s+[A-Z]{1,4}\s+/i, '')
      .replace(/^[A-Z]{1,4}\s+(?=STRAPS\b)/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      label: label.includes('STRAPS') ? 'STRAPS' : label,
      weight: Number(match[2]),
    }
  })

  if (items.length === 0) {
    return null
  }

  return {
    items,
    total: items.reduce((sum, item) => sum + item.weight, 0),
  }
}

function parseEnrouteAlternates(text) {
  const alternates = [
    ...text.matchAll(
      /ENROUTE ALTN\s+([A-Z]{3}\/[A-Z]{4}\s+.*?)(?:\s+[NS]\d{5}[EW]\d{6})(?=\s+ENROUTE ALTN|\s+RMKS\/)/gi,
    ),
  ].map((match) => match[1].replace(/\s+/g, ' ').trim())

  return [...new Set(alternates)]
}

function parseTakeoffAlternates(text) {
  const alternates = [
    ...text.matchAll(
      /(?:TAKEOFF|TKOF|DEP)\s+ALTN\s+([A-Z]{3}\/[A-Z]{4}\s+.*?)(?:\s+[NS]\d{5}[EW]\d{6})(?=\s+(?:TAKEOFF|TKOF|DEP)\s+ALTN|\s+ORIGIN|\s+DESTINATION|\s+ALTERNATE|\s+ENROUTE ALTN|\s+RMKS\/)/gi,
    ),
  ].map((match) => match[1].replace(/\s+/g, ' ').trim())

  return [...new Set(alternates)]
}

function describeEtpType(rawType) {
  const normalizedType = rawType.replace(/\s+/g, ' ').trim().toUpperCase()

  if (normalizedType.includes('DEPRESS')) {
    return 'Depressurization'
  }

  if (normalizedType.includes('2') || normalizedType.includes('TWO')) {
    return 'Two-engine inop'
  }

  return normalizedType
}

function parseEtps(text) {
  const etpText = cleanWeatherText(text)
  const etpMatches = [
    ...etpText.matchAll(
      /((?:DEPRESSURIZATION|2\s*ENG(?:INE)?\s*INOP|TWO\s*ENG(?:INE)?\s*INOP)\s+ETP)\s+FOR\s+([A-Z]{4})\/([A-Z]{4})\s+LOC\s+([NS]\d{5}[EW]\d{6})(.*?)(?=\s+(?:DEPRESSURIZATION|2\s*ENG(?:INE)?\s*INOP|TWO\s*ENG(?:INE)?\s*INOP)\s+ETP\s+FOR|\s+[A-Z]{4}\s+VALIDITY WINDOW|\s+NATIONAL\s+AIRLINES\s+BRIEF|$)/gi,
    ),
  ]

  const validityWindows = {}

  for (const match of etpText.matchAll(
    /\b([A-Z]{4})\s+VALIDITY WINDOW\s+([0-9:]{4,5}Z)\s+TO\s+([0-9:]{4,5}Z)/gi,
  )) {
    validityWindows[match[1]] = `${match[2]} to ${match[3]}`
  }

  return etpMatches.map((match) => ({
    type: describeEtpType(match[1]),
    airportPair: `${match[2]}/${match[3]}`,
    location: match[4],
    firstAirport: match[2],
    secondAirport: match[3],
    firstValidity: validityWindows[match[2]] ?? 'Not found',
    secondValidity: validityWindows[match[3]] ?? 'Not found',
  }))
}

function getIcaoFromAirport(airport) {
  const match = airport.match(/\/([A-Z]{4})\b/)

  return match ? match[1] : null
}

function cleanWeatherText(text) {
  return text
    .replace(/NATIONAL\s+AIRLINES\s+BRIEF\s+PAGE\s+\d+\s+OF\s+\d+\s+PAGE\s+\d+\s+OF\s+\d+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitWeatherReports(text, reportType, icao) {
  if (text === 'Not found') {
    return []
  }

  const reportPattern = new RegExp(`\\b${reportType}\\s+${icao}\\b`, 'gi')
  const starts = [...text.matchAll(reportPattern)].map((match) => match.index)

  if (starts.length === 0) {
    return [text]
  }

  return starts.map((start, index) => {
    const end = starts[index + 1] ?? text.length
    return text.slice(start, end).trim()
  })
}

function parseWeatherSections(text) {
  const weatherSections = {}
  const sectionMatches = [
    ...text.matchAll(/(?:DEPARTURE|ARRIVAL|OTHER):\s+.*?(?=\s+METAR\s+[A-Z]{4})/gi),
  ]

  sectionMatches.forEach((sectionMatch, index) => {
    const sectionStart = sectionMatch.index
    const nextSectionStart = sectionMatches[index + 1]?.index ?? text.length
    const block = cleanWeatherText(text.slice(sectionStart, nextSectionStart))
    const icao = findMatch(block, [/METAR\s+([A-Z]{4})\b/i])

    if (icao === 'Not found') {
      return
    }

    const tafIndex = block.search(new RegExp(`\\bTAF\\s+${icao}\\b`, 'i'))
    const firstMetarIndex = block.search(new RegExp(`\\bMETAR\\s+${icao}\\b`, 'i'))
    const notamPattern = new RegExp(
      `\\s(?:[A-Z][A-Z /]{0,18}\\s+-\\s+${icao}\\b|\\*\\*NEW\\*\\*${icao}\\b)`,
      'i',
    )
    const afterTaf = tafIndex >= 0 ? block.slice(tafIndex) : ''
    const notamRelativeIndex = afterTaf.search(notamPattern)
    const notamIndex = tafIndex >= 0 && notamRelativeIndex >= 0
      ? tafIndex + notamRelativeIndex
      : -1

    const metar = firstMetarIndex >= 0
      ? block.slice(firstMetarIndex, tafIndex >= 0 ? tafIndex : notamIndex >= 0 ? notamIndex : block.length).trim()
      : 'Not found'
    const taf = tafIndex >= 0
      ? block.slice(tafIndex, notamIndex >= 0 ? notamIndex : block.length).trim()
      : 'Not found'
    const notams = notamIndex >= 0 ? block.slice(notamIndex).trim() : 'Not found'

    weatherSections[icao] = {
      metar,
      metars: splitWeatherReports(metar, 'METAR', icao),
      taf,
      tafs: splitWeatherReports(taf, 'TAF', icao),
      notams,
    }
  })

  return weatherSections
}

function parseFlightPlan(text) {
  const normalizedText = text.replace(/\s+/g, ' ')

  const originDetails = normalizedText.match(
    /ORIGIN\s+([A-Z]{3}\/[A-Z]{4}\s+.*?)(?:\s+[NS]\d{5}[EW]\d{6})\s+([0-9]{4}Z)(?=\s+DESTINATION)/i,
  )

  const destinationDetails = normalizedText.match(
    /DESTINATION\s+([A-Z]{3}\/[A-Z]{4}\s+.*?)(?:\s+[NS]\d{5}[EW]\d{6})\s+([0-9]{4}Z)(?=\s+ALTERNATE)/i,
  )

  const alternateDetails = normalizedText.match(
    /ALTERNATE\s+([A-Z]{3}\/[A-Z]{4}\s+.*?)(?:\s+[NS]\d{5}[EW]\d{6})\s+([0-9]{4}Z)(?=\s+ENROUTE ALTN|\s+RMKS\/)/i,
  )

  return {
    plan: findMatch(normalizedText, [
      /PLAN\s+#\s*(\d+)/i,
    ]),
    trip: findMatch(normalizedText, [
      /TRIP\s+#\s*(\d+)/i,
    ]),
    computeTime: findMatch(normalizedText, [
      /COMPUTE TIME:\s*([0-9]{4}Z)/i,
    ]),
    revision: findMatch(normalizedText, [
      /REVISION:\s*(\d+)/i,
    ]),
    dispatcher: findMatch(normalizedText, [
      /DISPATCHER\s*:\s*([A-Z\s]+?)\s+\d{4,}/i,
    ]),
    flight: findMatch(normalizedText, [
      /\b([A-Z]{3}\d{3,4})\s*\/\s*\d{2}[A-Z]{3}\d{2}\b/,
    ]),
    date: findMatch(normalizedText, [
      /[A-Z]{3}\d{3,4}\s*\/\s*(\d{2}[A-Z]{3}\d{2})\b/,
    ]),
    aircraftRegistration: findMatch(normalizedText, [
      /\d{2}[A-Z]{3}\d{2}\s+([A-Z]\d{3}[A-Z]{2})\s+B/i,
    ]),
    origin: originDetails ? originDetails[1].trim() : 'Not found',
    etd: originDetails ? originDetails[2].trim() : 'Not found',
    destination: destinationDetails ? destinationDetails[1].trim() : 'Not found',
    eta: destinationDetails ? destinationDetails[2].trim() : 'Not found',
    alternate: alternateDetails ? alternateDetails[1].trim() : 'Not found',
    alternateEta: alternateDetails ? alternateDetails[2].trim() : 'Not found',
    takeoffAlternates: parseTakeoffAlternates(normalizedText),
    enrouteAlternates: parseEnrouteAlternates(normalizedText),
    melItems: parseMelItems(normalizedText),
    fuel: parseFuelSection(normalizedText),
    route: parseRouteSection(normalizedText),
    etps: parseEtps(normalizedText),
    crew: parseCrewSection(normalizedText),
    fakWeights: parseFakWeights(normalizedText),
    weather: parseWeatherSections(normalizedText),
  }
}

function App() {
  const [fileName, setFileName] = useState('')
  const [pdfText, setPdfText] = useState('')
  const [status, setStatus] = useState('Choose a PDF flight plan to begin.')
  const [summary, setSummary] = useState(null)
  const [showExtractedText, setShowExtractedText] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [density, setDensity] = useState('')
  const [pic, setPic] = useState('')

  async function handleFileChange(event) {
    const file = event.target.files[0]

    if (!file) {
      return
    }

    setFileName(file.name)
    setPdfText('')
    setSummary(null)
    setShowExtractedText(false)
    setStatus('Reading PDF...')

    let extractedText = ''
    let pageCount = 0

    try {
      const fileBuffer = await file.arrayBuffer()
      const pdfData = new Uint8Array(fileBuffer)
      const pdf = await pdfjsLib.getDocument({
        data: pdfData,
        disableWorker: true,
      }).promise
      const pages = []
      pageCount = pdf.numPages

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item) => item.str).join(' ')
        pages.push(pageText)
      }

      extractedText = pages.join('\n\n')

      if (!extractedText.trim()) {
        throw new Error('No selectable text was found in this PDF.')
      }
    } catch (error) {
      console.error(error)
      setStatus(getPdfErrorMessage(error))
      return
    }

    try {
      const parsedSummary = parseFlightPlan(extractedText)
      setPdfText(extractedText)
      setSummary(parsedSummary)
      setPic(parsedSummary.fuel?.pic === 'Not found' ? '' : parsedSummary.fuel?.pic ?? '')
      setStatus(`Read ${pageCount} page(s) from ${file.name} (${formatFileSize(file.size)}).`)
    } catch (error) {
      console.error(error)
      setStatus(`Parser failed after reading PDF: ${error?.message ?? 'Unknown parser error'}`)
    }
  }

  return (
    <main className="app">
      <section className="briefing-panel">
        <p className="eyebrow">Flight Plan Parser</p>
        <h1>Flight Briefing App</h1>

        <nav className="tabs" aria-label="Briefing sections">
          {[
            ['home', 'Upload'],
            ['summary', 'Summary'],
            ['route', 'Route'],
            ['lmChit', 'LM Chit'],
          ].map(([tabId, label]) => (
            <button
              type="button"
              className={activeTab === tabId ? 'active' : ''}
              key={tabId}
              onClick={() => setActiveTab(tabId)}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === 'home' && (
          <section className="tab-panel">
            <label className="upload-box">
              <span>Choose a PDF flight plan</span>
              <input type="file" accept="application/pdf" onChange={handleFileChange} />
            </label>

            {fileName && (
              <div className="file-card">
                <strong>Selected file:</strong>
                <span>{fileName}</span>
              </div>
            )}

            <p className={summary ? 'status success' : 'status'}>{status}</p>

            {pdfText && (
              <section className="text-preview">
                <button
                  type="button"
                  className="text-toggle"
                  onClick={() => setShowExtractedText((currentValue) => !currentValue)}
                >
                  {showExtractedText ? 'Hide extracted text' : 'Show extracted text'}
                </button>

                {showExtractedText && <pre>{pdfText}</pre>}
              </section>
            )}
          </section>
        )}

        {activeTab === 'summary' && (
          <section className="tab-panel">
            {!summary && <p className="empty-state">Upload a PDF on the Home tab first.</p>}

            {summary && (
              <>
                <section className="briefing-summary">
                  <div className="admin-strip">
                    <div>
                      <span>Plan</span>
                      <strong>{summary.plan}</strong>
                    </div>
                    <div>
                      <span>Trip</span>
                      <strong>{summary.trip}</strong>
                    </div>
                    <div>
                      <span>Compute</span>
                      <strong>{summary.computeTime}</strong>
                    </div>
                    <div>
                      <span>Revision</span>
                      <strong>{summary.revision}</strong>
                    </div>
                    <div>
                      <span>Dispatcher</span>
                      <strong>{summary.dispatcher}</strong>
                    </div>
                  </div>

                  <div className="flight-strip">
                    <div>
                      <span>Date</span>
                      <strong>{summary.date}</strong>
                    </div>
                    <div>
                      <span>Flight</span>
                      <strong>{summary.flight}</strong>
                    </div>
                    <div>
                      <span>Registration</span>
                      <strong>{summary.aircraftRegistration}</strong>
                    </div>
                  </div>

                  <div className="airport-grid">
                    <article>
                      <span>Origin</span>
                      <strong>{summary.origin}</strong>
                      <em>ETD {summary.etd}</em>
                    </article>
                    <article>
                      <span>Destination</span>
                      <strong>{summary.destination}</strong>
                      <em>ETA {summary.eta}</em>
                    </article>
                    <article>
                      <span>Alternate</span>
                      <strong>{summary.alternate}</strong>
                      <em>ETA {summary.alternateEta}</em>
                    </article>
                  </div>

                  {(summary.takeoffAlternates.length > 0 ||
                    summary.enrouteAlternates.length > 0) && (
                    <ExtraAlternates
                      takeoffAlternates={summary.takeoffAlternates}
                      enrouteAlternates={summary.enrouteAlternates}
                    />
                  )}
                </section>

                {summary.fuel && <FuelCard fuel={summary.fuel} />}
                {summary.crew && <CrewCard crew={summary.crew} />}
              </>
            )}
          </section>
        )}

        {activeTab === 'route' && (
          <section className="tab-panel">
            {!summary?.route && <p className="empty-state">No route data parsed yet.</p>}

            {summary?.route && (
              <section className="route-card">
                <div className="route-header">
                  <h2>Route Summary</h2>
                  <div>
                    <span>Wind</span>
                    <strong>{summary.route.wind}</strong>
                  </div>
                  <div>
                    <span>MXSH</span>
                    <strong>{summary.route.maxShear}</strong>
                  </div>
                </div>

                <p>{summary.route.route}</p>
              </section>
            )}

            {summary?.enrouteAlternates?.length > 0 && (
              <ExtraAlternates
                takeoffAlternates={summary.takeoffAlternates}
                enrouteAlternates={summary.enrouteAlternates}
              />
            )}

            {summary?.etps?.length > 0 && <EtpCard etps={summary.etps} />}

            {summary && (
              <AerodromeWeatherCards
                summary={summary}
              />
            )}
          </section>
        )}

        {activeTab === 'lmChit' && (
          <section className="tab-panel">
            {!summary && <p className="empty-state">Upload a PDF on the Home tab first.</p>}

            {summary && (
              <>
                <section className="lm-chit-card">
                  <h2>LM Chit</h2>

                  <div className="lm-grid">
                    <div>
                      <span>Burn</span>
                      <strong>{summary.fuel?.burn ?? 'Not found'}</strong>
                    </div>
                    <div>
                      <span>Taxi</span>
                      <strong>{summary.fuel?.taxiFuel ?? 'Not found'}</strong>
                    </div>
                    <label>
                      <span>PIC</span>
                      <input
                        type="text"
                        value={pic}
                        onChange={(event) => setPic(event.target.value)}
                        placeholder="Enter PIC"
                      />
                    </label>
                    <div>
                      <span>Payload</span>
                      <strong>{summary.fuel?.payload ?? 'Not found'}</strong>
                    </div>
                    <label>
                      <span>Density</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={density}
                        onChange={(event) => setDensity(event.target.value)}
                        placeholder="Enter density"
                      />
                    </label>
                    <div>
                      <span>RF</span>
                      <strong>{summary.fuel?.totalFuel ?? 'Not found'}</strong>
                    </div>
                    <div>
                      <span>SOB</span>
                      <strong>{summary.crew?.sob ?? 'Not found'}</strong>
                    </div>
                  </div>
                </section>

                {summary.fakWeights && (
                  <section className="fak-card">
                    <div className="fak-header">
                      <h2>FAK Weights</h2>
                      <div>
                        <span>Total</span>
                        <strong>{summary.fakWeights.total} KGS</strong>
                      </div>
                    </div>

                    <div className="fak-list">
                      {summary.fakWeights.items.map((item) => (
                        <div className="fak-row" key={`${item.label}-${item.weight}`}>
                          <span>{item.label}</span>
                          <strong>{item.weight} KGS</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        )}
      </section>
    </main>
  )
}

function FuelCard({ fuel }) {
  return (
    <section className="fuel-card">
      <h2>Fuel Summary</h2>

      <div className="fuel-flags">
        <div>
          <span>B043</span>
          <strong>{fuel.isB043}</strong>
        </div>
        <div>
          <span>B044 / Redispatch</span>
          <strong>{fuel.isB044Redispatch}</strong>
        </div>
      </div>

      <div className="fuel-columns">
        <div className="fuel-column">
          <div>
            <span>Burn</span>
            <strong>{fuel.burn}</strong>
            <em>{fuel.flightTime}</em>
          </div>
          <div className="fuel-pair">
            <div>
              <span>ALTN</span>
              <strong>{fuel.alternateFuel}</strong>
            </div>
            <div>
              <span>ALTN + 7.5</span>
              <strong>{fuel.alternatePlusReserve}</strong>
            </div>
          </div>
          <div>
            <span>Reserve</span>
            <strong>{fuel.reserveFuel}</strong>
            <em>{fuel.reserveMinutes} min</em>
          </div>
          <div>
            <span>Reserve 2</span>
            <strong>{fuel.secondReserveFuel}</strong>
          </div>
          <div>
            <span>Hold</span>
            <strong>{fuel.holdFuel}</strong>
            <em>{fuel.holdTime}</em>
          </div>
          <div>
            <span>Additional</span>
            <strong>{fuel.additionalFuel}</strong>
            <em>{fuel.additionalTime}</em>
          </div>
          <div>
            <span>Ballast</span>
            <strong>{fuel.ballast}</strong>
          </div>
        </div>

        <div className="fuel-column">
          <div>
            <span>Payload</span>
            <strong>{fuel.payload}</strong>
          </div>
          <div>
            <span>ZFW</span>
            <strong>{fuel.zeroFuelWeight}</strong>
          </div>
          <div>
            <span>TOW</span>
            <strong>{fuel.takeoffWeight}</strong>
          </div>
          <div>
            <span>ELW</span>
            <strong>{fuel.estimatedLandingWeight}</strong>
          </div>
          <div>
            <span>RCMD AF</span>
            <strong>{fuel.recommendedArrivalFuel}</strong>
          </div>
        </div>
      </div>

      <div className="fuel-total-row">
        <div>
          <span>Required</span>
          <strong>{fuel.requiredFuel}</strong>
        </div>
        <div>
          <span>Taxi</span>
          <strong>{fuel.taxiFuel}</strong>
        </div>
        <div>
          <span>Extra</span>
          <strong>{fuel.extraFuel}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{fuel.totalFuel}</strong>
        </div>
      </div>

      <div className="fuel-footer-row">
        <div>
          <span>Distance</span>
          <strong>{fuel.distance}</strong>
        </div>
        <div>
          <span>Fuel Bias</span>
          <strong>{fuel.fuelBias}</strong>
        </div>
      </div>
    </section>
  )
}

function CrewCard({ crew }) {
  return (
    <section className="crew-card">
      <h2>Crew</h2>

      <div className="crew-columns">
        <div className="crew-manifest">
          <h3>Flight Crew</h3>
          {crew.members
            .filter((member) => member.role === 'CPT' || member.role === 'FO')
            .map((member) => (
              <div className="crew-row" key={`${member.role}-${member.name}-${member.employeeNumber}`}>
                <span>{member.role}</span>
                <strong>{member.name}</strong>
                <em>{member.employeeNumber}</em>
              </div>
            ))}
        </div>

        <div className="crew-manifest">
          <h3>Other Crew</h3>
          {crew.members
            .filter((member) => member.role !== 'CPT' && member.role !== 'FO')
            .map((member) => (
              <div className="crew-row" key={`${member.role}-${member.name}-${member.employeeNumber}`}>
                <span>{member.role}</span>
                <strong>{member.name}</strong>
                <em>{member.employeeNumber}</em>
              </div>
            ))}

          {crew.jumpseaters.length === 0 && (
            <div className="crew-row is-empty">
              <span>J/S</span>
              <strong>None listed</strong>
              <em></em>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ExtraAlternates({ takeoffAlternates, enrouteAlternates }) {
  return (
    <section className="alternate-card">
      <h2>Additional Alternates</h2>

      <div className="alternate-grid">
        {takeoffAlternates.map((alternate) => (
          <article key={`takeoff-${alternate}`}>
            <span>Takeoff Alternate</span>
            <strong>{alternate}</strong>
          </article>
        ))}

        {enrouteAlternates.map((alternate) => (
          <article key={`enroute-${alternate}`}>
            <span>Enroute Alternate</span>
            <strong>{alternate}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}

function EtpCard({ etps }) {
  return (
    <section className="etp-card">
      <h2>ETP</h2>

      <div className="etp-list">
        {etps.map((etp) => (
          <article className="etp-item" key={`${etp.type}-${etp.airportPair}-${etp.location}`}>
            <div className="etp-header">
              <div>
                <span>Type</span>
                <strong>{etp.type}</strong>
              </div>
              <div>
                <span>Airport Pair</span>
                <strong>{etp.airportPair}</strong>
              </div>
              <div>
                <span>ETP Location</span>
                <strong>{etp.location}</strong>
              </div>
            </div>

            <div className="etp-validity">
              <div>
                <span>{etp.firstAirport} Validity</span>
                <strong>{etp.firstValidity}</strong>
              </div>
              <div>
                <span>{etp.secondAirport} Validity</span>
                <strong>{etp.secondValidity}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function AerodromeWeatherCards({ summary }) {
  const aerodromes = [
    { label: 'Origin', airport: summary.origin },
    { label: 'Destination', airport: summary.destination },
    { label: 'Alternate', airport: summary.alternate },
    ...summary.takeoffAlternates.map((airport) => ({
      label: 'Takeoff Alternate',
      airport,
    })),
    ...summary.enrouteAlternates.map((airport) => ({
      label: 'Enroute Alternate',
      airport,
    })),
  ]
    .map((aerodrome) => ({
      ...aerodrome,
      icao: getIcaoFromAirport(aerodrome.airport),
    }))
    .filter((aerodrome) => aerodrome.icao)
    .filter((aerodrome, index, allAerodromes) =>
      allAerodromes.findIndex((item) => item.icao === aerodrome.icao) === index
    )

  return (
    <section className="weather-section">
      <h2>Aerodrome Weather</h2>

      <div className="weather-grid">
        {aerodromes.map((aerodrome) => {
          const weather = summary.weather[aerodrome.icao]

          return (
            <article className="weather-card" key={aerodrome.icao}>
              <div className="weather-card-header">
                <div>
                  <span>{aerodrome.label}</span>
                  <strong>{aerodrome.airport}</strong>
                </div>
                <em>{aerodrome.icao}</em>
              </div>

              <div className="weather-report">
                <span>METAR</span>
                {weather?.metars?.length > 0 ? (
                  weather.metars.map((metar) => <p key={metar}>{metar}</p>)
                ) : (
                  <p>Not found</p>
                )}
              </div>

              <div className="weather-report">
                <span>TAF</span>
                <p>{weather?.taf ?? 'Not found'}</p>
              </div>

            </article>
          )
        })}
      </div>
    </section>
  )
}

export default App
