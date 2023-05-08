import {QuickWhitenClient} from "../../models/clients/QuickWhiten"
import {simulationResultsUploader} from "../../models/storage/simulationResultsUploader"
import {metrics} from '../../instrumentation/metrics'
import {env} from "../../config/env"
import {asyncRoute} from '../../middlewares/expressAsync'
import {quickApi} from '../../middlewares/quickApi'
import {api} from '../../middlewares/api'
import {timeout} from "../../middlewares/timeout"
import {getNowInMillis} from '../../utils/time'
import { QuickWhitenRouterV1 } from "../router/quick"


export default ({clientIsFrontend = false}) => {
  let r = new QuickWhitenRouterV1({isPublic: clientIsFrontend})
  return  r.
  post(
    '/',
    [
      post(),
    ],
    {'id': 'quick-whiten-v1'},
  ).
  build()
}


function post() {
  return asyncRoute(async (req, res) => {
    const timeoutManager = timeout.getManager(res)
    const dbSimulation = res.locals.dentQuickSimulation
    const photo = res.locals.dentParsedBody.images['imgPhoto']

    const {dentClient: apiClient, dentApiId: apiId} = res.locals
    const bucket = apiClient.customBucket({api: apiId}) || env.gcloudBucket
    const googleProjectKey = apiClient.customGoogleProject({api: apiId}) || 'default'

    const simulation = await metrics.stopwatch('api:quickWhitenTask:runSimulation', async () => {
      return await timeoutManager.exec(env.quickApiSimulationTimeout, async () => {
        const client = new QuickWhitenClient()
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

function simulationAsJson(dbSimulation) {
  return {
    id: dbSimulation.id,
    createdAt: dbSimulation.createdAt.toDate(),
    metadata: dbSimulation.metadata,
    // params: dbSimulation.params,
  }
}
