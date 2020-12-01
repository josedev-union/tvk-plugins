import {simpleCrypto} from "./simpleCrypto";
import {envShared} from "./envShared";

export const signer = new (class {
    sign (obj, key) {
        const text = this.serialize(obj)
        const pass = this.serialize(key)
        return simpleCrypto.hmac(text, pass)
    }

    verify (obj, key, signature) {
        return this.sign(obj, key) === signature
    }

    apiSign(obj, secret) {
        return this.sign(obj, [secret, envShared.apiSecretToken])
    }

    apiVerify(obj, secret, signature) {
        return this.verify(obj, [secret, envShared.apiSecretToken], signature)
    }

    serialize (obj) {
        if (typeof(obj) === 'string') return obj
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
