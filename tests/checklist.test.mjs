import test from 'node:test'
import assert from 'node:assert/strict'
import { preflightColumns, oceanicGroups, checklistProgress } from '../src/checklistItems.js'

test('Legacy N/A and removed departure marks do not count; oceanic checks enter the total separately', () => {
  const items = preflightColumns.flat()
  const state = { exterior: 'na', deice: 'na', 'main-deck': 'done', plotting: 'done', crosswind: 'done' }
  assert.deepEqual(checklistProgress(items,state),{ total:18, reviewed:1 })
  const base = items
  const oceanic = oceanicGroups.flatMap((group)=>group.items)
  assert.deepEqual(checklistProgress(base,state),{ total:18, reviewed:1 })
  assert.deepEqual(checklistProgress([...base,...oceanic],state),{ total:37, reviewed:2 })
})

test('checklist IDs are distinct so each task retains its own saved status', () => {
  const all = [...preflightColumns.flat(),...oceanicGroups.flatMap((group)=>group.items)]
  assert.equal(new Set(all.map((item)=>item.id)).size,all.length)
  const completed=Object.fromEntries(all.map((item)=>[item.id,'done']))
  assert.deepEqual(checklistProgress(all,completed),{ total:37, reviewed:37 })
})
