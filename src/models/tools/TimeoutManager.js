export class TimeoutManager {
  constructor({externalTimedout=() => false, onTimeout=() => null}) {
    this.timedout = false
    this.externalTimedout = externalTimedout
    this.blownTimeout = false
    this.onTimeout = onTimeout
  }

  async exec(behavior, timeoutSecs) {
    let result = undefined
    let err = undefined
    let timeoutId = null
    await Promise.race([
      new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          this.timedout = true
          resolve()
        }, timeoutSecs*1000)
      }),
      new Promise((resolve, reject) => {
        try {
          behavior()
          .then(r => {
            result = r
            resolve()
          })
          .catch(e => {
            err = e
            resolve()
          })
        } catch (e) {
          err = e
          resolve()
        }
      }),
    ])
    if (timeoutId !== null) clearTimeout(timeoutId)

    if (this.blownTimeout) return result
    if (this.hasTimedout()) {
      this.blownTimeout = true
      this.onTimeout()
      throw 'Timeout: Behavior took too long'
    }
    if (err) throw err
    else return result
  }

  hasTimedout() {
    return this.blownTimeout || this.timedout || this.externalTimedout()
  }
}
