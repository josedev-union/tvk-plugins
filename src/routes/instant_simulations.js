import stream from 'stream'
import path from 'path'
import fs from 'fs'

import formidable from 'formidable'
import {promisify} from "util"
import timeout from 'connect-timeout'
import express from 'express';
const router = express.Router();

import {i18n} from '../shared/i18n'
import {helpers} from './helpers'
import {rateLimit} from "../middlewares/rateLimit"
import {QuickSimulationClient} from "../models/clients/QuickSimulationClient"
import {idGenerator} from "../models/tools/idGenerator"
import {storageFactory} from '../models/storage/storageFactory'
import {TimeoutManager} from '../models/tools/TimeoutManager'
import {logger} from '../instrumentation/logger'
import {env} from "../config/env"

const readfile = promisify(fs.readFile)

const ipRateLimit = rateLimit({
  limit: env.ipRateLimit.amount,
  expiresIn: env.ipRateLimit.timeWindow,
  lookup: (req, _) => `instant-simulation:${req.ip}`,
  onBlocked: function(req, res, next) {
    throw 'Exceeded IP rate limit'
  }
})

router.get('/', async (req, res) => {
  res.render('instant_simulations/index', buildParams()) // secret: access.secret, 
})

router.post('/',
timeout(`${env.instSimRouteTimeout + env.instSimUploadTimeout}s`),
//security.getContentType,
//security.getSignature,
//security.getImageMD5,
//getModel.client,
//security.verifySignature,
//userRateLimit,
ipRateLimit,
//clientRateLimit,
helpers.asyncCatchError(async (req, res, next) => {
  const form = formidable({
    multiples: true,
    maxFileSize: env.maxUploadSizeBytes,
    maxFieldsSize: 1*1024*1024,
    allowEmptyFiles: false
  })
  const timeoutManager = new TimeoutManager({externalTimedout: () => req.timedout, onTimeout: () => form.pause()})
  const {files, fields} = await timeoutManager.exec(async () => {
    const result = await helpers.parseFormPromise(form, req)
    return result
  }, env.instSimUploadTimeout)
  if (timeoutManager.hasTimedout()) return
  if (!files.photo || files.photo.size === 0) {
    throw "No photo was received"
  }

  const extension = path.extname(files.photo.name).toLowerCase()
  res.locals.photoPath = files.photo.path
  res.locals.photoExt = extension
  res.locals.info = {ip: req.ip, timestamp: timenowStr()}
  if (!extension.match(/.*(jpe?g|png)$/i)) {
    throw `Invalid extension ${extension}`
  }
  const client = new QuickSimulationClient()
  const nowSecs = new Date().getTime()
  const expiresAt = Math.round(nowSecs + env.instSimGiveUpStartTimeout * 1000.0)
  const simulation = await client.requestSimulation({photoPath: files.photo.path, expiresAt: expiresAt})
  if (timeoutManager.hasTimedout()) return
  await uploadToFirestoreData({
    original: simulation.original,
    originalExt: extension,
    result: simulation.result,
    info: res.locals.info
  })
  if (timeoutManager.hasTimedout()) return
  const originalDataUrl = helpers.toDataUrl(simulation.original)
  const resultDataUrl = helpers.toDataUrl(simulation.result)
  const simulationParams = {success: true, original: originalDataUrl, result: resultDataUrl}
  return res.render('instant_simulations/index', buildParams(simulationParams))
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
  const simulationParams = {success: false, error_message: errorInfo.prettyMessage}
  return res.render('instant_simulations/index', buildParams(simulationParams))
}

async function uploadToFirestoreData({original, originalExt, result=null, info}) {
  const success = result !== null
  const id = idGenerator.newOrderedId()
  const folder = `.instant-simulations/${(success ? 'success' : 'fail')}/${id}/`
  const uploads = [
    upload(original, path.join(folder, 'original' + originalExt)),
    upload(prettyJSON(info), path.join(folder, 'info.json')),
  ]
  if (success) {
    uploads.push(upload(result, path.join(folder, 'result.jpg')))
  }
  await Promise.all(uploads)
}

async function upload(data, filekey) {
  await new Promise((resolve, reject) => {
    const file = storageFactory()
    .bucket(env.gcloudBucket)
    .file(filekey)
    const passthroughStream = new stream.PassThrough()
    passthroughStream.write(data)
    passthroughStream.end()
    passthroughStream
    .pipe(file.createWriteStream())
    .on('finish', resolve)
    .on('error', reject)
  })
}

function buildParams(simulation=null) {
  let params = {i18n: i18n, maxFileSize: env.maxUploadSizeBytes}
  if (simulation !== null) {
    params = Object.assign(params, {simulation: simulation})
  }
  return params
}

function getErrorInfo(error) {
  const fullErrorMessage = error.message || error.error || prettyJSON(error)
  const info = {fullMessage: fullErrorMessage, isSimulationError: false}
  let prettyMessage = null
  if (fullErrorMessage.match(/exceeded.*rate limit/i)) {
    prettyMessage = i18n('errors:simulations-hour-limit')
  } else if (fullErrorMessage.match(/maxFileSize exceeded/i)) {
    prettyMessage = i18n('errors:upload:image-size-limit', {maxSize: env.maxUploadSizeMb})
  } else if (fullErrorMessage.match(/no photo.*received/i)) {
    prettyMessage = i18n('errors:upload:no-file')
  } else if (fullErrorMessage.match(/invalid.*extension/i)) {
    prettyMessage = i18n('errors:upload:wrong-image-format')
  } else if (fullErrorMessage.match(/((response|error).*timeout|timeout:)/i)) {
    prettyMessage = i18n('errors:timeout')
  } else if (fullErrorMessage.match(/Couldn.*t detect face/i)) {
    prettyMessage = i18n('errors:no-face')
    info.isSimulationError = true
  } else if (fullErrorMessage.match(/error.*simulation/i)) {
    prettyMessage = i18n('errors:simulation-error')
    info.isSimulationError = true
  } else {
    prettyMessage = i18n('errors:unknown-processing-error')
  }
  info.prettyMessage = prettyMessage
  return info
}

function timenowStr() {
  return new Date().toLocaleString('en-US', {hour12: false});
}

function prettyJSON(info) {
  const identation = 4
  return JSON.stringify(info, null, identation)
}

export default {
  router: router,
  errorHandler: errorHandler
}
