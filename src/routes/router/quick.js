import {metricsMid} from "../../middlewares/metrics"
import {timeout} from "../../middlewares/timeout"
import {quickApi} from "../../middlewares/quickApi"
import {sanitizer} from '../../models/tools/sanitizer'
import {env} from "../../config/env"
import {QuickSegment} from "../../models/database/QuickSimulation"

import { QuickRouter } from "./base"


/***
 * This is a router class for Segment
 *  - Set api id
 *  - Set request timeout
 *  - Parse auth token
 *  - Validate the client status and api visability
 */
export class QuickFullRouter extends QuickRouter {

  name = "QuickFullRouter"

  conditionalHandlers(handlers, kwargs) {
    let res = [
      metricsMid.stopwatch('api:parseRequestBody', [
        timeout.ensure({httpCodeOverride: 408, id: 'parse-body', timeoutSecs: env.quickApiInputUploadTimeout}, [
          quickApi.parseRequestBody,
        ]),
      ]),
      quickApi.validateBodyData,
      ...handlers,
    ]
    return super.conditionalHandlers(res, kwargs)
  }
}


export class QuickSegmentTaskRouter extends QuickRouter {

  name = "QuickSegmentTaskRouter"
  PARAMS_WHITELIST = []

  conditionalHandlers(handlers, kwargs) {
    console.log("dev: conditionalHandlers")
    let res = [
      metricsMid.stopwatch('api:parseRequestBody', [
        timeout.ensure({httpCodeOverride: 408, id: 'parse-body', timeoutSecs: env.quickApiInputUploadTimeout}, [
          quickApi.parseRequestBody,
        ]),
      ]),
      quickApi.validateBodyData,
      quickApi.dataToModel(QuickSegment),
      ...handlers,
    ]
    return super.conditionalHandlers(res, kwargs)
  }
}


export class QuickSythTaskRouter extends QuickRouter {

  name = "QuickSythTaskRouter"
  PARAMS_WHITELIST = []

  conditionalHandlers(handlers, kwargs) {
    console.log("dev: conditionalHandlers")
    let res = [
      metricsMid.stopwatch('api:parseRequestBody', [
        timeout.ensure({httpCodeOverride: 408, id: 'parse-body', timeoutSecs: env.quickApiInputUploadTimeout}, [
          quickApi.parseRequestBody,
        ]),
      ]),
      quickApi.validateBodyData,
      quickApi.dataToModel(QuickSegment),
      ...handlers,
    ]
    return super.conditionalHandlers(res, kwargs)
  }
}
