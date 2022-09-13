import formidable from 'formidable'

import {Uri} from '../models/tools/Uri'
import {envShared} from '../shared/envShared'
import {simpleCrypto} from '../shared/simpleCrypto'

export const helpers = new (class {
  getOrigin(req) {
    return this.normalizeParamValue(req.get('Origin') || req.get('Referer'))
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

  respondError(res, status, data) {
    return res.status(status).json({error: data})
  }

  setAllowingCors(req, res) {
    const normalizedHost = helpers.normalizedOriginForCors(req)
    if (!normalizedHost) return
    const allowedHeaders = ['authorization'].filter((h) => req.headers[h])
    allowedHeaders.push('*')
    return helpers.setCors(res, {
      hosts: normalizedHost,
      methods: req.method,
      headers: allowedHeaders,
    })
  }

  normalizedOriginForCors(req) {
    const host = helpers.getOrigin(req)
    if (!host) return undefined
    return helpers.normalizeOrigin(host, req.protocol)
  }

  normalizeOrigin(host, defaultProtocol) {
    if (!host) return
    const uri = new Uri(host)
    if (!uri.protocol) uri.protocol = defaultProtocol
    return uri.toString({path: false})
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
