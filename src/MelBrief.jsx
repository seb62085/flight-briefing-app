import { flightDateIso, melExpiry } from './briefingCalculations.js'

export default function MelBrief({ summary, values, onEdit }) {
  const reference = values.referenceDate ?? (flightDateIso(summary.date) || new Date().toISOString().slice(0,10))
  const items = summary.melItems
  return <section className="worksheet-card mel-brief" id="mel-card">
    <div className="mel-header"><div><h2>MEL Brief</h2><p>{summary.flight} · {summary.aircraftRegistration} · {summary.date}</p></div><button type="button" className="print-mel" onClick={() => window.print()}>Print MEL brief</button></div>
    <label className="tool-field mel-date"><span>Expiry reference date (UTC)</span><input type="date" value={reference} onChange={(event) => onEdit('referenceDate', event.target.value)} /></label>
    {items.length === 0 ? <p>No MEL entries were found in the PDF. Check the source flight plan.</p> : <div className="mel-table-wrap"><table className="mel-table"><thead><tr><th>MEL number</th><th>Due date</th><th>DMI number</th><th>Description</th><th>Captain’s comments</th></tr></thead><tbody>{items.map((item,index) => {
      const expiry = melExpiry(item.expiryDate, reference)
      const duplicate = items.filter((other) => other.dmiNumber === item.dmiNumber).length > 1
      const key = `${item.melNumber}/${item.dmiNumber}/${index}`
      return <tr key={key}>
        <td>{item.melNumber}</td>
        <td className={expiry.className}>{item.expiryDate}<small>{expiry.label}</small></td>
        <td className={duplicate ? 'mel-expired' : ''}>{item.dmiNumber}{duplicate && <small>Duplicate DMI</small>}</td>
        <td>{item.note}</td>
        <td><textarea aria-label={`Captain’s comments for ${item.melNumber}, DMI ${item.dmiNumber}, item ${index + 1}`} value={values[key] ?? ''} onChange={(event) => onEdit(key,event.target.value)} rows={4} /><div className="mel-print-comments">{values[key]}</div></td>
      </tr>
    })}</tbody></table></div>}
    <p className="tool-note">Comments are saved with the last flight on this device. Expiry highlights flag items due within two days, due today, or expired. Verify entries against the aircraft logbook.</p>
  </section>
}
