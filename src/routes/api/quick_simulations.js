import stream from 'stream'
import path from 'path'
import fs from 'fs'
import {promisify} from "util"
const readfile = promisify(fs.readFile)

// import axios from 'axios'
import FileType from 'file-type';
import timeout from 'connect-timeout'
import express from 'express'
const router = express.Router()

import {getModel} from "../../middlewares/getModel"
import {QuickSimulationClient} from "../../models/clients/QuickSimulationClient"
import {GcloudPresignedCredentialsProvider} from '../../models/storage/GcloudPresignedCredentialsProvider'
import {idGenerator} from "../../models/tools/idGenerator"
import {storageFactory} from '../../models/storage/storageFactory'
import {TimeoutManager} from '../../models/tools/TimeoutManager'
import {logger} from '../../instrumentation/logger'
import {env} from "../../config/env"
import {envShared} from "../../shared/envShared"
import {simpleCrypto} from "../../shared/simpleCrypto"
import {helpers} from '../helpers'
import {quickApi} from "../../middlewares/quickApi"
import {api} from '../../middlewares/api'

router.post('/',
api.setId('simulationsCosmetic'),
quickApi.parseAuthToken,
getModel.client,
quickApi.enforceCors,
quickApi.validateAuthToken,
quickApi.rateLimit,
quickApi.parseRequestBody,
quickApi.validateBodyData,
quickApi.dataToSimulationOptions,
helpers.asyncCatchError(async (req, res, next) => {
  const data = res.locals.dentSimulationOptions
  const photo = res.locals.dentParsedBody.images['img_photo']

  const nowSecs = new Date().getTime()
  if (!photo || photo.size === 0) {
    throw "No photo was received"
  }

  // TODO: Verify dataJson signature
  // TODO: Verify image MD5

  // if (!tokenIsValid(fields.secret)) {
  //   throw 'Non authorized token'
  // }

  // const recaptchaIsValid = await validateRecaptcha(fields.recaptchaToken)
  // if (!recaptchaIsValid) {
  //   throw 'Invalid Recaptcha'
  // }

  const {ext: extension} = (await FileType.fromBuffer(photo.content)) || {}

  const info = {ip: req.ip, timestamp: timenowStr()}
  if (!extension || !extension.match(/.*(jpe?g|png)$/i)) {
    throw `Invalid image type ${extension}`
  }
  const client = new QuickSimulationClient()
  const expiresAt = Math.round(nowSecs + env.instSimGiveUpStartTimeout * 1000.0)
  const simulation = await client.requestSimulation({photo: photo.content, expiresAt: expiresAt, options: data})
  const { getBeforeUrl, getResultUrl } = await uploadToFirestoreData({
    originalExt: extension,
    original: simulation.original,
    before: simulation.before,
    result: simulation.result,
    info: info
  })
  //const beforeDataUrl = helpers.toDataUrl(simulation.before, 'image/jpeg')
  //const resultDataUrl = helpers.toDataUrl(simulation.result, 'image/jpeg')
  return res.status(200).json({
    success: true,
    beforeUrl: getBeforeUrl,
    resultUrl: getResultUrl,
    originalExt: extension
  })
}))

async function uploadToFirestoreData({originalExt, original, before=null, result=null, info}) {
  const success = result !== null
  const id = idGenerator.newOrderedId()
  const folder = `.instant-simulations/${(success ? 'success' : 'fail')}/${id}/`
  const originalKey = path.join(folder, 'original' + originalExt)
  const resultKey = path.join(folder, 'result.jpg')
  const beforeKey = path.join(folder, 'before.jpg')
  const uploads = []
  if (success) {
    uploads.push(upload(result, resultKey))
    uploads.push(upload(before, beforeKey))
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

// function tokenIsValid(otpToken) {
//   if (env.instSimTokenDisabled) return true
//   return otp.verify(otpToken, getOtpEpoch(), envShared.instSimSecretToken)
// }

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

export default router
