import formidable from 'formidable'

import {envShared} from '../shared/envShared'
import {simpleCrypto} from '../shared/simpleCrypto'

export const helpers = new (class {
  getReferer(req) {
    return this.normalizeParamValue(req.get('Referer') || req.get('Origin') || req.get('Host'))
  }

  getSignature(req) {
    const signatureHeader = this.normalizeParamValue(req.get(envShared.signatureHeaderName))
    if (!signatureHeader) return null

    const match = signatureHeader.match(/^Bearer\s+(.*)\s*$/)
    if (!match) return null;

    const decoded = simpleCrypto.base64Decode(match[1])
    if (!decoded) return null;

    return decoded;
  }

  respondError(res, status, message) {
    return res.status(status).json({error: message})
  }

  setCors(res, {hosts, methods, headers}) {
    if (Array.isArray(hosts)) hosts = hosts.join(', ')
    if (Array.isArray(methods)) methods = methods.join(', ')
    if (Array.isArray(headers)) headers = headers.join(', ')
    res.set({
      "Access-Control-Allow-Origin": hosts,
      "Access-Control-Allow-Methods": methods,
      "Access-Control-Allow-Headers": headers,
    })
  }

  normalizeParamValue(value) {
    return this.isSet(value) ? value : null
  }

  isSet(value) {
    return typeof(value) === 'string' && value !== '' && typeof(value) !== 'undefined'
  }

  async parseForm(form, req) {
    return new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve({fields, files})
      })
    })
  }

  toDataUrl(binary, mime) {
    return `data:${mime};base64,${simpleCrypto.base64(binary)}`
  }
})()
