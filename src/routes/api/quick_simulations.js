import express from 'express'
const router = express.Router()

import {QuickSimulationClient} from "../../models/clients/QuickSimulationClient"
import {simulationResultsUploader} from "../../models/storage/simulationResultsUploader"
import {QuickSimulation} from "../../models/database/QuickSimulation"
import {logger} from '../../instrumentation/logger'
import {env} from "../../config/env"
import {asyncRoute} from '../../middlewares/expressAsync'
import {quickApi} from '../../middlewares/quickApi'
import {api} from '../../middlewares/api'
import {apisRouter} from '../../middlewares/apisRouter'
import {timeout} from "../../middlewares/timeout"

export default apisRouter.newRouterBuilder((newApiRoute) => {
  newApiRoute({
    apiId: 'cosmetic-simulations',
    method: 'POST',
    path: '/cosmetic',
    middlewares: [
      quickApi.dataToQuickSimulation({
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
      quickApi.dataToQuickSimulation({
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

  newApiRoute({
    apiId: 'get-simulation',
    method: 'GET',
    path: '/:id',
  }, getSimulationRoute())
})

function newQuickSimulationRoute() {
  return asyncRoute(async (req, res) => {
    const timeoutManager = timeout.getManager(res)
    const dbSimulation = res.locals.dentQuickSimulation
    const photo = res.locals.dentParsedBody.images['img_photo']
    const clientId = res.locals.dentClientId
    const bucket = env.gcloudBucket

    const simulation = await timeoutManager.exec(env.quickApiSimulationTimeout, async () => {
      const client = new QuickSimulationClient()
      const expiresAt = Math.round(timeoutManager.nextExpiresAtInSeconds() * 1000.0)
      return await client.requestSimulation({
        id: dbSimulation.id,
        photo: photo.content,
        expiresAt: expiresAt,
        options: dbSimulation.buildJobOptions(),
        safe: true,
      })
    }, {id: 'wait-simulation'})

    const uploadResults = await timeoutManager.exec(env.quickApiResultsUploadTimeout, async () => {
      return await simulationResultsUploader.upload({
        bucket,
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

    Object.entries(uploadResults).forEach(([resultName, result]) => {
      dbSimulation.addStorageData({[`${resultName}Path`]: result.filepath})
    })

    await dbSimulation.save()

    if (simulation.error) {
      throw simulation.error
    }

    const {
      before: {getUrlSigned: beforeUrl},
      result: {getUrlSigned: resultUrl},
    } = uploadResults

    res.status(200).json({
      id: dbSimulation.id,
      success: true,
      originalExt: photo.extension,
      beforeUrl,
      resultUrl,
    })
  })
}

function getSimulationRoute() {
  return asyncRoute(async (req, res) => {
    const simulationId = req.params.id
    const dbSimulation = await QuickSimulation.get(simulationId)
    if (!dbSimulation) {
      throw api.newNotFoundError()
    }

    res.status(200).json({
      id: dbSimulation.id,
      params: dbSimulation.params,
      metadata: dbSimulation.metadata,
      success: true,
    })
  })
}
