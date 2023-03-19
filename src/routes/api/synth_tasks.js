import {QuickSegmentClient} from "../../models/clients/QuickSegmentClient"
import {metrics} from '../../instrumentation/metrics'
import {env} from "../../config/env"
import {asyncRoute} from '../../middlewares/expressAsync'
import {quickApi} from '../../middlewares/quickApi'
import {api} from '../../middlewares/api'
import {timeout} from "../../middlewares/timeout"
import {getNowInMillis} from '../../utils/time'
import { QuickSythTaskRouter } from "../router/quick"


export default ({clientIsFrontend = false}) => {
  let r = new QuickSythTaskRouter({isPublic: clientIsFrontend})
  return  r.
  post(
    '/',
    [
      post(),
    ],
    {'id': 'quick-segment'},
  ).
  build()
}


function post() {
  return asyncRoute(async (req, res) => {
    console.log("dev: post")
    const timeoutManager = timeout.getManager(res)
    const dbSimulation = res.locals.dentQuickSimulation
    const photo = res.locals.dentParsedBody.images['imgPhoto']

    const simulation = await metrics.stopwatch('api:quickSegmentTask:runSimulation', async () => {
      return await timeoutManager.exec(env.quickApiSimulationTimeout, async () => {
        const client = new QuickSegmentClient()
        const nextTimeout = Math.round(timeoutManager.nextExpiresAtInSeconds() * 1000.0)
        const queueTimeout = Math.round(getNowInMillis() + env.quickApiSimulationQueueTimeout * 1000.0)
        const expiresAt = Math.min(nextTimeout, queueTimeout)
        quickApi.setSimulationStarted(res)
        return await client.requestSimulation({
          // id: dbSimulation.id,
          photo: photo.content,
          options: {},
          expiresAt,
          safe: true,
        })
      }, {id: 'wait-quick-segment-task'})
    })

    if (!simulation.id) {
      throw api.newServerError({
        debugMessage: `Simulation response should have id but got ${simulation}`,
      })
    }

    res.status(201).json({
      success: true,
      simulation: {
        id: dbSimulation.id,
        createdAt: dbSimulation.createdAt.toDate(),
        metadata: dbSimulation.metadata,
        result: simulation.result,
      }
    })
  })
}
