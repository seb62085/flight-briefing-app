import test from 'node:test'
import assert from 'node:assert/strict'
import { absoluteMaxFuel, dutyTimes, displayUtc, fuelDistribution, upliftCalculation, parseMelItems, melExpiry } from '../src/briefingCalculations.js'

test('max fuel preserves both workbook rounding stages and 164 t cap', () => {
  assert.equal(absoluteMaxFuel(80350, 250250, 295.7), 126)
  assert.equal(absoluteMaxFuel(80000, 250000, 295.7), 127)
  assert.equal(absoluteMaxFuel(150000, 250000, 295.7), 164)
  assert.equal(absoluteMaxFuel('', 250000, 295.7), null)
  assert.equal(absoluteMaxFuel('Not found', 250000, 295.7), null)
})

test('duty rules cover all crew counts and retain midnight/day offsets', () => {
  for (const [rules,limits] of [['domestic',[16,18,20]],['international',[16,30,30]]]) {
    limits.forEach((limit,i) => assert.equal(dutyTimes('22:00',i+2,rules,'12:30').limit,limit))
  }
  const duty = dutyTimes('22:00',4,'international','12:30')
  assert.equal(displayUtc(duty.off),'04:00Z (+2 days)')
  assert.equal(displayUtc(duty.out),'14:40Z (+1 day)')
  assert.equal(displayUtc(dutyTimes('00:00',2,'domestic','18:00').out),'21:10Z (-1 day)')
  assert.equal(dutyTimes('24:00',2,'domestic','12:30'),null)
  assert.equal(dutyTimes('22:00','', 'domestic','12:30'),null)
  assert.equal(dutyTimes('22:00',2,'domestic','Not found').out,null)
  assert.equal(dutyTimes('22:00',2,'domestic','12:30','30').off,2310)
})

test('fuel table uses nearest 500 kg and rejects values outside workbook coverage', () => {
  assert.deepEqual(fuelDistribution(20000),[20000,0,5000,5000,0,5000,5000,0])
  assert.equal(fuelDistribution(20250)[0],20500)
  assert.deepEqual(fuelDistribution(163000),[163000,4018,13287,38128,52134,38128,13287,4018])
  assert.equal(fuelDistribution(164000),null)
  assert.equal(fuelDistribution(19999),null)
  assert.equal(fuelDistribution(''),null)
})

test('uplift honours measured density, gallons conversion, and discrepancy basis', () => {
  const litres = upliftCalculation('20','100','100000','litres','800')
  assert.equal(litres.addedKg,80000)
  assert.equal(litres.differenceKg,0)
  const gallons = upliftCalculation('20','100',100000 / 3.78541178,'gallons','800')
  assert.ok(Math.abs(gallons.differenceKg) < 1e-7)
  const diff = upliftCalculation('20','100','90000','litres','800')
  assert.equal(diff.differenceKg,-8000)
  assert.ok(Math.abs(diff.percent - 8000 / 72000 * 100) < 1e-7)
  assert.equal(upliftCalculation('20','100','100000','litres',''),null)
  assert.equal(upliftCalculation('110','100','100000','litres','800'),null)
})

test('MEL descriptions retain boundaries and expiry covers UTC dates and invalid dates', () => {
  const items=parseMelItems('M12345678 / EXPIRES DD-MM-YY 13-10-26 / DMI# 111 PACK INOP M87654321 / EXPIRES DD-MM-YY 15-10-26 / DMI# 111 LIGHT INOP NATIONAL AIRLINES next page')
  assert.equal(items.length,2)
  assert.equal(items[0].melNumber,'MEL 12-34-56-78')
  assert.equal(items[0].note,'PACK INOP')
  assert.equal(items[1].note,'LIGHT INOP')
  assert.equal(melExpiry('13-10-26','2026-10-13').label,'Due today')
  assert.equal(melExpiry('15-10-26','2026-10-13').className,'mel-soon')
  assert.equal(melExpiry('12-10-26','2026-10-13').className,'mel-expired')
  assert.equal(melExpiry('31-02-26','2026-10-13').label,'Check date')
})
