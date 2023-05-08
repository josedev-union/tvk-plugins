import stream from 'stream'
import path from 'path'
import fs from 'fs'

import axios from 'axios'
import formidable from 'formidable'
import {promisify} from "util"
import timeout from 'connect-timeout'
import express from 'express'
const router = express.Router()

import {i18n} from '../shared/i18n'
import {helpers} from './helpers'
import {asyncRoute} from '../middlewares/expressAsync'
import {rateLimit} from "../middlewares/rateLimit"
import {QuickFullSimulationClient} from "../models/clients/QuickSimulationClient"
import {GcloudPresignedCredentialsProvider} from '../models/storage/GcloudPresignedCredentialsProvider'
import {idGenerator} from "../models/tools/idGenerator"
import {storageFactory} from '../models/storage/storageFactory'
import {TimeoutManager} from '../models/tools/TimeoutManager'
import {logger} from '../instrumentation/logger'
import {env} from "../config/env"
import {envShared} from "../shared/envShared"
import {otp} from "../shared/otp"
import {getNowInMillis} from '../utils/time'

const readfile = promisify(fs.readFile)
const ROBOTS_PRODUCTION = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow: /terms

User-agent: *
Disallow: /privacy`

const ROBOTS_DEV = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow: /`

const minutelyIpRateLimit = rateLimit({
  limit: env.instSimIpRateLimitMinutely.amount,
  expiresIn: env.instSimIpRateLimitMinutely.timeWindow,
  lookup: (req, _) => `instant-simulation:minutely:${req.ip}`,
  onBlocked: function(req, res, next) {
    throw new Error('Exceeded minutely IP rate limit')
  }
})

const hourlySuccessIpRateLimit = rateLimit({
  limit: env.instSimIpRateLimitHourly.amount,
  expiresIn: env.instSimIpRateLimitHourly.timeWindow,
  lookup: (req, _) => `instant-simulation:hourly:${req.ip}`,
  countIf: (_, res) => {
    return (res.statusCode >= 200 && res.statusCode <= 299) && !res.locals.dentInstSimIsErrorPage;
  },
  onBlocked: function(req, res, next) {
    throw new Error('Exceeded hourly IP rate limit')
  }
})

const dailyIpRateLimit = rateLimit({
  limit: env.instSimIpRateLimitDaily.amount,
  expiresIn: env.instSimIpRateLimitDaily.timeWindow,
  lookup: (req, _) => `instant-simulation:daily:${req.ip}`,
  onBlocked: function(req, res, next) {
    throw new Error('Exceeded daily IP rate limit')
  }
})

router.get('/', asyncRoute(async (req, res) => {
  setupCacheGet(res)
  const synthTransform = !!req.query.transform || !!req.query.t
  res.render('instant_simulations/index', buildParams({synthTransform: synthTransform}))
}))

router.get('/terms', asyncRoute(async (req, res) => {
  setupCacheGet(res)
  res.render('instant_simulations/terms', buildLayoutParams({subtitle: 'Terms of Service'}))
}))

router.get('/privacy', asyncRoute(async (req, res) => {
  setupCacheGet(res)
  res.render('instant_simulations/privacy', buildLayoutParams({subtitle: 'Privacy Policy'}))
}))

router.get('/epoch', asyncRoute(async (req, res) => {
  res.json({epoch: getOtpEpoch()})
}))

router.get('/robots.txt', asyncRoute(async (req, res) => {
  const content = env.isProduction() ? ROBOTS_PRODUCTION : ROBOTS_DEV
  setupCacheGet(res)
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(content)
}))

router.post('/',
timeout(`${env.instSimRouteTimeout + env.instSimUploadTimeout}s`),
hourlySuccessIpRateLimit,
minutelyIpRateLimit,
dailyIpRateLimit,
asyncRoute(async (req, res, next) => {
  const form = formidable({
    multiples: true,
    maxFileSize: envShared.maxUploadSizeBytes,
    maxFieldsSize: 1*1024*1024,
    allowEmptyFiles: false
  })
  const timeoutManager = new TimeoutManager({externalTimedout: () => req.timedout, onTimeout: () => form.pause()})
  const {files, fields} = await timeoutManager.exec(async () => {
    const result = await helpers.parseForm(form, req)
    return result
  }, env.instSimUploadTimeout)
  if (timeoutManager.hasTimedout()) return

  const photo = files.photo

  await timeoutManager.exec(async () => {
    const nowMillis = getNowInMillis()
    if (!photo || photo.size === 0) {
      throw new Error("No photo was received")
    }

    if (!tokenIsValid(fields.secret)) {
      throw new Error('Non authorized token')
    }

    const recaptchaIsValid = await validateRecaptcha(fields.recaptchaToken)
    if (!recaptchaIsValid) {
      throw new Error('Invalid Recaptcha')
    }

    const photoExt = path.extname(photo.originalFilename).toLowerCase()
    const photoPath = photo.filepath
    const info = {ip: req.ip, timestamp: timenowStr()}
    Object.assign(res.locals, {photoPath, photoExt, info})
    if (!photoExt.match(env.supportedImagesFilepathRegex)) {
      throw new Error(`Invalid extension ${photoExt}`)
    }
    const client = new QuickFullSimulationClient()
    const expiresAt = Math.round(nowMillis + env.instSimGiveUpStartTimeout * 1000.0)
    const simOpts = {
      brightness: env.instSimBrightness,
      whiten: env.instSimWhiten,
      poisson: env.instSimPoisson,
      ortho: false,
    }
    if (fields.synthTransform !== 'true') {
      simOpts['mix_factor'] = env.instSimMixFactor
    }
    const simulation = await client.requestSimulation({
      photoPath,
      expiresAt: expiresAt,
      options: simOpts
    })
    if (timeoutManager.hasTimedout()) return
    const { getBeforeUrl, getResultUrl } = await uploadToFirestoreData({
      originalExt: photoExt,
      original: simulation.original,
      before: simulation.before,
      result: simulation.result,
      morphed: simulation.morphed,
      info: res.locals.info
    })
    if (timeoutManager.hasTimedout()) return
    //const beforeDataUrl = helpers.toDataUrl(simulation.before, 'image/jpeg')
    //const resultDataUrl = helpers.toDataUrl(simulation.result, 'image/jpeg')
    const simulationParams = {
      success: true,
      beforeUrl: getBeforeUrl,
      resultUrl: getResultUrl,
      //beforeDataUrl: beforeDataUrl,
      //resultDataUrl: resultDataUrl,
      originalExt: photoExt
    }
    return res.render('instant_simulations/index', buildParams({subtitle: 'Result', simulation: simulationParams}))
  }, env.instSimRouteTimeout)
}))

async function errorHandler(error, req, res, next) {
  logger.error(error)
  const errorInfo = getErrorInfo(error)
  if (errorInfo.isSimulationError) {
    const info = res.locals.info
    info.errorFullMessage = errorInfo.fullMessage
    info.errorPrettyMessage = errorInfo.prettyMessage
    const original = await readfile(res.locals.photoPath)
    const originalExt = res.locals.photoExt
    await uploadToFirestoreData({original, originalExt, info})
  }
  const simulationParams = {success: false, error_message: errorInfo.prettyMessage, error_code: errorInfo.errorCode, is_simulation_error: errorInfo.isSimulationError}
  res.locals.dentInstSimIsErrorPage = true
  return res.render('instant_simulations/index', buildParams({subtitle: 'Try Again', simulation: simulationParams}))
}

async function uploadToFirestoreData({originalExt, original, before=null, result=null, morphed=null, info}) {
  const success = result !== null
  const id = idGenerator.newOrderedId()
  const folder = `.instant-simulations/${(success ? 'success' : 'fail')}/${id}/`
  const originalKey = path.join(folder, 'original' + originalExt)
  const resultKey = path.join(folder, 'result.jpg')
  const beforeKey = path.join(folder, 'before.jpg')
  const morphedKey = path.join(folder, 'morphed.jpg')
  const uploads = []
  if (success) {
    uploads.push(upload(result, resultKey))
    uploads.push(upload(before, beforeKey))
    if (morphed) {
      uploads.push(upload(morphed, morphedKey))
    }
  }
  uploads.push(upload(original, originalKey))
  uploads.push(upload(prettyJSON(info), path.join(folder, 'info.json')))
  await Promise.all(uploads)
  if (success) {
    const signedUrls = []
    const gcloudSigner = GcloudPresignedCredentialsProvider.build()
    signedUrls.push(gcloudSigner.urlToGet(beforeKey, {expiresInSeconds: 15 * 60}))
    signedUrls.push(gcloudSigner.urlToGet(resultKey, {expiresInSeconds: 15 * 60}))
    let [{url: getBeforeUrl}, {url: getResultUrl}] = await Promise.all(signedUrls)
    return {getBeforeUrl, getResultUrl}
  } else {
    return {}
  }
}

async function upload(data, filekey) {
  const bucket = env.gcloudBucket
  await new Promise((resolve, reject) => {
    const file = storageFactory()
    .bucket(bucket)
    .file(filekey)
    const passthroughStream = new stream.PassThrough()
    passthroughStream.write(data)
    passthroughStream.end()
    passthroughStream
    .pipe(file.createWriteStream())
    .on('finish', function() {
      logger.info(`[SUCCESS] Upload: (${bucket}) ${filekey}`)
      resolve()
    })
    .on('error', function(err) {
      logger.error(`[FAILED] Upload: (${bucket}) ${filekey}`)
      reject(err)
    })
  })
}

function buildLayoutParams({subtitle=null}) {
  return {
    title: 'Free Smiles Simulation' + (subtitle ? ` - ${subtitle}` : ''),
    measurementId: envShared.instSimFirebaseMeasurementId,
  }
}

function buildParams({subtitle=null, simulation=null, synthTransform=false}={}) {
  let params = buildLayoutParams({subtitle})
  params = Object.assign(params, {
    i18n: i18n,
    maxFileSize: envShared.maxUploadSizeBytes,
    recaptchaClientKey: envShared.instSimRecaptchaClientKey,
    synthTransform: synthTransform,
  })
  if (simulation !== null) {
    params = Object.assign(params, {simulation: simulation})
  }
  return params
}

function getErrorInfo(error) {
  const fullErrorMessage = error.message || error.error || prettyJSON(error)
  const info = {fullMessage: fullErrorMessage, isSimulationError: false}
  const rateLimitPattern = /exceeded.*rate limit/i
  let prettyMessage = null
  let errorCode = null
  if (fullErrorMessage.match(rateLimitPattern) && fullErrorMessage.match(/minute/i)) {
    errorCode = 'errors:simulations-minutely-limit'
    prettyMessage = i18n(errorCode)
  } else if (fullErrorMessage.match(rateLimitPattern) && fullErrorMessage.match(/hour/i)) {
    errorCode = 'errors:simulations-hourly-limit'
    prettyMessage = i18n(errorCode)
  } else if (fullErrorMessage.match(rateLimitPattern) && fullErrorMessage.match(/da(il)?y/i)) {
    errorCode = 'errors:simulations-daily-limit'
    prettyMessage = i18n(errorCode)
  } else if (fullErrorMessage.match(/invalid.*recaptcha/i)) {
    errorCode = 'errors:invalid-recaptcha'
    prettyMessage = i18n(errorCode)
  } else if (fullErrorMessage.match(/maxFileSize exceeded/i)) {
    errorCode = 'errors:upload:image-size-limit'
    prettyMessage = i18n(errorCode, {maxSize: envShared.maxUploadSizeMb})
  } else if (fullErrorMessage.match(/no photo.*received/i)) {
    errorCode = 'errors:upload:no-file'
    prettyMessage = i18n(errorCode)
  } else if (fullErrorMessage.match(/invalid.*extension/i)) {
    errorCode = 'errors:upload:wrong-image-format'
    prettyMessage = i18n(errorCode)
  } else if (fullErrorMessage.match(/((response|error).*timeout|timeout:)/i)) {
    errorCode = 'errors:timeout'
    prettyMessage = i18n(errorCode)
  } else if (fullErrorMessage.match(/Couldn.*t detect face/i)) {
    errorCode = 'errors:no-face'
    prettyMessage = i18n(errorCode)
    info.isSimulationError = true
  } else if (fullErrorMessage.match(/error.*simulation/i)) {
    errorCode = 'errors:simulation-error'
    prettyMessage = i18n(errorCode)
    info.isSimulationError = true
  } else {
    errorCode = 'errors:unknown-processing-error'
    prettyMessage = i18n(errorCode)
  }
  info.prettyMessage = prettyMessage
  info.errorCode = errorCode
  return info
}

function tokenIsValid(otpToken) {
  if (env.instSimTokenDisabled) return true
  return otp.verify(otpToken, getOtpEpoch(), envShared.instSimSecretToken)
}

async function validateRecaptcha(token) {
  const {data} = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${env.instSimRecaptchaSecretKey}&response=${token}`)
  return data.success && data.score >= 0.75
}

function timenowStr() {
  return new Date().toLocaleString('en-US', {hour12: false});
}

function prettyJSON(info) {
  const identation = 4
  return JSON.stringify(info, null, identation)
}

function getOtpEpoch() {
  return Math.round(new Date().getTime() / 1000)
}

function setupCacheGet(res) {
  if (!env.isProduction()) return;
  res.set('Cache-Control', "public, max-age=3600, must-revalidate")
}

export default {
  router: router,
  errorHandler: errorHandler
}
