import fs from 'fs'
import {promisify} from "util"
import formidable from 'formidable'
import {helpers} from '../routes/helpers'
import {cors} from './cors'
import {timeout} from "./timeout"
import {rateLimit} from "./rateLimit"

import {envShared} from "../shared/envShared"
import {simpleCrypto} from "../shared/simpleCrypto"

import {timeInSeconds} from "../utils/time"
const {SECONDS, MINUTES, HOURS, DAYS} = timeInSeconds

const readfile = promisify(fs.readFile)

const DEFAULT_RATE_LIMIT_MAX_SUCCESSES_PER_SECOND = 1.0

export const quickApi = new (class {
  async enforceCors(req, res, next) {
    const {dentApiId: apiId, dentClient: client} = res.locals
    const hosts = client.apiAllowedHosts({api: apiId})
    const enforce = cors.enforceCors({
      hosts: hosts,
      methods: ['POST'],
      headers: [envShared.signatureHeaderName]
    })
    return await enforce(req, res, next)
  }

  async rateLimit(req, res, next) {
    const {dentApiId: apiId, dentClient: client} = res.locals
    const maxSuccessesPerSec = client.apiMaxSuccessesPerSecond({api: apiId}) || DEFAULT_RATE_LIMIT_MAX_SUCCESSES_PER_SECOND
    const ipMaxRequestsPerMinute = 30
    const ipMaxSuccessesPerHour = 20
    const ipMaxSuccessesPerDay = 50

    const ipLimitRequestsPerMinute = rateLimit({
      limit: ipMaxRequestsPerMinute,
      expiresIn: 1.0 * MINUTES,
      lookup: (req, _) => `rlimit:ip:${apiId}:${req.ip}:request-min`,
      onBlocked: function(req, res, next) {
        throw 'Exceeded IP requests per minute rate limit'
      }
    })
    const clientLimitRequestsPerSecond = rateLimit({
      limit: maxSuccessesPerSec * 60 * 2.5 * 3,
      expiresIn: 1.0 * SECONDS,
      lookup: (req, _) => `rlimit:client:${apiId}:${client.id}:request-sec`,
      onBlocked: function(req, res, next) {
        throw 'Exceeded client requests per second client rate limit'
      }
    })

    const clientLimitSuccessesPerSecond = rateLimit({
      limit: maxSuccessesPerSec * 2.5,
      expiresIn: 1.0 * SECONDS,
      lookup: (req, _) => `rlimit:client:${apiId}:${client.id}:success-sec`,
      countIf: (_, res) => res.statusCode >= 200 && res.statusCode <= 299,
      onBlocked: function(req, res, next) {
        throw 'Exceeded client successes per second rate limit'
      }
    })
    const clientLimitSuccessesPerMinute = rateLimit({
      limit: maxSuccessesPerSec * 60,
      expiresIn: 1.0 * MINUTES,
      lookup: (req, _) => `rlimit:client:${apiId}:${client.id}:success-min`,
      countIf: (_, res) => res.statusCode >= 200 && res.statusCode <= 299,
      onBlocked: function(req, res, next) {
        throw 'Exceeded client successes per minute rate limit'
      }
    })
    const clientLimitSuccessesPerHour = rateLimit({
      limit: maxSuccessesPerSec * 60 * 60 * 0.5,
      expiresIn: 1.0 * HOURS,
      lookup: (req, _) => `rlimit:client:${apiId}:${client.id}:success-hour`,
      countIf: (_, res) => res.statusCode >= 200 && res.statusCode <= 299,
      onBlocked: function(req, res, next) {
        throw 'Exceeded client successes per hour rate limit'
      }
    })
    const ipLimitSuccessesPerHour = rateLimit({
      limit: ipMaxSuccessesPerHour,
      expiresIn: 1.0 * HOURS,
      lookup: (req, _) => `rlimit:ip:${apiId}:${req.ip}:success-hour`,
      countIf: (_, res) => res.statusCode >= 200 && res.statusCode <= 299,
      onBlocked: function(req, res, next) {
        throw 'Exceeded IP requests per hour rate limit'
      }
    })
    const ipLimitSuccessesPerDay = rateLimit({
      limit: ipMaxSuccessesPerDay,
      expiresIn: 1.0 * DAYS,
      lookup: (req, _) => `rlimit:ip:${apiId}:${req.ip}:success-day`,
      countIf: (_, res) => res.statusCode >= 200 && res.statusCode <= 299,
      onBlocked: function(req, res, next) {
        throw 'Exceeded IP successes per day rate limit'
      }
    })

    const allRateLimits = [
      // Limiting any requests
      ipLimitRequestsPerMinute,
      clientLimitRequestsPerSecond,

      // Limiting ip successes
      ipLimitSuccessesPerHour,
      ipLimitSuccessesPerDay,

      // Limiting client successes
      clientLimitSuccessesPerSecond,
      clientLimitSuccessesPerMinute,
      clientLimitSuccessesPerHour,
    ]

    const joinedNexts = allRateLimits.reverse().reduce((prevNext, limit) => {
      return async () => {
        return await limit(req, res, prevNext)
      }
    }, next)

    return await joinedNexts()
  }

  async parseRequestBody(req, res, next) {
    return await helpers.redirectCatch(next, async () => {
      const form = formidable({
        multiples: true,
        maxFileSize: envShared.maxUploadSizeBytes,
        maxFieldsSize: 1*1024*1024,
        allowEmptyFiles: false
      })
      const timeoutManager = timeout.getManager(res)
      if (timeoutManager) timeoutManager.onTimeout(() => form.pause())
      const {files, fields} = await helpers.parseFormPromise(form, req)
      await new Promise((resolve) => setTimeout(resolve, 10000.0) )
      const {data: dataJson} = fields
      const data = quickApi.#parseJson(dataJson)
      if (!data) {
        console.warn(`Bad data json format - ${dataJson}`)
        return helpers.respondError(res, 422, "Unprocessable Entity")
      }
      const images = {}
      for (let fileKey in files) {
        if (fileKey.startsWith('img')) {
          images[fileKey] = {
            ...files[fileKey],
            content: await readfile(files[fileKey].path),
          }
        }
      }
      res.locals.dentParsedBody = {
        data: data,
        dataJson: dataJson,
        images: images,
      }
      return next()
    })
  }

  async dataToSimulationOptions(req, res, next) {
    const SYNTH_VALUES = ['transform', 'interpolate']
    const MODE_VALUES = ['cosmetic', 'ortho']
    const BLEND_VALUES = ['poisson', 'replace']

    return await helpers.redirectCatch(next, async () => {
      const originalData = res.locals.dentParsedBody.data
      let data = {}
      data['synth'] = quickApi.#normalizeValue(originalData['synth'] || SYNTH_VALUES[0])
      data['mix_factor'] = quickApi.#normalizeValue(originalData['mix_factor'])
      data['mode'] = quickApi.#normalizeValue(originalData['mode'] || MODE_VALUES[0])
      data['blend'] = quickApi.#normalizeValue(originalData['blend'] || BLEND_VALUES[0])
      data['brightness'] = quickApi.#normalizeValue(originalData['brightness'] || '0.0')
      data['whiten'] = quickApi.#normalizeValue(originalData['whiten'] || '0.0')

      if (data['synth'] === 'interpolate') {
        if (!data['mix_factor']) {
          return quickApi.#validationError(res, "'mix_factor' is mandatory on 'interpolate' synth")
        }
      } else {
        delete data['mix_factor']
      }

      const {error: synthError} = quickApi.#validateValues(res, data, 'synth', SYNTH_VALUES)
      if (synthError) return synthError

      const {error: modeError} = quickApi.#validateValues(res, data, 'mode', MODE_VALUES)
      if (modeError) return modeError

      const {error: blendError} = quickApi.#validateValues(res, data, 'blend', BLEND_VALUES)
      if (blendError) return blendError

      const {value: whitenVal, error: whitenError} = quickApi.#validateFloat(res, data, 'whiten', 0.0, 1.0)
      if (whitenError) return whitenError
      data['whiten'] = whitenVal

      const {value: brightnessVal, error: brightnessError} = quickApi.#validateFloat(res, data, 'brightness', -1.0, 1.0)
      if (brightnessError) return brightnessError
      data['brightness'] = brightnessVal + 1.0

      if (data['mix_factor']) {
        const {value: mixFactorVal, error: mixFactorError} = quickApi.#validateFloat(res, data, 'mix_factor', 0.0, 1.0)
        if (mixFactorError) return mixFactorError
        data['mix_factor'] = mixFactorVal
      }

      res.locals.dentSimulationOptions = quickApi.#normalizedDataToSimulationOptions(data)
      return next()
    })
  }

  #normalizedDataToSimulationOptions(data) {
    let options = {
      'whiten': data['whiten'],
      'brightness': data['brightness'],
    }
    options['ortho'] = data['mode'] === 'ortho'
    options['poisson'] = data['blend'] === 'poisson'
    if (data['synth'] === 'interpolate') {
      options['mix_factor'] = data['mix_factor']
    }
    return options
  }

  #validateFloat(res, data, key, min, max) {
    const FLOAT_REGEXP = /^-?[0-9]+(\.[0-9]+)?$/
    const val = data[key]
    if (val.match(FLOAT_REGEXP)) {
      const fval = parseFloat(val)
      if ((fval-min) >= -0.0001 && (max-fval) >= -0.0001) {
        return {value: fval}
      }
    }

    return {error: quickApi.#validationError(res, `'${val}' is not valid value for '${key}' option`)}
  }

  #validateValues(res, data, key, values) {
    const val = data[key]
    if (!values.includes(val)) {
      return {error: quickApi.#validationError(res, `'${val}' is not valid value for '${key}' option`)}
    }
    return {success: true}
  }

  #validationError(res, msg) {
    return helpers.respondError(res, 422, msg)
  }

  #normalizeValue(val) {
    if (typeof(val) === 'undefined' || val === null) return null
    return val.toString().trim().toLowerCase()
  }

  async parseAuthToken(req, res, next) {
    return await helpers.redirectCatch(next, async () => {
      const token = quickApi.#getToken(req)
      if (!token) {
        console.warn("Unauthorized: Didn't received token")
        return helpers.respondError(res, 403, "Not Authorized")
      }
      const parts = token.split(':')
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        console.warn(`Unauthorized: Token invalid "${token}"`)
        return helpers.respondError(res, 403, "Not Authorized")
      }

      const b64Claims = parts[0]
      const signature = parts[1]

      const claimsJson = simpleCrypto.base64Decode(b64Claims)
      if (!claimsJson) return null;

      const claims = quickApi.#parseJson(claimsJson)
      if (!claims) {
        console.warn(`Unauthorized: claims is not a valid json - ${claimsJson}`)
        return helpers.respondError(res, 403, "Not Authorized")
      }
      if (!claims['client_id']) {
        console.warn(`Unauthorized: Missing 'client_id' on claims - "${token}" - ${claimsJson}`)
        return helpers.respondError(res, 403, "Not Authorized")
      }

      res.locals.dentClientId = claims['client_id']
      res.locals.dentParsedToken = {
        claimsJson: claimsJson,
        claims: claims,
        signature: signature,
      }
      return next()
    })
  }

  #parseJson(str) {
    try {
      return JSON.parse(str)
    } catch {
      return null;
    }
  }

  async validateAuthToken(req, res, next) {
    return await helpers.redirectCatch(next, async () => {
      const client = res.locals.dentClient
      const {claimsJson, signature} = res.locals.dentParsedToken
      const isValid = simpleCrypto.verifySignatureHmac(signature, claimsJson, client.secret)
      if (!isValid) {
        console.warn(`Unauthorized: Signature is invalid - "${signature}" - ${claimsJson}`)
        return helpers.respondError(res, 403, "Not Authorized")
      }

      return next()
    })
  }


  async validateBodyData(req, res, next) {
    return await helpers.redirectCatch(next, async () => {
      const {claims} = res.locals.dentParsedToken
      const {dataJson: bodyDataJson, images} = res.locals.dentParsedBody

      const paramsSigned = claims['request_params_signed']
      const signaturesKeys = Object.keys(paramsSigned)
      const keys = Array.prototype.concat(Object.keys(images), ['data'])
      if (!quickApi.#hasSameValues(signaturesKeys, keys)) {
        console.warn(`Unauthorized: Request data does not match token claims - ${keys} - ${signaturesKeys}`)
        return helpers.respondError(res, 403, "Not Authorized")
      }

      const keysLength = keys.length
      for (let i = 0; i < keysLength; i++) {
        const key = keys[i]
        const val = (key === 'data' ? bodyDataJson : images[key].content)
        const signature = paramsSigned[key]
        const verificationSignature = simpleCrypto.md5(val)
        if (signature !== verificationSignature) {
          console.warn(`Unauthorized: Request "${key}" md5 does not match claims - ${signature} != ${verificationSignature}`)
          return helpers.respondError(res, 403, "Not Authorized")
        }
      }

      return next()
    })
  }

  #hasSameValues(a, b) {
    const len = a.length
    if (len !== b.length) return false;
    a = Array.prototype.concat(a)
    b = Array.prototype.concat(b)
    a.sort()
    b.sort()
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  #getToken(req) {
    const signatureHeader = helpers.normalizeParamValue(req.get(envShared.signatureHeaderName))
    if (!signatureHeader) return null

    const match = signatureHeader.match(/^Bearer\s+(.*)\s*$/)
    if (!match) return null;
    return match[1]
  }
})()
