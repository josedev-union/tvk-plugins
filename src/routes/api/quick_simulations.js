import express from 'express'
const router = express.Router()

import {QuickSimulationClient} from "../../models/clients/QuickSimulationClient"
import {simulationResultsUploader} from "../../models/storage/simulationResultsUploader"
import {logger} from '../../instrumentation/logger'
import {env} from "../../config/env"
import {asyncRoute} from '../../middlewares/expressAsync'
import {quickApi} from '../../middlewares/quickApi'
import {apisRouter} from '../../middlewares/apisRouter'
import {timeout} from "../../middlewares/timeout"

export default apisRouter.newRouterBuilder((newApiRoute) => {
  newApiRoute({
    apiId: 'cosmetic-simulations',
    method: 'POST',
    path: '/cosmetic',
    middlewares: [
      quickApi.dataToSimulationOptions({
        force: {
          mode: 'cosmetic',
          blend: 'poisson',
        },
        customizable: ['mix_factor', 'style_mode', 'whiten', 'brightness'],
      }),
    ]
  }, newQuickSimulationRoute())

  newApiRoute({
    apiId: 'ortho-simulations',
    method: 'POST',
    path: '/ortho',
    middlewares: [
      quickApi.dataToSimulationOptions({
        force: {
          mode: 'ortho',
          blend: 'poisson',
          style_mode: 'mix_manual',
          mix_factor: 0,
        },
        customizable: [],
      }),
    ]
  }, newQuickSimulationRoute())
})

function newQuickSimulationRoute() {
  return asyncRoute(async (req, res) => {
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
      id: simulation.id,
      success: true,
      originalExt: photo.extension,
      beforeUrl,
      resultUrl,
    })
  })
}
