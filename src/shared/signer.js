import {simpleCrypto} from "./simpleCrypto";

export const signer = new (class {
    sign (obj, key) {
        return simpleCrypto.hmac(simpleCrypto.sha1(simpleCrypto.base64(serialize(obj))), key)
    }

    verify (obj, key, signature) {
        return this.sign(obj, key) === signature
    }
})()

function serialize(obj) {
    if (typeof(obj) === 'string') return `"${obj}"`
    else if (typeof(obj) === 'number') return obj.toString()
    else {
        let pairs = []
        for(let k in obj) {
            pairs.push([k.toString(), obj[k]])
        }
        pairs.sort((a,b) => a[0] > b[0] ? 1 : (a[0] == b[0] ? 0 : -1))
        let serialized = ''
        pairs.forEach(([k, v]) => serialized += `"${k}":${serialize(v)},`)
        return `{${serialized}}`
    }
}