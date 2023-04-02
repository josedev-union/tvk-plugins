import {metricsMid} from "../../middlewares/metrics"
import {timeout} from "../../middlewares/timeout"
import {quickApi} from "../../middlewares/quickApi"
import {sanitizer} from '../../models/tools/sanitizer'
import {env} from "../../config/env"
import {QuickSegment, QuickSynth} from "../../models/database/QuickTask.js"

import { QuickRouter } from "./base"


export class QuickFullRouterV1rc extends QuickRouter {

  name = "QuickFullRouter"

  conditionalHandlers(handlers, kwargs) {
    if (this.isPublic) {
      return [
        api.setPublic(),
        quickApi.enforceCors,
        quickApi.validateAuthToken({secretKey: 'exposedSecret'}),
        quickApi.rateLimit(),
        timeout.blowIfTimedout,
        metricsMid.stopwatch('api:validateRecaptcha', [
          timeout.ensure({id: 'recaptcha-validation', timeoutSecs: env.quickApiRecaptchaTimeout}, [
            quickApi.validateRecaptcha,
          ]),
        ]),
        timeout.blowIfTimedout,
        metricsMid.stopwatch('api:parseRequestBody', [
          timeout.ensure({httpCodeOverride: 408, id: 'parse-body', timeoutSecs: env.quickApiInputUploadTimeout}, [
            quickApi.parseRequestBody,
          ]),
        ]),
        quickApi.validateBodyData,
        quickApi.processImageFields(),
        ...handlers,
      ]
    }
    return [
      api.setPrivate(),
      quickApi.rateLimit({ip: false}),
      metricsMid.stopwatch('api:parseRequestBody', [
        timeout.ensure({httpCodeOverride: 408, id: 'parse-body', timeoutSecs: env.quickApiInputUploadTimeout}, [
          quickApi.parseRequestBody,
        ]),
      ]),
      quickApi.validateBodyData,
      quickApi.processImageFields(),
      ...handlers,
    ]
  }
}


export class QuickFullRouterV1 extends QuickRouter {

  name = "QuickFullRouter"

  conditionalHandlers(handlers, kwargs) {
    let res = [
      quickApi.processImageFields(),
      ...handlers,
    ]
    return super.conditionalHandlers(res, kwargs)
  }
}


export class QuickSegmentTaskRouter extends QuickRouter {

  name = "QuickSegmentTaskRouter"
  PARAMS_WHITELIST = []

  conditionalHandlers(handlers, kwargs) {
    let res = [
      quickApi.processImageFields(),
      quickApi.dataToModel(QuickSegment),
      ...handlers,
    ]
    return super.conditionalHandlers(res, kwargs)
  }
}


export class QuickSynthTaskRouter extends QuickRouter {

  name = "QuickSynthTaskRouter"
  PARAMS_WHITELIST = []

  conditionalHandlers(handlers, kwargs) {
    let res = [
      quickApi.processImageFields(["segmap"]),
      quickApi.dataToModel(QuickSynth, {customizable: ['mix_factor', 'start_style_stats', 'end_style_stats']}),
      ...handlers,
    ]
    return super.conditionalHandlers(res, kwargs)
  }
}
