import fs from 'fs'
import {promisify} from "util"
import multer from 'multer'
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
import {ApiClient} from "../models/database/ApiClient"
import {QuickSimulation} from "../models/database/QuickSimulation"

import {helpers} from '../routes/helpers'
import {asyncMiddleware, invokeMiddleware, invokeMiddlewares} from './expressAsync'

import {timeInSeconds} from "../utils/time"
const {SECONDS, MINUTES, HOURS, DAYS} = timeInSeconds

import {BufferWritable} from "../utils/BufferWritable"

const readfile = promisify(fs.readFile)

const DEFAULT_RATE_LIMIT_MAX_SUCCESSES_PER_SECOND = 1.0
const SIGNATURE_HEADER = 'Authorization'

// Claims Constants
const CLAIM_CLIENT_ID = 'clientId'
const CLAIM_PARAMS_HASHED = 'paramsHashed'
const CLAIM_RECAPTCHA_TOKEN = 'recaptchaToken'
const ALL_CLAIMS = [CLAIM_CLIENT_ID, CLAIM_RECAPTCHA_TOKEN, CLAIM_PARAMS_HASHED]
const MANDATORY_CLAIMS = [CLAIM_CLIENT_ID, CLAIM_PARAMS_HASHED]

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 1*1024*1024,
    fileSize: env.quickApiMaxUploadSizeBytes,
  }
})

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

  get enforcePreflightCors() {
    return asyncMiddleware('quickApi.enforcePreflightCors', async (req, res, next) => {
      const {dentApiId: apiId} = res.locals
      const allowedHosts = await ApiClient.getAllAllowedHosts({api: apiId})
      const enforce = cors.enforceCors({
        hosts: allowedHosts,
        methods: ['OPTIONS'],
      })
      return await invokeMiddleware(enforce, req, res)
    })
  }

  get validateApiVisibility() {
    return asyncMiddleware('quickApi.validateApiVisibility', async (req, res, next) => {
      const {dentApiId: apiId, dentClient: client} = res.locals
      if (!client.apiIsEnabled({api: apiId})) {
        throw quickApi.#newAuthorizationError({
          debugId: 'no-access-to-route',
          message: "The client aren't authorized to access this route",
        })
      }
    })
  }

  get validateClient() {
    return asyncMiddleware('quickApi.validateClient', async (req, res, next) => {
      const {dentClient: client} = res.locals
      if (client.isRevoked()) {
        throw quickApi.#newAuthorizationError({
          debugId: 'token-revoked',
          message: "This client access was revoked",
        })
      }
    })
  }

  rateLimit({ip: ipLimiting=true, client: clientLimiting=true}={}) {
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

      const all = []
      // Limiting any requests
      if (ipLimiting)     all.push(ipLimitRequestsPerMinute)
      if (clientLimiting) all.push(clientLimitRequestsPerSecond)

      // Limiting ip successes
      if (ipLimiting)     all.push(ipLimitSuccessesPerHour)
      if (ipLimiting)     all.push(ipLimitSuccessesPerDay)

      // Limiting client successes
      if (clientLimiting) all.push(clientLimitSuccessesPerSecond)
      if (clientLimiting) all.push(clientLimitSuccessesPerMinute)
      if (clientLimiting) all.push(clientLimitSuccessesPerHour)

      return await invokeMiddlewares(all, req, res)
    })
  }

  get parseRequestBody() {
    return asyncMiddleware('quickApi.parseRequestBody', async (req, res, next) => {
      const {fields, files} = await quickApi.#readBody(req, res)
      const {data: dataJson} = fields
      const data = quickApi.#parseJson(dataJson) || {}
      const images = {}
      for (let fileKey in files) {
        if (fileKey.startsWith('img')) {
          images[fileKey] = files[fileKey]
        }
      }
      res.locals.dentParsedBody = {
        data,
        dataJson,
        images,
      }
    })
  }

  async #readBody(req, res) {
    if (req.rawBodyJson) {
      return {
        fields: {data: req.rawBodyJson},
        files: {},
      }
    } else {
      return quickApi.#readBodyForm(req, res)
    }
  }

  async #readBodyForm(req, res) {
    await invokeMiddleware(multerUpload.any(), req, res)
    const fields = req.body || {}
    const allFiles = req.files || []
    const files = {}
    allFiles.forEach((file) => {
      file.originalFilename = file.originalname
      file.content = file.buffer
      delete file.buffer
      files[file.fieldname] = file
    })

    api.addInfo(res, {multipartData: {files, fields}})
    return {fields, files}
  }

  dataToQuickSimulation({customizable, force={}}={}) {
    return asyncMiddleware('quickApi.dataToSimulationOptions', async (req, res, next) => {
      const clientId = res.locals.dentClientId
      const {data: bodyData, images: bodyImages} = res.locals.dentParsedBody
      await quickApi.#processImageFields({
        images: bodyImages,
        imgFields: ['imgPhoto'],
      })

      const params = Object.assign({}, bodyData, force)
      if (typeof(customizable) !== 'undefined') {
        Object.keys(params).forEach((key) => {
          if (!customizable.includes(key) && !(key in force)) {
            delete params[key]
          }
        })
      }

      const quickSimulation = QuickSimulation.build({
        clientId,
        params,
        metadata: bodyData,
      })
      quickSimulation.normalizeData()
      const errors = quickSimulation.validationErrors()
      if (errors.length > 0) {
        const {message} = errors[0]
        throw quickApi.#newBadParamsError({
          message,
        })
      }
      res.locals.dentQuickSimulation = quickSimulation
    })
  }

  async #processImageFields({images, imgFields}) {
    for (var i = 0; i < imgFields.length; i++) {
      const field = imgFields[i]
      const photo = images[field]

      if (!photo || !photo.content || photo.size === 0) {
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

      const {clientId, parsedToken} = quickApi.#parseToken(token)
      api.addInfo(res, {
        "security": {
          "client-id": clientId,
          "signature": parsedToken.signature,
        },
      })

      res.locals.dentClientId = clientId
      res.locals.dentParsedToken = parsedToken
    })
  }

  #parseToken(token) {
    if (token.includes(':')) {
      return quickApi.#parseSignedClaims(token)
    } else {
      return quickApi.#parseSimpleClaims(token)
    }
  }

  #parseSimpleClaims(b64Claims) {
    const {claims, claimsJson} = quickApi.#decodeClaimsJson(b64Claims)
    const clientId = claims[CLAIM_CLIENT_ID]
    const parsedToken = {
      claims,
      claimsJson,
    }
    return {
      clientId,
      parsedToken,
    }
  }

  #parseSignedClaims(token) {
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

    const {claims, claimsJson} = quickApi.#decodeClaimsJson(b64Claims)
    MANDATORY_CLAIMS.forEach((claimKey) => {
      if (!claims[claimKey]) {
        throw quickApi.#newAuthorizationError({
          debugId: 'missing-claim',
          message: `Missing '${claimKey}' on claims - "${token}`,
          details: {
            receivedToken: token,
            receivedClaims: claimsJson,
            mandatoryClaims: MANDATORY_CLAIMS,
          }
        })
      }
    })

    const clientId = claims[CLAIM_CLIENT_ID]
    const parsedToken = {
      claimsJson,
      claims,
      signature,
    }

    return {clientId, parsedToken}
  }

  #decodeClaimsJson(b64Claims) {
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
    return {claims, claimsJson}
  }

  get validateRecaptcha() {
    return asyncMiddleware('quickApi.validateRecaptcha', async (req, res) => {
      const {dentApiId: apiId, dentClient: client} = res.locals
      const {claims} = res.locals.dentParsedToken
      const {secret, minScore} = client.apiRecaptcha({api: apiId}) || {}
      if (!secret) {
        quickApi.#addRecaptchaTag(res, 'skipped')
        return
      }
      const token = claims[CLAIM_RECAPTCHA_TOKEN]
      const data = await quickApi.#requestRecaptcha({secret, token, minScore, ip: req.ip})
      const isValid = data && data.success && data.score >= minScore
      if (isValid) {
        quickApi.#addRecaptchaTag(res, 'accepted')
      } else if (env.recaptchaIgnore) {
        quickApi.#addRecaptchaTag(res, 'ignored')
      } else {
        quickApi.#addRecaptchaTag(res, 'refused')
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

  validateAuthToken({secretKey}) {
    return asyncMiddleware('quickApi.validateAuthToken', async (req, res) => {
      const {dentClient: client, dentIsFrontendRoute: isFrontEndRoute} = res.locals
      if (!isFrontEndRoute) return
      const {claimsJson, signature} = res.locals.dentParsedToken
      const isValid = simpleCrypto.verifySignatureHmac(signature, claimsJson, client[secretKey])
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
      if (!res.locals.dentIsFrontendRoute) {
        return
      }
      const {claims} = res.locals.dentParsedToken
      const {dataJson: bodyDataJson, images} = res.locals.dentParsedBody

      const paramsHashed = claims[CLAIM_PARAMS_HASHED]
      const hashesKeys = Object.keys(paramsHashed)
      const keys = Object.keys(images)
      if (bodyDataJson) keys.push('data')
      if (!quickApi.#hasSameValues(hashesKeys, keys)) {
        throw quickApi.#newAuthorizationError({
          message: `Request data does not match token claims - ${keys} - ${hashesKeys}`,
          details: {
            hashedParamsOnTokenClaims: hashesKeys,
            keysReceivedOnBody: keys,
          }
        })
      }

      const keysLength = keys.length
      for (let i = 0; i < keysLength; i++) {
        const key = keys[i]
        const val = (key === 'data' ? bodyDataJson : images[key].content)
        const hash = paramsHashed[key]
        const verificationHash = simpleCrypto.md5(val)
        if (hash !== verificationHash) {
          throw quickApi.#newAuthorizationError({
            message: `Hashed param "${key}" does not match claims received on token`,
            details: {
              paramHashReceived: paramsHashed,
              paramHashExpected: verificationHash,
              originalValue: val,
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
      logLevel: 'debug',
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
      logLevel: 'debug',
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
      logLevel: 'debug',
    })
  }
})()
