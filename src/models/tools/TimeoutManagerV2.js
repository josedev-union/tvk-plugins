import {getNowInSecs} from '../../utils/time'

export class TimeoutManager {
  constructor({onTimeout, onBlow}={}) {
    this.timedout = false
    this.expiredTimeout = null
    this.timeouts = {}
    this.onBlowCb = onBlow || ((data) => {
      throw new Error(`Timeout: Operation took too long timeoutId:${data.id}`)
    })
    this.callbacks = []
    this.onTimeout(onTimeout)
  }

  async exec(timeoutSecs, operation, {id, onTimeout, onBlow, extraData}={}) {
    if (this.hasTimedout()) {
      this.#asPromise(onTimeout)
      return await this.blowIfTimedout()
    }
    id = this.start(timeoutSecs, {id, onTimeout, onBlow, extraData})
    const result = await Promise.race([
      this.#asPromise(operation),
      this.#blowOnTimeout({onBlow, extraData})
    ])
    this.clear(id)
    await this.blowIfTimedout()
    return result
  }

  start(timeoutSecs, {id, onTimeout, onBlow, extraData}={}) {
    if (this.hasTimedout()) {
      this.#asPromise(onTimeout)
      return
    }
    const nowSecs = getNowInSecs()
    const timeoutObj = {
      onBlowCb: onBlow,
      extraData: extraData || {},
      startedAt: nowSecs,
      duration: timeoutSecs,
    }
    const clearId = setTimeout(async () => {
      if (!this || this.timedout) return
      this.timedout = true
      this.expiredTimeout = timeoutObj
      this.clearAll()
      await Promise.all([
        this.#asPromise(onTimeout),
        this.#callCallbacks(),
      ])
    }, timeoutSecs * 1000.0)

    if (!id) id = clearId
    Object.assign(timeoutObj, {
      id,
      clearId,
    })
    this.timeouts[id] = timeoutObj
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
      const timeout = this.expiredTimeout
      this.clearAll()
      return (timeout.onBlowCb || this.onBlowCb)(timeout)
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
