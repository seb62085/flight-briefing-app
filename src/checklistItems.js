// Preflight items transcribed from the supplied iPad screen recording.
// Oceanic items adapted from CFDS REV 05 MASTER.xlsx, WKSHT M18:M36.
export const preflightColumns = [
  [
    { id: 'exterior', label: 'Exterior inspection' },
    { id: 'deice', label: 'De-ice required / ordered' },
    { id: 'main-deck', label: 'Main deck inspection' },
    { id: 'upper-deck', label: 'Upper deck inspection' },
    { id: 'gen-decs', label: 'GEN DECs' },
    { id: 'permit', label: 'Permit to proceed' },
    { id: 'track-distance', label: 'Track & distance checked' },
    { id: 'fuel-check', label: 'Fuel check (3%)' },
    { id: 'fuel-balanced', label: 'Fuel load balanced' },
  ],
  [
    { id: 'pdc', label: 'PDC' },
    { id: 'tech-log', label: 'Tech log (daily / MELs)' },
    { id: 'mel-ofp', label: 'MELs / DMIs on OFP' },
    { id: 'loadmaster-chit', label: 'Loadmaster chit' },
    { id: 'notoc', label: 'NOTOC / temperature-controlled cargo' },
    { id: 'load-sheet', label: 'Load sheet / software' },
    { id: 'brief-tem', label: 'Briefing / TEM' },
    { id: 'release', label: 'Release received' },
    { id: 'devices', label: 'Devices — flight mode' },
  ],
]
export const oceanicGroups = [
  { id: 'oceanic-preparation', title: 'Oceanic preparation', items: [
    { id: 'plotting', label: 'Plotting on EFB' },
    { id: 'enroute-alternates', label: 'Load iPad — add enroute alternates' },
    { id: 'tmi', label: 'Review TMI' },
    { id: 'alternate-weather', label: 'Weather & NOTAM review (alternates)' },
    { id: 'oceanic-mel', label: 'MEL review — restrictive items' },
    { id: 'contingencies', label: 'Contingency procedures' },
    { id: 'clocks', label: 'Sync clocks to UTC' },
    { id: 'lrcs-before', label: 'LRCS checks (HF)' },
    { id: 'waypoints-ofp', label: 'Verify waypoints — FMS vs OFP' },
  ] },
  { id: 'oceanic-entry', title: 'Before oceanic entry', items: [
    { id: 'winds', label: 'Update winds & alternate weather' },
    { id: 'cpdlc', label: 'CPDLC login' },
    { id: 'clearance', label: 'Obtain NAT clearance / update' },
    { id: 'waypoints-entry', label: 'Verify waypoints' },
    { id: 'rnp', label: 'Verify RNP setting' },
    { id: 'navigation', label: 'Cross-check VOR / IRS / GPS' },
    { id: 'lrcs-entry', label: 'LRCS checks (HF), if required' },
  ] },
  { id: 'oceanic-after-entry', title: 'Oceanic / exit reminders', items: [
    { id: 'mach-slop', label: 'Mach / SLOP / 123.45 & 121.50 reviewed' },
    { id: 'squawk', label: '10 minutes — squawk 2000, when applicable' },
    { id: 'clear-slop', label: 'Clear SLOP / routing / navigation check' },
  ] },
]

export function checklistProgress(items, values) {
  return {
    total: items.length,
    reviewed: items.filter((item) => values[item.id] === 'done').length,
  }
}
