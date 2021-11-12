import {simpleCrypto} from "./simpleCrypto";
import {envShared} from "./envShared";

const TIME_SLICE = 30

export const otp = new (class {
  create(epochTime, secret) {
    const timeCounter = this.#counterFor(epochTime)
    return this.#tokenFor(timeCounter, secret)
  }

  verify(token, epochTime, secret) {
    const timeCounter = this.#counterFor(epochTime)
    const currentToken = this.#tokenFor(timeCounter, secret)
    const previousToken = this.#tokenFor(timeCounter-1, secret)
    return token === currentToken || token === previousToken
  }

  #tokenFor(timeCounter, secret) {
    return simpleCrypto.hmac(simpleCrypto.sha1(`&&%%95${timeCounter}23**@`), secret)
  }

  #counterFor(epochTimeSecs) {
    return Math.round(epochTimeSecs) % TIME_SLICE
  }
})()
