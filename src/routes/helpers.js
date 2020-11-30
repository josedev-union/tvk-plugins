import {envShared} from '../shared/envShared'
import {Uri} from '../models/tools/Uri'

export const helpers = new (class {
  getReferer(req) {
    return this.normalizeParamValue(req.get('Referer') || req.get('Origin') || req.get('Host'))
  }

  getSignature(req) {
    const signatureHeader = this.normalizeParamValue(req.get(envShared.signatureHeaderName))
    if (!signatureHeader) return null
    const match = signatureHeader.match(/^Bearer\s+(.*)\s*$/)
    if (!match) return null;
    else return match[1]
  }

  setCors(req, res) {
    const referer = req.get('Referer') || req.get('Origin') || req.get('Host')
    res.set({
      "Access-Control-Allow-Origin": new Uri(referer).toString({path: false}),
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": envShared.signatureHeaderName,
    })
  }

  normalizeParamValue(value) {
    return this.isSet(value) ? value : null
  }

  isSet(value) {
    return typeof(value) === 'string' && value !== '' && typeof(value) !== 'undefined'
  }
})()
