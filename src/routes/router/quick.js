import {quickApi} from "../../middlewares/quickApi"
import {api} from '../../middlewares/api'
import {timeout} from "../../middlewares/timeout"
import {getModel} from "../../middlewares/getModel"
import {env} from "../../config/env"
import {metricsMid} from "../../middlewares/metrics"
import { CorsRouter } from "./cors"


export class QuickRouter extends CorsRouter {

  name = "Quick"

  #mhandlers = [
    quickApi.parseAuthToken,
    getModel.client,
    quickApi.validateClient,
    quickApi.validateApiVisibility,
    quickApi.validateBodyData,
  ]

  constructor(isFront) {
    super()
    this.isFront = isFront
  }

  #conditionalHandlers(handlers, kwargs) {
    const apiId = kwargs["id"]

    commonMiddlewares = [      
      api.setId({apiId, clientIsFrontend: this.isFront}),
      timeout.ensure({id: 'full-route', timeoutSecs: env.quickApiRouteTimeout}),
      metricsMid.stopwatch('api:parseRequestBody', [
        timeout.ensure({httpCodeOverride: 408, id: 'parse-body', timeoutSecs: env.quickApiInputUploadTimeout}, [
          quickApi.parseRequestBody,
        ]),
      ]),
      ...handlers,
    ]

    publicMiddlewares = [
      api.corsOnError,
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
    ]

    privateMiddlewares = [
      quickApi.validateAuthToken({secretKey: 'secret'}),
      quickApi.rateLimit({ip: false}),
    ]
    if (this.isFront) {
      return [
        ...commonMiddlewares,
        ...publicMiddlewares,
      ]
    }
    return [
      ...commonMiddlewares,
      ...privateMiddlewares,
    ]
  }
}



