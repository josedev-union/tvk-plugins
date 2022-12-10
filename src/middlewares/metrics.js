import {metrics} from '../instrumentation/metrics'
import {asyncMiddleware, invokeMiddlewares} from './expressAsync'

export const metricsMid = new (class {
  stopwatch(metricName, middlewares) {
    return asyncMiddleware(`metrics.${metricName}`, async (req, res) => {
      return metrics.stopwatch(metricName, async () => invokeMiddlewares(middlewares, req, res))
    })
  }
})()

