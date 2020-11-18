export const helpers = new (class {
  getReferer(req) {
    return this.normalizeParamValue(req.get('Referer') || req.get('Origin') || req.get('Host'))
  }

  normalizeParamValue(value) {
    return this.isSet(value) ? value : null
  }

  isSet(value) {
    return typeof(value) === 'string' && value !== '' && typeof(value) !== 'undefined'
  }
})()
