import {metricsMid} from "../../middlewares/metrics"
import {timeout} from "../../middlewares/timeout"
import {quickApi} from "../../middlewares/quickApi"
import {sanitizer} from '../../models/tools/sanitizer'
import {env} from "../../config/env"
import {QuickSegment, QuickSynth} from "../../models/database/QuickTask.js"

import { QuickRouter } from "./base"


export class QuickFullRouter extends QuickRouter {

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
      quickApi.dataToModel(QuickSynth, {customizable: ['mix_factor', 'start_style_stats', 'end_style_stats', 'start_style_path', 'end_style_path']}),
      ...handlers,
    ]
    return super.conditionalHandlers(res, kwargs)
  }
}
