if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers() {
    let resolve
    let reject

    const promise = new Promise((promiseResolve, promiseReject) => {
      resolve = promiseResolve
      reject = promiseReject
    })

    return { promise, resolve, reject }
  }
}

if (typeof Array.prototype.at !== 'function') {
  Array.prototype.at = function at(index) {
    const length = this.length
    const relativeIndex = Number(index)
    const resolvedIndex = relativeIndex >= 0 ? relativeIndex : length + relativeIndex

    if (resolvedIndex < 0 || resolvedIndex >= length) {
      return undefined
    }

    return this[resolvedIndex]
  }
}

const typedArrays = [
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
]

if (typeof BigInt64Array !== 'undefined') {
  typedArrays.push(BigInt64Array)
}

if (typeof BigUint64Array !== 'undefined') {
  typedArrays.push(BigUint64Array)
}

typedArrays.forEach((TypedArray) => {
  if (typeof TypedArray.prototype.at !== 'function') {
    TypedArray.prototype.at = Array.prototype.at
  }
})
