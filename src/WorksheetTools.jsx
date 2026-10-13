import { absoluteMaxFuel, numberOrNull, dutyTimes, displayUtc, fuelDistribution, upliftCalculation } from './briefingCalculations.js'
import data from './workbookData.json'

function Field({ label, value, onChange, type = 'number', ...props }) {
  return <label className="tool-field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} {...(type === 'number' ? { min: 0, step: 'any' } : {})} {...props} /></label>
}
function Result({ label, children }) {
  return <div className="tool-result"><span>{label}</span><strong>{children}</strong></div>
}
const parsedValue = (value) => numberOrNull(value) === null ? '' : value
const format = (value, digits = 1) => value === null || value === undefined ? '—' : value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export default function WorksheetTools({ summary, values, onEdit, density, onDensity }) {
  const fuel = summary.fuel
  const get = (key, fallback = '') => values[key] ?? fallback
  const edit = (key) => (value) => onEdit(key, value)
  const landing = get('landingLimit', data.landingLimits[summary.aircraftRegistration] ?? '')
  const burn = get('burn', parsedValue(fuel?.burn))
  const zfw = get('zfw', parsedValue(fuel?.zeroFuelWeight))
  const maximum = absoluteMaxFuel(burn, zfw, landing)
  const pilotCount = summary.crew?.members.filter((member) => ['CPT', 'FO'].includes(member.role)).length
  const pilots = get('pilots', [2,3,4].includes(pilotCount) ? String(pilotCount) : '')
  const origin = summary.origin.match(/\/([A-Z]{4})/)?.[1]
  const destination = summary.destination.match(/\/([A-Z]{4})/)?.[1]
  const inferredRules = origin && destination ? (origin.startsWith('K') && destination.startsWith('K') ? 'domestic' : 'international') : ''
  const rules = get('rules', inferredRules)
  const flightTime = get('flightTime', /^\d{4}$/.test(fuel?.flightTime ?? '') ? `${fuel.flightTime.slice(0,2)}:${fuel.flightTime.slice(2)}` : '')
  const duty = dutyTimes(get('dutyOn'), pilots, rules, flightTime, get('loadingMinutes', '0'))
  const ramp = get('rampFuel', numberOrNull(fuel?.totalFuel) === null ? '' : String(Number(fuel.totalFuel) / 1000))
  const distribution = fuelDistribution(numberOrNull(ramp) === null ? null : Number(ramp) * 1000)
  const densityM3 = numberOrNull(density) === null ? '' : String(Number(density) * 1000)
  const start = get('startFuel')
  const unit = get('volumeUnit', 'litres')
  const volume = get('quantity')
  const uplift = upliftCalculation(start, ramp, volume, unit, densityM3)
  const requiredKg = numberOrNull(start) !== null && numberOrNull(ramp) !== null && Number(ramp) >= Number(start) ? (Number(ramp) - Number(start)) * 1000 : null
  const expectedLitres = requiredKg !== null && Number(densityM3) > 0 ? requiredKg / (Number(densityM3) / 1000) : null
  return <>
    <section className="worksheet-card max-fuel-card" id="max-fuel-card">
      <Result label="Absolute max fuel per FP burn">{maximum === null ? 'Enter missing weights' : `${format(maximum, 0)} t`}</Result>
      <div className="tool-grid">
        <Field label="FP burn (kg)" value={burn} onChange={edit('burn')} />
        <Field label="ZFW (kg)" value={zfw} onChange={edit('zfw')} />
        <Field label="Max landing weight (t)" value={landing} onChange={edit('landingLimit')} />
      </div>
      <p className="tool-note">CFDS REV 05 worksheet formula · workbook landing limit for {summary.aircraftRegistration}. Confirm the aircraft limit or enter it above. Workbook cap: 164 t.</p>
    </section>
    <section className="worksheet-card" id="duty-card">
      <h2>Duty times</h2>
      <div className="tool-grid">
        <Field label="Duty on (UTC)" type="time" value={get('dutyOn')} onChange={edit('dutyOn')} />
        <label className="tool-field"><span>Duty rules</span><select aria-label="Duty rules" value={rules} onChange={(event) => onEdit('rules', event.target.value)}><option value="">Select rules</option><option value="domestic">Domestic (CONUS)</option><option value="international">International (OCONUS)</option></select></label>
        <label className="tool-field"><span>Flight deck pilots</span><select aria-label="Flight deck pilots" value={pilots} onChange={(event) => onEdit('pilots', event.target.value)}><option value="">Select pilots</option>{[2,3,4].map((count) => <option key={count} value={count}>{count} pilots</option>)}</select></label>
        <Field label="Flight time (HH:MM)" type="text" inputMode="numeric" placeholder="12:30" value={flightTime} onChange={edit('flightTime')} />
        <Field label="Additional loading time (min)" value={get('loadingMinutes', '0')} onChange={edit('loadingMinutes')} />
      </div>
      <div className="tool-grid">
        <Result label="Latest duty off">{displayUtc(duty?.off)}</Result>
        <Result label="Latest out time">{displayUtc(duty?.out)}</Result>
        <Result label="Workbook duty limit">{duty ? `${duty.limit} hours` : '—'}</Result>
      </div>
      <p className="tool-note">CFDS REV 05 rules: domestic 16/18/20 h and international 16/30/30 h for 2/3/4 pilots. Latest out = duty off − flight time − 50 min. Day offsets are relative to the duty-on date. Confirm inferred rules and pilot count; overrides remain editable.</p>
    </section>
    <section className="worksheet-card" id="distribution-card">
      <h2>Fuel distribution</h2>
      <Field label="Requested ramp fuel (t)" value={ramp} onChange={edit('rampFuel')} />
      {distribution ? <>
        <p className="tool-note">Workbook table load: {format(distribution[0] / 1000)} t (nearest 500 kg). Tank targets shown in tonnes.</p>
        <div className="tank-layout">
          <div className="center-tank"><Result label="Center">{format(distribution[4] / 1000)} t</Result></div>
          {['Main #1','Main #2','Main #3','Main #4'].map((name,index) => <Result key={name} label={name}>{format(distribution[[2,3,5,6][index]] / 1000)} t</Result>)}
          <div className="reserve-tank"><Result label="Reserve #2">{format(distribution[1] / 1000)} t</Result></div>
          <div className="reserve-tank"><Result label="Reserve #3">{format(distribution[7] / 1000)} t</Result></div>
        </div>
      </> : <p className="tool-note">Enter 20–163 t, the range covered by the colleague’s workbook. No tank allocation is extrapolated beyond that table.</p>}
      <p className="tool-note">CFDS REV 05 fuel-loading reference at standard density. Confirm applicability to the aircraft and fuel density before use.</p>
    </section>
    <section className="worksheet-card" id="density-card">
      <h2>Fuel density &amp; uplift calculator</h2>
      <div className="tool-grid">
        <Field label="Fuel density (kg/m³)" value={densityM3} onChange={(value) => onDensity(value === '' ? '' : String(Number(value) / 1000))} placeholder="800" />
        <Result label="Density (kg/L)">{numberOrNull(density) === null ? '—' : format(Number(density), 4)}</Result>
        <Result label="Density (lb/US gal)">{numberOrNull(density) === null ? '—' : format(Number(density) * 3.78541178 * 2.20462262185, 3)}</Result>
        <Field label="Start fuel (t)" value={start} onChange={edit('startFuel')} />
        <Field label="Requested ramp fuel (t)" value={ramp} onChange={edit('rampFuel')} />
        <label className="tool-field"><span>Uplift units</span><select aria-label="Uplift units" value={unit} onChange={(event) => onEdit('volumeUnit', event.target.value)}><option value="litres">Litres</option><option value="gallons">US gallons</option></select></label>
        <Field label="Quantity added" value={volume} onChange={edit('quantity')} />
      </div>
      {Number(densityM3) > 0 && (Number(densityM3) < 719 || Number(densityM3) > 850.7) && <p className="tool-warning">Outside the workbook’s standard density range (719–850.7 kg/m³).</p>}
      {numberOrNull(start) !== null && numberOrNull(ramp) !== null && Number(start) > Number(ramp) && <p className="tool-warning">Start fuel exceeds requested ramp fuel. Check the inputs.</p>}
      <div className="tool-grid">
        <Result label="Expected uplift (t)">{format(requiredKg === null ? null : requiredKg / 1000)}</Result>
        <Result label={`Expected uplift (${unit === 'gallons' ? 'US gal' : 'L'})`}>{format(expectedLitres === null ? null : expectedLitres / (unit === 'gallons' ? 3.78541178 : 1), 0)}</Result>
        <Result label="Actual uplift (kg)">{format(uplift?.addedKg, 0)}</Result>
        <Result label="Difference from ramp (kg)">{format(uplift?.differenceKg, 0)}</Result>
        <Result label="Difference (greater of uplift/total)">{uplift?.percent == null ? '—' : `${format(uplift.percent, 2)}%`}</Result>
      </div>
      {uplift?.percent > 3 && <p className="tool-warning">Fuel difference exceeds 3%, the workbook check threshold.</p>}
      <p className="tool-note">Use measured density. Expected uplift uses this density; 1 US gallon = 3.78541178 L. Density is shared with LM Chit. Blank inputs do not assume a standard density.</p>
    </section>
  </>
}
