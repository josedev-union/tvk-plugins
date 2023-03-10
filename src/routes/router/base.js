import express from 'express'


export class BasicRouter {
  name = "Basic"
  #mhandlers = []
  routeIdKey = "id"

  constructor() {
    this.router = express.Router()
  }

  #conditionalHandlers(handlers, kwargs) {
    return handlers
  }

  #fHandlers(handlers, kwargs) {
    return [...this.#mhandlers, ...this.#conditionalHandlers(handlers, kwargs)]
  }

  get(path, handlers, kwargs) {
    this.router.get(path, this.#fHandlers(handlers, kwargs))
    return this
  }

  post(path, handlers, kwargs) {
    this.router.post(path, this.#fHandlers(handlers, kwargs))
    return this
  }

  put(path, handlers, kwargs) {
    this.router.put(path, this.#fHandlers(handlers, kwargs))
    return this
  }

  patch(path, handlers, kwargs) {
    this.router.patch(path, this.#fHandlers(handlers, kwargs))
    return this
  }

  delete(path, handlers, kwargs) {
    this.router.delete(path, this.#fHandlers(handlers, kwargs))
    return this
  }

  options(path, handlers, kwargs) {
    this.router.options(path, this.#fHandlers(handlers, kwargs))
    return this
  }

  build() {
    return this.router
  }
}
