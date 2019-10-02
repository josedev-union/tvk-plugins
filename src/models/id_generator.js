import uuid from 'uuid/v4'
import {sha1, generic_uuid, base64, hmac} from '../shared/simple_crypto'

const MAX_TIMESTAMP = 9999999999999

export function newOrderedId() {
    const reverseTimestamp = MAX_TIMESTAMP - new Date().getTime()
    return base64(`${reverseTimestamp}${generic_uuid(8)}`, {padding: false})
}

export function newSecret(key = 'dfbd7ac2509df92476f23be475606c8f080872f5') {
    return base64(hmac(base64(generic_uuid(10)), key), {padding: false})
}