import {QuickSynthClient} from "../../models/clients/QuickSynth"
import {metrics} from '../../instrumentation/metrics'
import {env} from "../../config/env"
import {asyncRoute} from '../../middlewares/expressAsync'
import {quickApi} from '../../middlewares/quickApi'
import {api} from '../../middlewares/api'
import {timeout} from "../../middlewares/timeout"
import {getNowInMillis} from '../../utils/time'
import { QuickSynthTaskRouter } from "../router/quick"


export default ({clientIsFrontend = false}) => {
  let r = new QuickSynthTaskRouter({isPublic: clientIsFrontend})
  return  r.
  post(
    '/',
    [
      post(),
    ],
    {'id': 'quick-synth'},
  ).
  build()
}


function post() {
  return asyncRoute(async (req, res) => {
    const timeoutManager = timeout.getManager(res)
    const dbSimulation = res.locals.dentQuickSimulation
    const segmap = res.locals.dentParsedBody.images['segmap']
    const imgStartStyle = res.locals.dentParsedBody.images['imgStartStyle']
    const imgEndStyle = res.locals.dentParsedBody.images['imgEndStyle']
    const startStyle = imgStartStyle === undefined ? null: imgStartStyle.content
    const endStyle = imgEndStyle === undefined ? null: imgEndStyle.content
    const simulation = await metrics.stopwatch('api:quickSynthTask:runSimulation', async () => {
      return await timeoutManager.exec(env.quickApiSimulationTimeout, async () => {
        const client = new QuickSynthClient()
        const nextTimeout = Math.round(timeoutManager.nextExpiresAtInSeconds() * 1000.0)
        const queueTimeout = Math.round(getNowInMillis() + env.quickApiSimulationQueueTimeout * 1000.0)
        const expiresAt = Math.min(nextTimeout, queueTimeout)
        quickApi.setSimulationStarted(res)
        return await client.request({
          // id: dbSimulation.id,
          segmap: segmap.content,
          startStyleImg: startStyle,
          endStyleImg: endStyle,
          options: dbSimulation.buildJobOptions(),
          expiresAt,
          safe: true,
        })
      }, {id: 'wait-quick-synth-task'})
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
