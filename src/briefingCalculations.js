import data from './workbookData.json' with { type: 'json' }

export function numberOrNull(value) {
  if (value == null || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function absoluteMaxFuel(burnKg, zfwKg, landingTonnes) {
  const burn = numberOrNull(burnKg)
  const zfw = numberOrNull(zfwKg)
  const landing = numberOrNull(landingTonnes)
  if (burn === null || zfw === null || !landing) return null
  // FP LOADER J39, then WKSHT J2. Preserve the workbook's rounding order.
  const intermediate = Math.floor((landing + Math.floor(burn / 1000) - zfw / 1000 - 0.1) * 10 + 1e-8) / 10
  const result = Math.min(Math.floor(intermediate + 1.5 + 1e-8), 164)
  return result >= 0 ? result : null
}

export function timeMinutes(value, duration = false) {
  const match = String(value ?? '').match(duration ? /^(\d{1,3}):?([0-5]\d)$/ : /^([01]\d|2[0-3]):?([0-5]\d)Z?$/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

export function displayUtc(minutes) {
  if (!Number.isFinite(minutes)) return '—'
  const day = Math.floor(minutes / 1440)
  const clock = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}Z${day ? ` (${day > 0 ? '+' : ''}${day} day${Math.abs(day) === 1 ? '' : 's'})` : ''}`
}

export function dutyTimes(dutyOn, pilots, rules, flightTime, loadingMinutes = '0') {
  const on = timeMinutes(dutyOn)
  const flight = timeMinutes(flightTime, true)
  const load = numberOrNull(loadingMinutes)
  const limit = ({ domestic: { 2: 16, 3: 18, 4: 20 }, international: { 2: 16, 3: 30, 4: 30 } })[rules]?.[pilots]
  if (on === null || !limit || load === null) return null
  const off = on + limit * 60 + load
  return { limit, off, out: flight === null ? null : off - flight - 50 }
}

export function fuelDistribution(totalKg) {
  const total = numberOrNull(totalKg)
  if (total === null || total < 20000 || total > 163000) return null
  const rounded = Math.round(total / 500) * 500
  return data.fuelDistribution.find((row) => row[0] === rounded) ?? null
}

export function upliftCalculation(startTonnes, rampTonnes, quantity, unit, densityKgM3) {
  const start = numberOrNull(startTonnes)
  const ramp = numberOrNull(rampTonnes)
  const volume = numberOrNull(quantity)
  const density = numberOrNull(densityKgM3)
  if (start === null || ramp === null || volume === null || !density || ramp < start) return null
  const litres = unit === 'gallons' ? volume * 3.78541178 : volume
  const addedKg = litres * density / 1000
  const differenceKg = start * 1000 + addedKg - ramp * 1000
  const totalPercent = ramp > 0 ? Math.abs(differenceKg) / (ramp * 1000) * 100 : null
  const upliftPercent = addedKg > 0 ? Math.abs(differenceKg) / addedKg * 100 : null
  return { addedKg, differenceKg, percent: totalPercent === null || upliftPercent === null ? null : Math.max(totalPercent, upliftPercent) }
}

export function parseMelItems(text) {
  // Match items directly: PDF headers and section separators vary between releases.
  return [...text.matchAll(/\b(M\d{8})\s*\/\s*EXPIRES\s+DD-MM-YY\s+(\d{2}-\d{2}-\d{2})\s*\/\s*DMI\s*#\s*(\d+)\s+(.*?)(?=\s+M\d{8}\s*\/\s*EXPIRES|\s+NATIONAL\s+AIRLINES|$)/gi)].map((match) => ({
    melNumber: `MEL ${match[1].slice(1).match(/.{2}/g).join('-')}`,
    expiryDate: match[2], dmiNumber: match[3], note: match[4].trim(),
  }))
}

export function flightDateIso(raw) {
  const match = String(raw).match(/^(\d{2})([A-Z]{3})(\d{2})$/)
  const month = match && ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(match[2])
  if (!match || month < 0) return ''
  return `20${match[3]}-${String(month + 1).padStart(2, '0')}-${match[1]}`
}

export function melExpiry(expiry, reference) {
  const match = expiry.match(/^(\d{2})-(\d{2})-(\d{2})$/)
  if (!match || !reference) return { label: 'Check date', className: '' }
  const iso = `20${match[3]}-${match[2]}-${match[1]}`
  const parsed = new Date(`${iso}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== iso) return { label: 'Check date', className: '' }
  const days = (parsed - new Date(`${reference}T00:00:00Z`)) / 86400000
  if (days < 0) return { label: 'Expired', className: 'mel-expired' }
  if (days === 0) return { label: 'Due today', className: 'mel-today' }
  if (days <= 2) return { label: `Due in ${days} day${days === 1 ? '' : 's'}`, className: 'mel-soon' }
  return { label: 'In date', className: '' }
}
