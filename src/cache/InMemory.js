import NodeCache from 'node-cache'

import {timeInSeconds} from '../utils/time'
const {SECONDS, MINUTES, HOURS, DAYS} = timeInSeconds

export class InMemory {
  constructor({cache, cacheTTL, staleTTL}) {
    this.cache = cache
    this.cacheTTL = cacheTTL
    this.staleTTL = staleTTL
  }

  static build(params) {
    const {cacheTTL} = params
    const nodeCache = new NodeCache({
      stdTTL: cacheTTL,
      useClones: true,
      checkperiod: 10.0 * MINUTES,
      deleteOnExpire: true,
      maxKeys: 5000
    })
    return new InMemory({
      ...params,
      cache: nodeCache,
    })
  }

  async wrap({key, op, skipCache=false}) {
    if (skipCache) {
      console.debug(`Cache SKIP: ${key}`)
      return this.#exec(op)
    }
    const cKey = this.#cacheKey(key)
    const cached = this.cache.get(cKey)
    if (typeof(cached) !== 'undefined') {
      console.debug(`cache.InMemory: Return Cached ${key}`)
      return cached
    }

    return this.#exec(op)
      .then((result) => {
        this.#store(key, result)
        return Promise.resolve(result)
      })
      .catch((error) => {
        return this.#handleError(key, error)
      })
  }

  async #store(key, result) {
    if (this.#validToStore(result)) {
      console.warn(`cache.InMemory (silent fail): Invalid result for key ${key}: ${result}`)
    }
    const setCommands = []
    const cKey = this.#cacheKey(key)
    setCommands.push({key: cKey, val: result, ttl: this.cacheTTL})

    if (this.#isStaleOn()) {
      const sKey = this.#staleKey(key)
      setCommands.push({key: sKey, val: result, ttl: this.staleTTL})
    }
    const success = this.cache.mset(setCommands)
    if (success) {
      console.debug(`cache.InMemory: Stored ${key}`)
    } else {
      console.warn(`cache.InMemory (silent fail): Couldn't store ${key} with: ${result}`)
    }
    return Promise.resolve(result)
  }

  async #handleError(key, error) {
    const sKey = this.#staleKey(key)
    const staled = this.#isStaleOn() ? this.cache.get(sKey) : undefined
    if (typeof(staled) === 'undefined') {
      return Promise.reject(error)
    } else {
      console.warn(`cache.InMemory: Failed to execute behaviour of ${key}, returning stale instead: ${staled}`)
      return Promise.resolve(staled)
    }
  }

  async #exec(obj) {
    if (typeof(obj) === 'function') {
      const f = async () => obj()
      obj = f()
    }
    if (obj instanceof Error) {
      return Promise.reject({error: obj})
    } else if (!!obj.error) {
      return Promise.reject(obj)
    } else {
      return Promise.resolve(obj)
    }
  }

  #validToStore(result) {
    const isInvalid = (
      typeof(obj) === 'undefined'
      || obj === null
      || obj instanceof Error
      || 'error' in obj
      || (typeof(obj) === 'object' && Object.keys(obj).length === 0)
    )
    return !isInvalid
  }
  #isStaleOn() { return typeof(this.staleTTL) === 'number' && this.staleTTL > 0 }
  #cacheKey(key) { return `cache:${key}` }
  #staleKey(key) { return `stale:${key}` }
}
