import uuid from 'uuid/v4'
import {simpleCrypto} from '../../shared/simpleCrypto'

const MAX_TIMESTAMP = 9999999999999

export const idGenerator = new (class {
    newOrderedId() {
        const reverseTimestamp = MAX_TIMESTAMP - new Date().getTime()
        return simpleCrypto.base64(`${reverseTimestamp}${simpleCrypto.genericUUID(8)}`, {padding: false})
    }

    newSecret(key = 'dfbd7ac2509df92476f23be475606c8f080872f5') {
        return simpleCrypto.base64(simpleCrypto.hmac(simpleCrypto.base64(simpleCrypto.genericUUID(10)), key), {padding: false})
    }
})()