import uuid from 'uuid/v4'
import {sha1, generic_uuid, base64, hmac} from '../models/simple_crypto'

export function newId() {
    return sha1(uuid())
}

export function newSecret(key = 'dfbd7ac2509df92476f23be475606c8f080872f5') {
    return base64(hmac(base64(generic_uuid(10)), key), {padding: false})
}