import fs from 'fs'
import {promisify} from "util"
import formidable from 'formidable'
import FileType from 'file-type'
import axios from 'axios'

import {cors} from './cors'
import {api} from './api'
import {timeout} from "./timeout"
import {rateLimit} from "./rateLimit"

import {env} from "../config/env"
import {simpleCrypto} from "../shared/simpleCrypto"
import {RichError} from "../utils/RichError"
import {logger} from '../instrumentation/logger'

import {helpers} from '../routes/helpers'
import {asyncMiddleware, invokeMiddleware, invokeMiddlewares} from './expressAsync'

import {timeInSeconds} from "../utils/time"
const {SECONDS, MINUTES, HOURS, DAYS} = timeInSeconds

import {BufferWritable} from "../utils/BufferWritable"

const readfile = promisify(fs.readFile)

const DEFAULT_RATE_LIMIT_MAX_SUCCESSES_PER_SECOND = 1.0
const SIGNATURE_HEADER = 'Authorization'

export const quickApi = new (class {
  get enforceCors() {
    return asyncMiddleware('quickApi.enforceCors', async (req, res, next) => {
      const {dentApiId: apiId, dentClient: client} = res.locals
      const hosts = client.apiAllowedHosts({api: apiId})
      const enforce = cors.enforceCors({
        hosts: hosts,
        methods: ['POST'],
        headers: [SIGNATURE_HEADER]
      })
      return await invokeMiddleware(enforce, req, res)
    })
  }

  get rateLimit() {
    return asyncMiddleware('quickApi.rateLimit', async (req, res, next) => {
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
          throw quickApi.#newRateLimitError({
            message: 'Exceeded IP requests per minute rate limit',
            tags: {'error:rate-limit': 'ip-requests-per-minute'},
          })
        }
      })
      const clientLimitRequestsPerSecond = rateLimit({
        limit: maxSuccessesPerSec * 60 * 2.5 * 3,
        expiresIn: 1.0 * SECONDS,
        lookup: (req, _) => `rlimit:client:${apiId}:${client.id}:request-sec`,
        onBlocked: function(req, res, next) {
          throw quickApi.#newRateLimitError({
            message: 'Exceeded client requests per second client rate limit',
            tags: {'error:rate-limit': 'client-requests-per-second'},
          })
        }
      })

      const clientLimitSuccessesPerSecond = rateLimit({
        limit: maxSuccessesPerSec * 2.5,
        expiresIn: 1.0 * SECONDS,
        lookup: (req, _) => `rlimit:client:${apiId}:${client.id}:success-sec`,
        countIf: (_, res) => res.statusCode >= 200 && res.statusCode <= 299,
        onBlocked: function(req, res, next) {
          throw quickApi.#newRateLimitError({
            message: 'Exceeded client successes per second rate limit',
            tags: {'error:rate-limit': 'client-successes-per-second'},
          })
        }
      })
      const clientLimitSuccessesPerMinute = rateLimit({
        limit: maxSuccessesPerSec * 60,
        expiresIn: 1.0 * MINUTES,
        lookup: (req, _) => `rlimit:client:${apiId}:${client.id}:success-min`,
        countIf: (_, res) => res.statusCode >= 200 && res.statusCode <= 299,
        onBlocked: function(req, res, next) {
          throw quickApi.#newRateLimitError({
            message: 'Exceeded client successes per minute rate limit',
            tags: {'error:rate-limit': 'client-successes-per-minute'},
          })
        }
      })
      const clientLimitSuccessesPerHour = rateLimit({
        limit: maxSuccessesPerSec * 60 * 60 * 0.5,
        expiresIn: 1.0 * HOURS,
        lookup: (req, _) => `rlimit:client:${apiId}:${client.id}:success-hour`,
        countIf: (_, res) => res.statusCode >= 200 && res.statusCode <= 299,
        onBlocked: function(req, res, next) {
          throw quickApi.#newRateLimitError({
            message: 'Exceeded client successes per hour rate limit',
            tags: {'error:rate-limit': 'client-successes-per-hour'},
          })
        }
      })
      const ipLimitSuccessesPerHour = rateLimit({
        limit: ipMaxSuccessesPerHour,
        expiresIn: 1.0 * HOURS,
        lookup: (req, _) => `rlimit:ip:${apiId}:${req.ip}:success-hour`,
        countIf: (_, res) => res.statusCode >= 200 && res.statusCode <= 299,
        onBlocked: function(req, res, next) {
          throw quickApi.#newRateLimitError({
            message: 'Exceeded IP requests per hour rate limit',
            tags: {'error:rate-limit': 'ip-requests-per-hour'},
          })
        }
      })
      const ipLimitSuccessesPerDay = rateLimit({
        limit: ipMaxSuccessesPerDay,
        expiresIn: 1.0 * DAYS,
        lookup: (req, _) => `rlimit:ip:${apiId}:${req.ip}:success-day`,
        countIf: (_, res) => res.statusCode >= 200 && res.statusCode <= 299,
        onBlocked: function(req, res, next) {
          throw quickApi.#newRateLimitError({
            message: 'Exceeded IP successes per day rate limit',
            tags: {'error:rate-limit': 'ip-successes-per-day'},
          })
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

      return await invokeMiddlewares(allRateLimits, req, res)
    })
  }

  get parseRequestBody() {
    return asyncMiddleware('quickApi.parseRequestBody', async (req, res, next) => {
      const form = formidable({
        multiples: true,
        maxFileSize: env.quickApiMaxUploadSizeBytes,
        maxFieldsSize: 1*1024*1024,
        allowEmptyFiles: false,
        fileWriteStreamHandler: (file) => {
          const writable = new BufferWritable()
          writable.on('finish', () => {
            file.content = writable.content
          })
          return writable
        }
      })
      const timeoutManager = timeout.getManager(res)
      if (timeoutManager) timeoutManager.onTimeout(() => form.pause())
      const {files, fields} = await helpers.parseForm(form, req)
      const {data: dataJson} = fields
      const data = quickApi.#parseJson(dataJson)
      if (!data) {
        throw quickApi.#newBadParamsError({
          message: `Bad format on data json`,
          details: {
            receivedDataJson: dataJson
          }
        })
      }
      const images = {}
      for (let fileKey in files) {
        if (fileKey.startsWith('img')) {
          images[fileKey] = files[fileKey]
        }
      }
      res.locals.dentParsedBody = {
        data: data,
        dataJson: dataJson,
        images: images,
      }
    })
  }

  getPhotoExtension(imgFields) {
    return asyncMiddleware('quickApi.getPhotoExtension', async (req, res, next) => {
      const images = res.locals.dentParsedBody.images
      const fields = Object.keys(images)
      for (var i = 0; i < fields.length; i++) {
        const field = fields[i]
        const photo = images[field]

        if (!photo || photo.size === 0) {
          throw quickApi.#newBadParamsError({
            message: `A photo param ${field} is mandatory`,
            details: {
              imgParamsReceived: Object.keys(images)
            }
          })
        }

        const {ext: extension} = (await FileType.fromBuffer(photo.content)) || {}

        if (!extension || !extension.match(/.*(jpe?g|png)$/i)) {
          throw quickApi.#newBadParamsError({
            message: `Invalid photo type of ${field}`,
            details: {
              receivedPhotoType: extension
            }
          })
        }
      }
    })
  }

  dataToSimulationOptions({customizable, force={}}={}) {
    return asyncMiddleware('quickApi.dataToSimulationOptions', async (req, res, next) => {
      const INPUT_DATA_KEYS = ['style_mode', 'mix_factor', 'mode', 'blend', 'brightness', 'whiten']
      const STYLE_MODE_VALUES = ['auto', 'mix_manual']
      const MODE_VALUES = ['cosmetic', 'ortho']
      const BLEND_VALUES = ['poisson', 'replace']

      const originalData = Object.assign({}, res.locals.dentParsedBody.data, force)
      if (typeof(customizable) !== 'undefined') {
        Object.keys(originalData).forEach((key) => {
          if (!customizable.includes(key) && !(key in force)) {
            delete originalData[key]
          }
        })
      }

      const data = {}
      // mode
      data['mode'] = quickApi.#normalizeValue(originalData['mode'] || MODE_VALUES[0])
      quickApi.#validateValues(res, data, 'mode', MODE_VALUES)

      // blend
      data['blend'] = quickApi.#normalizeValue(originalData['blend'] || BLEND_VALUES[0])
      quickApi.#validateValues(res, data, 'blend', BLEND_VALUES)

      // brightness
      data['brightness'] = quickApi.#normalizeValue(originalData['brightness'] || '0.0')
      const {value: brightnessVal} = quickApi.#validateFloat(res, data, 'brightness', -1.0, 1.0)
      data['brightness'] = brightnessVal + 1.0

      // whiten
      data['whiten'] = quickApi.#normalizeValue(originalData['whiten'] || '0.0')
      const {value: whitenVal} = quickApi.#validateFloat(res, data, 'whiten', 0.0, 1.0)
      data['whiten'] = whitenVal

      // style_mode
      data['style_mode'] = quickApi.#normalizeValue(originalData['style_mode'] || STYLE_MODE_VALUES[0])
      data['mix_factor'] = quickApi.#normalizeValue(originalData['mix_factor'])

      if (data['style_mode'] === 'mix_manual') {
        if (!data['mix_factor']) {
          throw quickApi.#newBadParamsError({
            message: "'mix_factor' is mandatory on 'mix_manual' style mode"
          })
        }
      } else {
        delete data['mix_factor']
      }

      quickApi.#validateValues(res, data, 'style_mode', STYLE_MODE_VALUES)
      if (data['mix_factor']) {
        const {value: mixFactorVal} = quickApi.#validateFloat(res, data, 'mix_factor', 0.0, 1.0)
        data['mix_factor'] = mixFactorVal
      }

      // createOptions
      res.locals.dentSimulationOptions = quickApi.#normalizedDataToSimulationOptions(data)
    })
  }

  #normalizedDataToSimulationOptions({whiten, brightness, mode, blend, style_mode, mix_factor}) {
    const options = {
      whiten,
      brightness,
      ortho: mode === 'ortho',
      poisson: blend === 'poisson',
    }
    if (style_mode === 'mix_manual') {
      options['mix_factor'] = mix_factor
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

    throw quickApi.#newBadParamsError({
      message: `'${val}' is not valid value for '${key}' option`,
      details: {
        key: key,
        receivedValue: val
      }
    })
  }

  #validateValues(res, data, key, values) {
    const val = data[key]
    if (!values.includes(val)) {
      throw quickApi.#newBadParamsError({
        message: `'${val}' is not valid value for '${key}' option`,
        details: {
          key: key,
          receivedValue: val,
          validValues: values,
        }
      })
    }
    return {success: true}
  }

  #normalizeValue(val) {
    if (typeof(val) === 'undefined' || val === null) return null
    return val.toString().trim().toLowerCase()
  }

  get parseAuthToken() {
    return asyncMiddleware('quickApi.parseAuthToken', async (req, res) => {
      const token = quickApi.#getToken(req)
      if (!token) {
        throw quickApi.#newAuthorizationError({
          debugId: 'no-token',
          message: "Didn't received token",
        })
      }
      const parts = token.split(':')
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw quickApi.#newAuthorizationError({
          message: `Token invalid "${token}"`,
          details: {
            receivedToken: token,
          }
        })
      }

      const b64Claims = parts[0]
      const signature = parts[1]

      const claimsJson = simpleCrypto.base64Decode(b64Claims)
      if (!claimsJson) {
        throw quickApi.#newAuthorizationError({
          message: `Couldn't decode claims json "${b64Claims}"`,
          details: {
            receivedToken: token,
            receivedClaimsInBase64: b64Claims,
          }
        })
      }

      const claims = quickApi.#parseJson(claimsJson)
      if (!claims) {
        throw quickApi.#newAuthorizationError({
          message: `claims is not a valid json - ${claimsJson}`,
          details: {
            receivedToken: token,
            receivedClaims: claimsJson,
          }
        })
      }
      if (!claims['client_id']) {
        throw quickApi.#newAuthorizationError({
          debugId: 'no-client',
          message: `Missing 'client_id' on claims - "${token}`,
          details: {
            receivedToken: token,
            receivedClaims: claimsJson,
          }
        })
      }

      const clientId = claims['client_id']
      api.addInfo(res, {
        "security": {
          "client-id": clientId,
          "signature": signature,
        },
      })
      res.locals.dentClientId = clientId
      res.locals.dentParsedToken = {
        claimsJson: claimsJson,
        claims: claims,
        signature: signature,
      }
    })
  }

  get validateRecaptcha() {
    return asyncMiddleware('quickApi.validateRecaptcha', async (req, res) => {
      const {dentApiId: apiId, dentClient: client} = res.locals
      const {claims} = res.locals.dentParsedToken
      const {secret, minScore} = client.apiRecaptcha({api: apiId}) || {}
      if (!secret) {
        this.#addRecaptchaTag(res, 'skipped')
        return
      }
      const token = claims['recaptcha_token']
      const data = await quickApi.#requestRecaptcha({secret, token, minScore, ip: req.ip})
      const isValid = data && data.success && data.score >= minScore
      if (isValid) {
        this.#addRecaptchaTag(res, 'accepted')
      } else {
        this.#addRecaptchaTag(res, 'refused')
        throw quickApi.#newAuthorizationError({
          debugId: 'failed-recaptcha',
          message: `Failed on recaptcha validation`,
          details: {
            googleResponse: data,
            minScore,
          }
        })
      }
    })
  }

  #addRecaptchaTag(res, tagValue) {
    api.addTags(res, {'recaptcha:validation': tagValue})
  }

  async #requestRecaptcha({secret, token, minScore, ip}) {
    if (typeof(minScore) === 'undefined' || minScore === null) minScore = 0.75
    const {data} = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}&remoteip=${ip}`)
    return data
  }

  #parseJson(str) {
    try {
      return JSON.parse(str)
    } catch {
      return null;
    }
  }

  get validateAuthToken() {
    return asyncMiddleware('quickApi.validateAuthToken', async (req, res) => {
      const client = res.locals.dentClient
      const {claimsJson, signature} = res.locals.dentParsedToken
      const isValid = simpleCrypto.verifySignatureHmac(signature, claimsJson, client.secret)
      if (!isValid) {
        throw quickApi.#newAuthorizationError({
          message: `Claims JSON signature doesn't match it`,
          details: {
            signatureReceived: signature,
            claimsJsonReceived: claimsJson,
          }
        })
      }
    })
  }


  get validateBodyData() {
    return asyncMiddleware('quickApi.validateBodyData', async (req, res) => {
      const {claims} = res.locals.dentParsedToken
      const {dataJson: bodyDataJson, images} = res.locals.dentParsedBody

      const paramsSigned = claims['request_params_signed']
      const signaturesKeys = Object.keys(paramsSigned)
      const keys = Array.prototype.concat(Object.keys(images), ['data'])
      if (!quickApi.#hasSameValues(signaturesKeys, keys)) {
        throw quickApi.#newAuthorizationError({
          message: `Request data does not match token claims - ${keys} - ${signaturesKeys}`,
          details: {
            signedParamsOnTokenClaims: signaturesKeys,
            keysReceivedOnBody: keys,
          }
        })
      }

      const keysLength = keys.length
      for (let i = 0; i < keysLength; i++) {
        const key = keys[i]
        const val = (key === 'data' ? bodyDataJson : images[key].content)
        const signature = paramsSigned[key]
        const verificationSignature = simpleCrypto.md5(val)
        if (signature !== verificationSignature) {
          throw quickApi.#newAuthorizationError({
            message: `Signed param "${key}" does not match claims received on token`,
            details: {
              paramSignatureReceived: paramsSigned,
              paramSignatureExpected: verificationSignature,
            }
          })
        }
      }
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
    const signatureHeader = helpers.normalizeParamValue(req.get(SIGNATURE_HEADER))
    if (!signatureHeader) return null

    const match = signatureHeader.match(/^Bearer\s+(.*)\s*$/)
    if (!match) return null;
    return match[1]
  }

  #newRateLimitError({message, tags}) {
    return new RichError({
      publicId: 'rate-limit',
      httpCode: 429,
      publicMessage: 'Too Many Requests',
      debugMessage: message,
      logAsWarning: true,
      tags,
    })
  }

  #newBadParamsError({message, details={}}) {
    return new RichError({
      publicId: 'bad-params',
      httpCode: 422,
      debugMessage: message,
      debugDetails: details,
      publicMessage: 'Unprocessable Entity',
      doLog: false,
    })
  }

  #newAuthorizationError({message, debugId='bad-token', details={}}) {
    return new RichError({
      publicId: 'not-authorized',
      debugId: debugId,
      httpCode: 403,
      debugMessage: message,
      debugDetails: details,
      publicMessage: 'Not Authorized',
      doLog: false,
    })
  }
})()
