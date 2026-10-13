import { useState } from 'react'
import { preflightColumns, departureItems, oceanicGroups, checklistProgress } from './checklistItems.js'

function CheckItem({ item, value, onEdit }) {
  const done = value === 'done'
  const skipped = item.optional && value === 'na'
  return <div className={`checklist-row${done ? ' checklist-done' : ''}${skipped ? ' checklist-skipped' : ''}`}>
    <label className="checklist-item">
      <input type="checkbox" checked={done} onChange={(event) => onEdit(item.id, event.target.checked ? 'done' : '')} />
      <span>{item.label}{skipped && <small>Not applicable</small>}</span>
    </label>
    {item.optional && <button type="button" className="checklist-na" aria-label={`Not applicable: ${item.label}`} aria-pressed={skipped} onClick={() => onEdit(item.id, skipped ? '' : 'na')}>N/A</button>}
  </div>
}

function CheckSection({ title, id, items, columns, values, onEdit }) {
  const { total, reviewed } = checklistProgress(items, values)
  return <section className="worksheet-card checklist-section" id={id}>
    <div className="checklist-section-header"><h2>{title}</h2><span className={reviewed === total ? 'checks-complete' : ''}>{reviewed}/{total} reviewed</span></div>
    {columns ? <div className="checklist-columns">{columns.map((column,index) => <div key={index}>{column.map((item) => <CheckItem key={item.id} item={item} value={values[item.id]} onEdit={onEdit} />)}</div>)}</div> : <div className="checklist-grid">{items.map((item) => <CheckItem key={item.id} item={item} value={values[item.id]} onEdit={onEdit} />)}</div>}
  </section>
}

export default function Checklist({ summary, values, onChange, saveStatus }) {
  const [resetPending, setResetPending] = useState(false)
  const oceanic = values.oceanic === true
  const items = [...preflightColumns.flat(), ...departureItems, ...(oceanic ? oceanicGroups.flatMap((group) => group.items) : [])]
  const { reviewed, total } = checklistProgress(items, values)
  const edit = (key, value) => onChange({ ...values, [key]: value })
  return <div className="flight-checklist">
    <section className="worksheet-card checklist-overview">
      <div className="checklist-section-header"><div><h2>Flight checklist</h2><p>{summary.flight} · {summary.aircraftRegistration} · {summary.date}</p></div><button type="button" className="checklist-reset" onClick={() => setResetPending(true)}>Reset checklist</button></div>
      <div className="checklist-progress-text" role="status">{reviewed === total ? 'All checks reviewed' : `${reviewed} of ${total} checks reviewed`}</div>
      <progress value={reviewed} max={total} aria-label="Checklist progress" />
      <p className="tool-note">Tap a checkbox when reviewed. Use N/A for conditional items that do not apply. Progress is saved with this flight on this device.</p>
      <p className="checklist-save-status" aria-live="polite">{saveStatus}</p>
      {resetPending && <div className="checklist-reset-confirm" role="group" aria-label="Confirm checklist reset"><p>Clear all checklist marks for this flight?</p><button type="button" onClick={() => { onChange({ oceanic }); setResetPending(false) }}>Confirm reset</button><button type="button" onClick={() => setResetPending(false)}>Cancel</button></div>}
    </section>
    <CheckSection id="preflight-checklist" title="Preflight" items={preflightColumns.flat()} columns={preflightColumns} values={values} onEdit={edit} />
    <CheckSection id="departure-checklist" title="Departure briefing" items={departureItems} values={values} onEdit={edit} />
    <section className="worksheet-card oceanic-selector" id="oceanic-checklist">
      <label className="oceanic-switch"><input type="checkbox" role="switch" checked={oceanic} onChange={(event) => edit('oceanic', event.target.checked)} /><span>Oceanic flight</span></label>
      <p className="tool-note">{oceanic ? 'Oceanic checks are included in the flight’s progress below.' : 'Enable to include preparation, entry, and oceanic / exit checks.'}</p>
    </section>
    {oceanic && oceanicGroups.map((group) => <CheckSection key={group.id} id={group.id} title={group.title} items={group.items} values={values} onEdit={edit} />)}
    <p className="tool-note">Personal briefing aid, based on your screen recording and CFDS REV 05 oceanic worksheet. Follow current company procedures.</p>
  </div>
}
