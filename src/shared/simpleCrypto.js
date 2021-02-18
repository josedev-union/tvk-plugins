import _sha1 from 'js-sha1'
import sha256 from 'js-sha256'

export const simpleCrypto = new (class {
    base64(str, params = {padding: true}) {
        var b64 = Buffer.from(str).toString('base64')
        return params.padding ? b64 : b64.replace(/=+/g, '')
    }

    base64Decode(str) {
        return Buffer.from(str, 'base64').toString()
    }

    sha1(str) {
        const s1 = _sha1.create()
        s1.update(str)
        return s1.hex()
    }

    hmac(str, pass) {
        const hmac = sha256.hmac.create(pass)
        hmac.update(str)
        return hmac.hex()
    }

    genericUUID(size = 10) {
        const uuidChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.,!@#$%&*()+=[]{}/\\<>;:".split('')
        let uuid = ""
        for (let i = 0; i < size; i++) {
            uuid += uuidChars[Math.floor(Math.random()*uuidChars.length)]
        }
        return uuid
    }
})()
