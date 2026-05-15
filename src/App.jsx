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