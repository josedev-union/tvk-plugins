export class Timeout {
  constructor(timeout) {
    this.timeout = timeout
    this.canceled = false
    this.onexpiration = null
    this.restart()
  }

  restart() {
    if (this.canceled) return
    this.expired = false
    this.executed = false
    this.scheduleExpiration()
  }

  onExpiration(func) {
    if (this.canceled) return
    if (this.expired && !this.executed) {
      this.executed = true
      func()
    }
    if (!this.expired) {
      this.onexpiration = func
    }
  }

  scheduleExpiration() {
    if (this.timeoutid !== undefined) clearTimeout(this.timeoutid)
    this.timeoutid = setTimeout(() => {
      this.expires()
    }, this.timeout)
  }

  expires() {
    if (this.canceled) return;
    this.expired = true

    if (!this.executed && this.onexpiration) {
      this.executed = true
      this.onexpiration()
    }

    if (!this.executed) {
      this.scheduleExpiration()
    }
  }

  cancel() {
    this.canceled = true
    if (this.timeoutid !== undefined) clearTimeout(this.timeoutid)
  }
}