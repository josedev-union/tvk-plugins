import {getNowInSecs} from '../../utils/time'

export class TimeoutManager {
  constructor({onTimeout}={}) {
    this.timedout = false
    this.expiredTimeoutId = null
    this.timeouts = {}
    this.callbacks = []
    this.onTimeout(onTimeout)
  }

  async exec(timeoutSecs, operation, {id, onTimeout}={}) {
    if (this.hasTimedout()) {
      this.#asPromise(onTimeout)
      return await this.blowIfTimedout()
    }
    id = this.start(timeoutSecs, {id, onTimeout})
    const result = await Promise.race([
      this.#asPromise(operation),
      this.#blowOnTimeout()
    ])
    this.clear(id)
    await this.blowIfTimedout()
    return result
  }

  start(timeoutSecs, {id, onTimeout}={}) {
    if (this.hasTimedout()) {
      this.#asPromise(onTimeout)
      return
    }
    const nowSecs = getNowInSecs()
    const clearId = setTimeout(async () => {
      if (!this) return
      this.timedout = true
      this.expiredTimeoutId = id
      this.clearAll()
      await Promise.all([
        this.#asPromise(onTimeout),
        this.#callCallbacks(),
      ])
    }, timeoutSecs * 1000.0)

    if (!id) id = clearId
    this.timeouts[id] = {
      clearId,
      startedAt: nowSecs,
      duration: timeoutSecs,
    }
    return id
  }

  clear(id) {
    const timeout = this.timeouts[id]
    if (!timeout) return
    clearTimeout(timeout.clearId)
    delete this.timeouts[id]
  }

  clearAll() {
    Object.keys(this.timeouts).forEach(() => this.clear())
  }

  onTimeout(op) {
    if (this.hasTimedout()) {
      this.#asPromise(op)
      return
    }
    if (op) this.callbacks.push(op)
  }

  missingSecondsToExpire() {
    const expiresAtSecs = this.nextExpiresAtInSeconds()
    const nowSecs = getNowInSecs()
    return max(0.0, expiresAtSecs - nowSecs)
  }

  nextExpiresAtInSeconds() {
    if (this.timedout) return 0
    const ids = Object.keys(this.timeouts)
    if (!ids.length) return 0
    let minExpiresAt = null
    ids.forEach((id) => {
      const timeout = this.timeouts[id]
      if (timeout) {
        const expiresAt = timeout.startedAt + timeout.duration
        if (minExpiresAt !== null && expiresAt < minExpiresAt) {
          minExpiresAt = expiresAt
        }
      }
    })
    return minExpiresAt || 0
  }

  hasTimedout() {
    return this.timedout
  }

  async blowIfTimedout() {
    return this.blowIfTimedoutSync()
  }

  blowIfTimedoutSync() {
    if (this.hasTimedout()) {
      this.clearAll()
      throw `Timeout: Operation took too long timeoutId:${this.expiredTimeoutId}`
    }
  }

  async waitForTimeout() {
    return new Promise((resolve, reject) => {
      this.onTimeout(() => resolve())
    })
  }

  async #blowOnTimeout() {
    await this.waitForTimeout()
    return await this.blowIfTimedout()
  }

  async #callCallbacks() {
    return Promise.all(this.callbacks.map((cb) => this.#asPromise(cb)))
  }

  async #asPromise(obj) {
    if (typeof(obj) === 'function') {
      const f = async () => obj()
      obj = f()
    }
    return Promise.resolve(obj)
  }
}
