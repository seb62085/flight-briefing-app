import { createStore, get, set, update } from 'idb-keyval'

const store = createStore('flight-briefing', 'saved-flights')
const key = 'last-flight'

export function loadLastFlight() {
  return get(key, store)
}

export function saveLastFlight(flight) {
  return set(key, { ...flight, version: 1 }, store)
}

export function saveFlightEdits(flightId, edits) {
  return update(key, (flight) => {
    if (!flight || flight.id !== flightId) return flight
    return { ...flight, ...edits }
  }, store)
}
