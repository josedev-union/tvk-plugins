import {v4 as uuid} from 'uuid'
import {simpleCrypto} from '../../shared/simpleCrypto'
import {getNowInMillis} from '../../utils/time'

const MAX_TIMESTAMP = 9999999999999

export const idGenerator = new (class {
    newOrderedId({uuidSize = 8} = {}) {
        const reverseTimestamp = MAX_TIMESTAMP - getNowInMillis()
        return simpleCrypto.urlSafeBase64(`${reverseTimestamp}${simpleCrypto.genericUUID(uuidSize)}`, {padding: false})
    }

    newSecret() {
        return simpleCrypto.newSecret()
    }
})()
