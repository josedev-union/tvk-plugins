const WAIT_SLEEP_DELAY = 100
export const helpers = new (class {
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async waitUntil(condition, {timeout=0}={}) {
    let timePast = 0
    while (!condition()) {
      await this.sleep(WAIT_SLEEP_DELAY)
      timePast += WAIT_SLEEP_DELAY
      if (timeout > 0 && timePast >= timeout) {
        return false
      }
    }
    return true
  }

  async waitWhile(condition, {timeout=0}={}) {
    const result = await waitUntil(() => !condition(), {timeout})
    return result
  }
})()
