import test from 'node:test'
import assert from 'node:assert/strict'
import { preflightColumns, departureItems, oceanicGroups, checklistProgress } from '../src/checklistItems.js'

test('N/A counts only for conditional checks, and oceanic checks enter the active total separately', () => {
  const items = preflightColumns.flat()
  const state = { exterior: 'na', deice: 'na', 'main-deck': 'done', plotting: 'done' }
  assert.deepEqual(checklistProgress(items,state),{ total:18, reviewed:2 })
  const base = [...items,...departureItems]
  const oceanic = oceanicGroups.flatMap((group)=>group.items)
  assert.deepEqual(checklistProgress(base,state),{ total:22, reviewed:2 })
  assert.deepEqual(checklistProgress([...base,...oceanic],state),{ total:41, reviewed:3 })
})

test('checklist IDs are distinct so each task retains its own saved status', () => {
  const all = [...preflightColumns.flat(),...departureItems,...oceanicGroups.flatMap((group)=>group.items)]
  assert.equal(new Set(all.map((item)=>item.id)).size,all.length)
  const completed=Object.fromEntries(all.map((item)=>[item.id,item.optional ? 'na' : 'done']))
  assert.deepEqual(checklistProgress(all,completed),{ total:41, reviewed:41 })
})
