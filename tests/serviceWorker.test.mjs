import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const template = await readFile(new URL('../public/sw-template.js',import.meta.url),'utf8')
function worker(cached) {
  const handlers = {}
  const matches = []
  const requests = []
  let installation
  const context = {
    CACHE_NAME:'flight-briefing-test', APP_SHELL_URL:'/flight-briefing-app/offline-shell-test.html',
    PRECACHE_URLS:['https://example.com/flight-briefing-app/offline-shell-test.html'], Request, URL,
    self:{location:{origin:'https://example.com'},registration:{scope:'https://example.com/flight-briefing-app/'},addEventListener:(type,callback)=>{handlers[type]=callback}},
    caches:{open:async()=>({match:async(request,options)=>{matches.push([request,options]);return cached},addAll:async(items)=>{installation=items}})},
    fetch:async(request)=>{requests.push(request);return 'network'},
  }
  vm.runInNewContext(template,context)
  return { handlers,matches,requests,get installation(){return installation} }
}
async function fetchEvent(w, request) {
  let response
  w.handlers.fetch({request,respondWith:(promise)=>{response=promise}})
  return response
}
const navigation = {method:'GET',mode:'navigate',url:'https://example.com/flight-briefing-app/'}

test('navigation uses the release-specific shell and falls back to the network if cache data is missing', async()=>{
  const cached=worker('cached shell')
  assert.equal(await fetchEvent(cached,navigation),'cached shell')
  assert.equal(cached.matches[0][0],'/flight-briefing-app/offline-shell-test.html')
  const empty=worker(undefined)
  assert.equal(await fetchEvent(empty,navigation),'network')
  assert.equal(empty.requests.length,1)
})
test('static cached assets work across Origin header variations, and unrelated requests are not intercepted',async()=>{
  const w=worker('cached asset')
  const request={method:'GET',mode:'cors',url:'https://example.com/flight-briefing-app/assets/app.js'}
  assert.equal(await fetchEvent(w,request),'cached asset')
  assert.equal(w.matches[0][1].ignoreVary,true)
  assert.equal(w.requests.length,0)
  assert.equal(await fetchEvent(w,{...request,url:'https://other.example/app.js'}),undefined)
  assert.equal(await fetchEvent(w,{...request,url:'https://example.com/other-app/app.js'}),undefined)
  assert.equal(await fetchEvent(w,{...request,method:'POST'}),undefined)
})
test('installation refreshes HTTP-cached resources rather than reusing stale deployment files',async()=>{
  const w=worker(undefined)
  let completion
  w.handlers.install({waitUntil:(promise)=>{completion=promise}})
  await completion
  assert.equal(w.installation[0].cache,'reload')
})
