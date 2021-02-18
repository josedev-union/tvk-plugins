import {simpleCrypto} from '../shared/simpleCrypto'

export const security = new (class {
  sign(msg, key) {
    if (Array.isArray(msg)) msg = msg.join(':')
    if (Array.isArray(key)) key = key.join(':')
    return simpleCrypto.hmac(msg, key)
  }
})()
