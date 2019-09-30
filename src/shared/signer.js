import { base64, hmac, sha1 } from "../models/simple_crypto";

export function sign(obj, key) {
    return hmac(sha1(base64(serialize(obj))), key)
}

export function verify(obj, key, signature) {
    return sign(obj, key) === signature
}

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