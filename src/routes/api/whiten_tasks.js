import {QuickWhitenClient} from "../../models/clients/QuickWhiten"
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

    const simulation = await metrics.stopwatch('api:quickWhitenTask:runSimulation', async () => {
      return await timeoutManager.exec(env.quickApiSimulationTimeout, async () => {
        const client = new QuickWhitenClient()
        const nextTimeout = Math.round(timeoutManager.nextExpiresAtInSeconds() * 1000.0)
        const queueTimeout = Math.round(getNowInMillis() + env.quickApiSimulationQueueTimeout * 1000.0)
        const expiresAt = Math.min(nextTimeout, queueTimeout)
        quickApi.setSimulationStarted(res)
        console.log(dbSimulation.buildJobOptions())
        return await client.request({
          // id: dbSimulation.id,
          photo: photo.content,
          options: dbSimulation.buildJobOptions(),
          expiresAt,
          safe: true,
        })
      }, {id: 'wait-quick-whiten-task'})
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
        result: Buffer.from(simulation.result, 'binary').toString('base64'),
      }
    })
  })
}
