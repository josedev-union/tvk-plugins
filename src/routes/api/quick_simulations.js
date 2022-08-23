import express from 'express'
const router = express.Router()

import {QuickSimulationClient} from "../../models/clients/QuickSimulationClient"
import {simulationResultsUploader} from "../../models/storage/simulationResultsUploader"
import {logger} from '../../instrumentation/logger'
import {env} from "../../config/env"
import {RichError} from "../../utils/RichError"
import {getModel} from "../../middlewares/getModel"
import {asyncRoute} from '../../middlewares/expressAsync'
import {timeout} from "../../middlewares/timeout"
import {quickApi} from "../../middlewares/quickApi"
import {api} from '../../middlewares/api'

const middlewares = [
  timeout.ensure({id: 'full-route', timeoutSecs: env.quickApiRouteTimeout}),
  quickApi.parseAuthToken,
  getModel.client,
  quickApi.enforceCors,
  quickApi.validateAuthToken,
  quickApi.rateLimit,
  timeout.blowIfTimedout,
  timeout.ensure({id: 'recaptcha-validation', timeoutSecs: env.quickApiRecaptchaTimeout}, [
    quickApi.validateRecaptcha,
  ]),
  timeout.blowIfTimedout,
  timeout.ensure({httpCodeOverride: 408, id: 'parse-body', timeoutSecs: env.quickApiInputUploadTimeout}, [
    quickApi.parseRequestBody,
  ]),
  quickApi.validateBodyData,
  quickApi.getPhotoExtension(['img_photo']),
]

const quickSimulationRoute = asyncRoute(async (req, res) => {
  const timeoutManager = timeout.getManager(res)
  const data = res.locals.dentSimulationOptions
  const photo = res.locals.dentParsedBody.images['img_photo']
  const clientId = res.locals.dentClientId

  const simulation = await timeoutManager.exec(env.quickApiSimulationTimeout, async () => {
    const client = new QuickSimulationClient()
    const expiresAt = Math.round(timeoutManager.nextExpiresAtInSeconds() * 1000.0)
    return await client.requestSimulation({
      photo: photo.content,
      expiresAt: expiresAt,
      options: data,
      safe: true,
    })
  }, {id: 'wait-simulation'})

  const uploadResults = await timeoutManager.exec(env.quickApiResultsUploadTimeout, async () => {
    return await simulationResultsUploader.upload({
      clientId,
      simulation,
      uploadsConfig: {
        original: {extension: photo.extension},
        before: {getUrl: true},
        result: {getUrl: true},
      },
      info: {
        ip: req.ip,
      },
    })
  }, {id: 'wait-firestorage-upload'})

  if (simulation.error) {
    throw simulation.error
  }

  const {
    before: {getUrlSigned: beforeUrl},
    result: {getUrlSigned: resultUrl},
  } = uploadResults

  res.status(200).json({
    success: true,
    originalExt: photo.extension,
    beforeUrl,
    resultUrl,
  })
})

router.post('/cosmetic', [
  api.setId('cosmetic-simulations'),
  ...middlewares,
  quickApi.dataToSimulationOptions({
    force: {
      mode: 'cosmetic',
      blend: 'poisson',
    },
    customizable: ['mix_factor', 'style_mode', 'whiten', 'brightness'],
  }),
], quickSimulationRoute)

router.post('/ortho', [
  api.setId('ortho-simulations'),
  ...middlewares,
  quickApi.dataToSimulationOptions({
    force: {
      mode: 'ortho',
      blend: 'poisson',
      style_mode: 'auto',
    },
    customizable: [],
  }),
], quickSimulationRoute)

export default router
