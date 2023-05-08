import {QuickFullSimulationClient, QuickWhitenSimulationClient} from "../../models/clients/QuickSimulationClient"
import {simulationResultsUploader} from "../../models/storage/simulationResultsUploader"
import {QuickFullSimulation, QuickWhitenSimulation} from "../../models/database/QuickSimulation"
import {metrics} from '../../instrumentation/metrics'
import {env} from "../../config/env"
import {asyncRoute} from '../../middlewares/expressAsync'
import {quickApi} from '../../middlewares/quickApi'
import {api} from '../../middlewares/api'
import {timeout} from "../../middlewares/timeout"
import {getNowInMillis} from '../../utils/time'
import { QuickFullRouterV1, QuickFullRouterV1rc } from "../router/quick"


export function v1rcApiQuickSimulations ({clientIsFrontend = false}) {
  return new QuickFullRouterV1rc({isPublic: clientIsFrontend}).
  post(
    '/cosmetic',
    [
      quickApi.processImageFields(),
      quickApi.dataToModel(
        QuickFullSimulation,
        {
          force: {
            mode: 'cosmetic',
            blend: 'poisson',
          },
          customizable: ['mixFactor', 'styleMode', 'whiten', 'brightness'],
        }
      ),
      postFull(),
    ],
    {'id': 'cosmetic-simulations'},
  ).
  post(
    '/ortho',
    [
      quickApi.processImageFields(),
      quickApi.dataToModel(
        QuickFullSimulation,
        {
          force: {
            mode: 'ortho',
            blend: 'poisson',
            styleMode: 'mix_manual',
            mixFactor: 0,
          },
          customizable: [],
        }
      ),
      postFull(),
    ],
    {'id': 'ortho-simulations'},
  ).
  post(
    '/whiten',
    [
      quickApi.processImageFields(),
      quickApi.dataToModel(
        QuickWhitenSimulation,
        {customizable: ['whiten']},
      ),
      postWhiten(),
    ],
    {'id': 'whiten-simulations'},
  ).
  patch(
    '/:id',
    [
      patchFull()
    ],
    {'id': 'patch-simulations'},
  ).
  build()
}

export function v1ApiQuickSimulations ({clientIsFrontend = false}) {
  return new QuickFullRouterV1({isPublic: clientIsFrontend}).
  post(
    '/cosmetic',
    [
      quickApi.processImageFields(),
      quickApi.dataToModel(
        QuickFullSimulation,
        {
          force: {
            mode: 'cosmetic',
            blend: 'poisson',
          },
          customizable: ['mixFactor', 'styleMode', 'whiten', 'brightness'],
        }
      ),
      postFull(),
    ],
    {'id': 'cosmetic-simulations-v1'},
  ).
  post(
    '/ortho',
    [
      quickApi.processImageFields(),
      quickApi.dataToModel(
        QuickFullSimulation,
        {
          force: {
            mode: 'ortho',
            blend: 'poisson',
            styleMode: 'mix_manual',
            mixFactor: 0,
          },
          customizable: [],
        }
      ),
      postFull(),
    ],
    {'id': 'ortho-simulations-v1'},
  ).
  post(
    '/whiten',
    [
      quickApi.processImageFields(),
      quickApi.dataToModel(
        QuickWhitenSimulation,
        {customizable: ['whiten']},
      ),
      postWhiten(),
    ],
    {'id': 'whiten-simulations-v1'},
  ).
  patch(
    '/:id',
    [
      patchFull()
    ],
    {'id': 'patch-simulations-v1'},
  ).
  build()
}

function postFull() {
  return asyncRoute(async (req, res) => {
    const timeoutManager = timeout.getManager(res)
    const dbSimulation = res.locals.dentQuickSimulation
    const photo = res.locals.dentParsedBody.images['imgPhoto']
    const imgStartStyle = res.locals.dentParsedBody.images['imgStartStyle']
    const imgEndStyle = res.locals.dentParsedBody.images['imgEndStyle']
    const startStyle = imgStartStyle === undefined ? null: imgStartStyle.content
    const endStyle = imgEndStyle === undefined ? null: imgEndStyle.content

    const {dentClient: apiClient, dentApiId: apiId} = res.locals
    const bucket = apiClient.customBucket({api: apiId}) || env.gcloudBucket
    const googleProjectKey = apiClient.customGoogleProject({api: apiId}) || 'default'

    const simulation = await metrics.stopwatch('api:quickSimulations:runSimulation', async () => {
      return await timeoutManager.exec(env.quickApiSimulationTimeout, async () => {
        const client = new QuickFullSimulationClient()
        const nextTimeout = Math.round(timeoutManager.nextExpiresAtInSeconds() * 1000.0)
        const queueTimeout = Math.round(getNowInMillis() + env.quickApiSimulationQueueTimeout * 1000.0)
        const expiresAt = Math.min(nextTimeout, queueTimeout)
        quickApi.setSimulationStarted(res)
        return await client.requestSimulation({
          id: dbSimulation.id,
          photo: photo.content,
          startStyleImg: startStyle,
          endStyleImg: endStyle,
          options: dbSimulation.buildJobOptions(),
          expiresAt,
          safe: true,
        })
      }, {id: 'wait-simulation'})
    })

    if (!simulation.id) {
      throw api.newServerError({
        debugMessage: `Simulation response should have id but got ${simulation}`,
      })
    }

    const uploadResults = await metrics.stopwatch('api:quickSimulations:uploadResults', async () => {
      return await timeoutManager.exec(env.quickApiResultsUploadTimeout, async () => {
        return await simulationResultsUploader.upload({
          googleProjectKey,
          bucket,
          clientId: apiClient.id,
          simulation,
          uploadsConfig: {
            original: {extensionPlaceholder: photo.filenameExtension},
            before: {getUrl: true, isPublic: true},
            result: {getUrl: true, isPublic: true},
            morphed: {getUrl: false},
          },
          info: {
            ip: req.ip,
            metadata: dbSimulation.metadata,
          },
        })
      }, {id: 'wait-firestorage-upload'})
    })

    Object.entries(uploadResults.results).forEach(([resultName, result]) => {
      if (result.filepath) {
        dbSimulation.addStorageData({[`${resultName}Path`]: result.filepath})
      }
    })
    dbSimulation.addStorageData({
      bucket,
      directoryPath: uploadResults.folderpath,
    })

    await dbSimulation.save({source: googleProjectKey})

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

function postWhiten() {
  return asyncRoute(async (req, res) => {
    const timeoutManager = timeout.getManager(res)
    const dbSimulation = res.locals.dentQuickSimulation
    const photo = res.locals.dentParsedBody.images['imgPhoto']

    const {dentClient: apiClient, dentApiId: apiId} = res.locals
    const bucket = apiClient.customBucket({api: apiId}) || env.gcloudBucket
    const googleProjectKey = apiClient.customGoogleProject({api: apiId}) || 'default'

    const simulation = await metrics.stopwatch('api:quickWhitenTask:runSimulation', async () => {
      return await timeoutManager.exec(env.quickApiSimulationTimeout, async () => {
        const client = new QuickWhitenSimulationClient()
        const nextTimeout = Math.round(timeoutManager.nextExpiresAtInSeconds() * 1000.0)
        const queueTimeout = Math.round(getNowInMillis() + env.quickApiSimulationQueueTimeout * 1000.0)
        const expiresAt = Math.min(nextTimeout, queueTimeout)
        quickApi.setSimulationStarted(res)
        return await client.request({
          // id: dbSimulation.id,
          photo: photo.content,
          options: dbSimulation.buildJobOptions(),
          expiresAt,
          safe: true,
        })
      }, {id: 'wait-quick-whiten-simulation'})
    })

    if (!simulation.id) {
      throw api.newServerError({
        debugMessage: `Whiten response should have id but got ${simulation}`,
      })
    }

    const uploadResults = await metrics.stopwatch('api:quickWhitenTask:uploadResults', async () => {
      return await timeoutManager.exec(env.quickApiResultsUploadTimeout, async () => {
        return await simulationResultsUploader.upload({
          googleProjectKey,
          bucket,
          clientId: apiClient.id,
          simulation,
          uploadsConfig: {
            original: {extensionPlaceholder: photo.filenameExtension},
            before: {getUrl: true, isPublic: true},
            result: {getUrl: true, isPublic: true},
          },
          info: {
            ip: req.ip,
            metadata: dbSimulation.metadata,
          },
        })
      }, {id: 'wait-quick-whiten-firestorage-upload'})
    })

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

function getFull() {
  return asyncRoute(async (req, res) => {
    const simulationId = req.params.id
    const {dentClient: apiClient, dentApiId: apiId, dentClientId: clientId} = res.locals
    const googleProjectKey = apiClient.customGoogleProject({api: apiId}) || 'default'
    const dbSimulation = await QuickFullSimulation.get(simulationId, {source: googleProjectKey})
    if (!dbSimulation || dbSimulation.clientId !== clientId) {
      throw api.newNotFoundError()
    }

    res.status(200).json({
      success: true,
      simulation: simulationAsJson(dbSimulation),
    })
  })
}

function patchFull() {
  return asyncRoute(async (req, res) => {
    const simulationId = req.params.id
    const {dentClient: apiClient, dentApiId: apiId, dentClientId: clientId} = res.locals
    const googleProjectKey = apiClient.customGoogleProject({api: apiId}) || 'default'
    const dbSimulation = await QuickFullSimulation.get(simulationId, {source: googleProjectKey})
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

function listFull() {
  return asyncRoute(async (req, res) => {
    const {dentClient: apiClient, dentApiId: apiId, dentClientId: clientId} = res.locals
    const googleProjectKey = apiClient.customGoogleProject({api: apiId}) || 'default'
    const params = Object.assign({}, req.query)
    params.clientId = clientId
    const listParams = {filters: params}
    const dbSimulations = await QuickFullSimulation.list(listParams, {source: googleProjectKey})

    res.status(200).json({
      success: true,
      simulations: dbSimulations.map(s => simulationAsJson(s)) // TODO: Paginate
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
