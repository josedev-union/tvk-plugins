import uuid from 'uuid/v4'
import {simpleCrypto} from '../../shared/simpleCrypto'
import {getNowInMillis} from '../../utils/time'

const MAX_TIMESTAMP = 9999999999999

export const idGenerator = new (class {
    newOrderedId({uuidSize = 8} = {}) {
        const reverseTimestamp = MAX_TIMESTAMP - getNowInMillis()
        return simpleCrypto.base64(`${reverseTimestamp}${simpleCrypto.genericUUID(uuidSize)}`, {padding: false})
    }

    newSecret(key = 'dfbd7ac2509df92476f23be475606c8f080872f5') {
        return simpleCrypto.base64(simpleCrypto.hmac(simpleCrypto.base64(simpleCrypto.genericUUID(10)), key), {padding: false})
    }
})()
