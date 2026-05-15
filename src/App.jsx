import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
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
      /\b(CPT|FO|LM|MX|J\/S)\s+([A-Z][A-Z\s]+?)\s+(?:[A-Z]{1,4}\s+)?(\d{4,6})(?=\s+(?:CPT|FO|LM|MX|J\/S)\b|$)/gi,
    ),
  ].map((match) => ({
    role: match[1].toUpperCase(),
    name: match[2].replace(/\s+/g, ' ').trim(),
    employeeNumber: match[3].trim(),
  }))

  if (crewMembers.length === 0) {
    return null
  }

  return {
    members: crewMembers,
    captains: crewMembers.filter((member) => member.role === 'CPT'),
    firstOfficers: crewMembers.filter((member) => member.role === 'FO'),
    loadmasters: crewMembers.filter((member) => member.role === 'LM'),
    maintenance: crewMembers.filter((member) => member.role === 'MX'),
    jumpseaters: crewMembers.filter((member) => member.role === 'J/S'),
  }
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
    /ALTERNATE\s+([A-Z]{3}\/[A-Z]{4}\s+.*?)(?:\s+[NS]\d{5}[EW]\d{6})\s+([0-9]{4}Z)(?=\s+RMKS\/)/i,
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
      /\b([A-Z]{3}\d{3,4})\/\d{2}[A-Z]{3}\d{2}\b/,
    ]),
    date: findMatch(normalizedText, [
      /[A-Z]{3}\d{3,4}\/(\d{2}[A-Z]{3}\d{2})\b/,
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
    melItems: parseMelItems(normalizedText),
    fuel: parseFuelSection(normalizedText),
    route: parseRouteSection(normalizedText),
    crew: parseCrewSection(normalizedText),
  }
}

function App() {
  const [fileName, setFileName] = useState('')
  const [pdfText, setPdfText] = useState('')
  const [status, setStatus] = useState('Choose a PDF flight plan to begin.')
  const [summary, setSummary] = useState(null)
  const [showExtractedText, setShowExtractedText] = useState(false)

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

    try {
      const fileBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise
      const pages = []

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item) => item.str).join(' ')
        pages.push(pageText)
      }

      const extractedText = pages.join('\n\n')
      setPdfText(extractedText)
      setSummary(parseFlightPlan(extractedText))
      setStatus(`Read ${pdf.numPages} page(s) from the PDF.`)
    } catch (error) {
      console.error(error)
      setStatus('Sorry, I could not read text from that PDF.')
    }
  }

  return (
    <main className="app">
      <section className="briefing-panel">
        <p className="eyebrow">Flight Plan Parser</p>
        <h1>Flight Briefing App</h1>
        <p className="intro">
          Upload a PDF flight plan and this app will extract the raw text first.
          After that, we will teach it how to find the important briefing details.
        </p>

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

        <p className="status">{status}</p>

        {summary && (
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
          </section>
        )}

        {summary?.fuel && (
          <section className="fuel-card">
            <h2>Fuel Summary</h2>

            <div className="fuel-flags">
              <div>
                <span>B043</span>
                <strong>{summary.fuel.isB043}</strong>
              </div>
              <div>
                <span>B044 / Redispatch</span>
                <strong>{summary.fuel.isB044Redispatch}</strong>
              </div>
            </div>

            <div className="fuel-columns">
              <div className="fuel-column">
                <div>
                  <span>Burn</span>
                  <strong>{summary.fuel.burn}</strong>
                  <em>{summary.fuel.flightTime}</em>
                </div>
                <div className="fuel-pair">
                  <div>
                    <span>ALTN</span>
                    <strong>{summary.fuel.alternateFuel}</strong>
                  </div>
                  <div>
                    <span>ALTN + 7.5</span>
                    <strong>{summary.fuel.alternatePlusReserve}</strong>
                  </div>
                </div>
                <div>
                  <span>Reserve</span>
                  <strong>{summary.fuel.reserveFuel}</strong>
                  <em>{summary.fuel.reserveMinutes} min</em>
                </div>
                <div>
                  <span>Reserve 2</span>
                  <strong>{summary.fuel.secondReserveFuel}</strong>
                </div>
                <div>
                  <span>Additional</span>
                  <strong>{summary.fuel.additionalFuel}</strong>
                  <em>{summary.fuel.additionalTime}</em>
                </div>
                <div>
                  <span>Ballast</span>
                  <strong>{summary.fuel.ballast}</strong>
                </div>
              </div>

              <div className="fuel-column">
                <div>
                  <span>Payload</span>
                  <strong>{summary.fuel.payload}</strong>
                </div>
                <div>
                  <span>ZFW</span>
                  <strong>{summary.fuel.zeroFuelWeight}</strong>
                </div>
                <div>
                  <span>TOW</span>
                  <strong>{summary.fuel.takeoffWeight}</strong>
                </div>
                <div>
                  <span>ELW</span>
                  <strong>{summary.fuel.estimatedLandingWeight}</strong>
                </div>
                <div>
                  <span>RCMD AF</span>
                  <strong>{summary.fuel.recommendedArrivalFuel}</strong>
                </div>
              </div>
            </div>

            <div className="fuel-total-row">
              <div>
                <span>Required</span>
                <strong>{summary.fuel.requiredFuel}</strong>
              </div>
              <div>
                <span>Taxi</span>
                <strong>{summary.fuel.taxiFuel}</strong>
              </div>
              <div>
                <span>Extra</span>
                <strong>{summary.fuel.extraFuel}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{summary.fuel.totalFuel}</strong>
              </div>
            </div>

            <div className="fuel-footer-row">
              <div>
                <span>Distance</span>
                <strong>{summary.fuel.distance}</strong>
              </div>
              <div>
                <span>Fuel Bias</span>
                <strong>{summary.fuel.fuelBias}</strong>
              </div>
            </div>
          </section>
        )}

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

        {summary?.crew && (
          <section className="crew-card">
            <h2>Crew</h2>

            <div className="crew-columns">
              <div className="crew-manifest">
                <h3>Flight Crew</h3>
                {summary.crew.members
                  .filter((member) => member.role === 'CPT' || member.role === 'FO')
                  .map((member) => (
                    <div className="crew-row" key={`${member.role}-${member.employeeNumber}`}>
                      <span>{member.role}</span>
                      <strong>{member.name}</strong>
                      <em>{member.employeeNumber}</em>
                    </div>
                  ))}
              </div>

              <div className="crew-manifest">
                <h3>Other Crew</h3>
                {summary.crew.members
                  .filter((member) => member.role !== 'CPT' && member.role !== 'FO')
                  .map((member) => (
                    <div className="crew-row" key={`${member.role}-${member.employeeNumber}`}>
                      <span>{member.role}</span>
                      <strong>{member.name}</strong>
                      <em>{member.employeeNumber}</em>
                    </div>
                  ))}

                {summary.crew.jumpseaters.length === 0 && (
                  <div className="crew-row is-empty">
                    <span>J/S</span>
                    <strong>None listed</strong>
                    <em></em>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {summary?.melItems?.length > 0 && (
          <section className="mel-list">
            <h2>Planned MEL Items</h2>

            {summary.melItems.map((item) => (
              <article className="mel-card" key={`${item.melNumber}-${item.dmiNumber}`}>
                <div className="mel-meta">
                  <div>
                    <span>MEL</span>
                    <strong>{item.melNumber}</strong>
                  </div>
                  <div>
                    <span>DMI</span>
                    <strong>{item.dmiNumber}</strong>
                  </div>
                  <div>
                    <span>Expires</span>
                    <strong>{item.expiryDate}</strong>
                  </div>
                </div>
                <p>{item.note}</p>
              </article>
            ))}
          </section>
        )}

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
    </main>
  )
}

export default App
