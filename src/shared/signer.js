import {simpleCrypto} from "./simpleCrypto";

export const signer = new (class {
    sign (obj, key, apiKey) {
        const finalKey = key + apiKey
        const text = this.serialize(obj)
        return simpleCrypto.hmac(text, finalKey)
    }

    verify (obj, key, apiKey, signature) {
        return this.sign(obj, key, apiKey) === signature
    }

    serialize (obj) {
        if (typeof(obj) === 'string') return `"${obj}"`
        else if (typeof(obj) === 'number') return obj.toString()
        else if (Array.isArray(obj)) {
          return obj.map(v => this.serialize(v)).join(':')
        } else {
            let pairs = []
            for(let k in obj) {
                pairs.push([k.toString(), obj[k]])
            }
            pairs.sort((a,b) => a[0] > b[0] ? 1 : (a[0] == b[0] ? 0 : -1))
            let serialized = ''
            pairs.forEach(([k, v]) => serialized += `"${k}":${this.serialize(v)},`)
            return `{${serialized}}`
        }
    }
})()
