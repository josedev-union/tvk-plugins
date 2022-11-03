const FLOAT_REGEXP = /^-?[0-9]+(\.[0-9]+)?$/

export const normalizer = new (class {
  toChoicesString(val) {
    if (typeof(val) === 'undefined' || val === null) return null
    return val.toString().trim().toLowerCase()
  }

  toFloat(val) {
    if (typeof(val) === 'undefined' || val === null) return null
    if (typeof(val) === 'number') return val
    val = val.toString()
    if (val.match(FLOAT_REGEXP)) {
      return parseFloat(val)
    }
    return val
  }
})()
