import {logger} from '../instrumentation/logger'
import NodeCache from 'node-cache'

import {timeInSeconds} from '../utils/time'
const {SECONDS, MINUTES, HOURS, DAYS} = timeInSeconds

const allInstances = []
export class InMemory {
  constructor({cache, cacheTTL, staleTTL}) {
    this.cache = cache
    this.cacheTTL = cacheTTL
    this.staleTTL = staleTTL
    allInstances.push(this)
  }

  static clear() {
    for (let instance of allInstances) {
      if (typeof(instance.clear) === 'function') {
        instance.clear()
      }
    }
  }

  static build(params) {
    const {cacheTTL} = params
    const nodeCache = new NodeCache({
      stdTTL: cacheTTL,
      useClones: false,
      checkperiod: 10.0 * MINUTES,
      deleteOnExpire: true,
      maxKeys: 5000
    })
    return new InMemory({
      ...params,
      cache: nodeCache,
    })
  }

  delete(key, {keepCache=false, keepStale=false}={}) {
    const cacheKey = this.#cacheKey(key)
    const staleKey = this.#staleKey(key)
    if (!keepCache) this.cache.del(cacheKey)
    if (!keepStale) this.cache.del(staleKey)
  }

  clear() {
    this.cache.flushAll()
  }

  async wrap({key, op, skipCache=false}) {
    if (skipCache) {
      logger.verbose(`Cache SKIP: ${key}`)
    } else {
      const cKey = this.#cacheKey(key)
      const cached = this.cache.get(cKey)
      if (typeof(cached) !== 'undefined') {
        logger.verbose(`cache.InMemory: Return Cached ${key}`)
        return cached
      }
    }

    return this.#execAndStore({op, key})
  }

  async #store(key, result) {
    if (this.#validToStore(result)) {
      logger.warn(`cache.InMemory (silent fail): Invalid result for key ${key}: ${result}`)
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
      logger.verbose(`cache.InMemory: Stored ${key}`)
    } else {
      logger.warn(`cache.InMemory (silent fail): Couldn't store ${key} with: ${result}`)
    }
    return Promise.resolve(result)
  }

  async #handleError(key, error) {
    const sKey = this.#staleKey(key)
    const staled = this.#isStaleOn() ? this.cache.get(sKey) : undefined
    if (typeof(staled) === 'undefined') {
      return Promise.reject(error)
    } else {
      logger.warn(`cache.InMemory: Failed to execute behaviour of ${key}, returning stale instead: ${staled}`)
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

  async #execAndStore({op, key}) {
    return this.#exec(op)
      .then((result) => {
        this.#store(key, result)
        return Promise.resolve(result)
      })
      .catch((error) => {
        return this.#handleError(key, error)
      })
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
