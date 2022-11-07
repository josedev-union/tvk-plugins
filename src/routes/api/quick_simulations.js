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
        customizable: ['mixFactor', 'styleMode', 'whiten', 'brightness'],
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
          styleMode: 'mix_manual',
          mixFactor: 0,
        },
        customizable: [],
      }),
    ]
  }, newQuickSimulationRoute())

  // newApiRoute({
  //   apiId: 'get-simulation',
  //   method: 'GET',
  //   path: '/:id',
  // }, getSimulationRoute())

  // newApiRoute({
  //   apiId: 'list-simulations',
  //   method: 'GET',
  //   path: '/',
  // }, listSimulationsRoute())

  newApiRoute({
    apiId: 'patch-simulation',
    method: 'PATCH',
    path: '/:id',
  }, patchSimulationRoute())
})

function newQuickSimulationRoute() {
  return asyncRoute(async (req, res) => {
    const timeoutManager = timeout.getManager(res)
    const dbSimulation = res.locals.dentQuickSimulation
    const photo = res.locals.dentParsedBody.images['imgPhoto']
    const clientId = res.locals.dentClientId
    const bucket = env.gcloudBucket

    const simulation = await timeoutManager.exec(env.quickApiSimulationTimeout, async () => {
      const client = new QuickSimulationClient()
      const expiresAt = Math.round(timeoutManager.nextExpiresAtInSeconds() * 1000.0)
      quickApi.setSimulationStarted(res)
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
          morphed: {getUrl: false},
        },
        info: {
          ip: req.ip,
          params: dbSimulation.params,
          metadata: dbSimulation.metadata,
        },
      })
    }, {id: 'wait-firestorage-upload'})

    Object.entries(uploadResults.results).forEach(([resultName, result]) => {
      if (result.filepath) {
        dbSimulation.addStorageData({[`${resultName}Path`]: result.filepath})
      }
    })
    dbSimulation.addStorageData({
      bucket,
      directoryPath: uploadResults.folderpath,
    })

    await dbSimulation.save()

    if (simulation.error) {
      throw simulation.error
    }

    const {
      before: {getUrlSigned: beforeUrl},
      result: {getUrlSigned: resultUrl},
    } = uploadResults.results

    res.status(201).json({
      success: true,
      simulation: {
        ...simulationAsJson(dbSimulation),
        storage: {
          beforeUrl,
          resultUrl,
        }
      }
    })
  })
}

function getSimulationRoute() {
  return asyncRoute(async (req, res) => {
    const simulationId = req.params.id
    const clientId = res.locals.dentClientId
    const dbSimulation = await QuickSimulation.get(simulationId)
    if (!dbSimulation || dbSimulation.clientId !== clientId) {
      throw api.newNotFoundError()
    }

    res.status(200).json({
      success: true,
      simulation: simulationAsJson(dbSimulation),
    })
  })
}

function patchSimulationRoute() {
  return asyncRoute(async (req, res) => {
    const simulationId = req.params.id
    const clientId = res.locals.dentClientId
    const dbSimulation = await QuickSimulation.get(simulationId)
    if (!dbSimulation || dbSimulation.clientId !== clientId) {
      throw api.newNotFoundError()
    }

    const {data} = res.locals.dentParsedBody
    dbSimulation.addMetadata(data)
    const {errors} = await dbSimulation.save({attrs: ['metadata']})

    res.status(200).json({
      success: true,
      simulation: simulationAsJson(dbSimulation),
    })
  })
}

function listSimulationsRoute() {
  return asyncRoute(async (req, res) => {
    const clientId = res.locals.dentClientId
    const params = Object.assign({}, req.query)
    params.clientId = clientId
    const listParams = {filters: params}
    const dbSimulations = await QuickSimulation.list(listParams)

    res.status(200).json({
      success: true,
      simulations: dbSimulations.map(s => simulationAsJson(s))
    })
  })
}

function simulationAsJson(dbSimulation) {
  return {
    id: dbSimulation.id,
    createdAt: dbSimulation.createdAt.toDate(),
    metadata: dbSimulation.metadata,
    // params: dbSimulation.params,
  }
}
