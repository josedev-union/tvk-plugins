import {simpleCrypto} from "./simpleCrypto";

export const signer = new (class {
    sign (obj, key, apiKey) {
        let finalKey = simpleCrypto.sha1(key + apiKey)
        let text = simpleCrypto.base64(serialize(obj))
        return simpleCrypto.hmac(text, finalKey)
    }

    verify (obj, key, apiKey, signature) {
        return this.sign(obj, key, apiKey) === signature
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
