import {quickApi} from "../../middlewares/quickApi"
import {api} from '../../middlewares/api'
import {timeout} from "../../middlewares/timeout"
import {asyncRoute} from '../../middlewares/expressAsync'
import { BasicRouter } from "./base"


export class CorsRouter extends BasicRouter {
  name = "Cors"

  get(path, handlers, kwargs) {
    this.#cors(path, kwargs)
    return super.get(path, handlers, kwargs)
  }

  post(path, handlers, kwargs) {
    this.#cors(path, kwargs)
    return super.post(path, handlers, kwargs)
  }

  put(path, handlers, kwargs) {
    this.#cors(path, kwargs)
    return super.put(path, handlers, kwargs)
  }

  patch(path, handlers, kwargs) {
    this.#cors(path, kwargs)
    return super.patch(path, handlers, kwargs)
  }

  delete(path, handlers, kwargs) {
    this.#cors(path, kwargs)
    return super.delete(path, handlers, kwargs)
  }

  options(path, handlers, kwargs) {
    this.#cors(path, kwargs)
    return super.options(path, handlers, kwargs)
  }

  #cors(path, kwargs) {
    console.log(kwargs[this.routeIdKey])
    const apiId = kwargs[this.routeIdKey]
    this.router.options(path,
      api.setId(apiId),
      timeout.ensure({id: 'full-route', timeoutSecs: 1.0}),
      quickApi.enforcePreflightCors,
      asyncRoute(async (req, res) => {
        res.status(200).end()
      }),
    )
  }
}
