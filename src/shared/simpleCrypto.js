import _sha1 from 'js-sha1'
import _sha256 from 'js-sha256'
import uuid from 'uuid/v4'
import {promisify} from 'util'
import crypto from 'crypto'

const randomBytesAsync = promisify(crypto.randomBytes)

export const simpleCrypto = new (class {
    base64(str, params = {padding: true}) {
        var b64 = Buffer.from(str).toString('base64')
        return params.padding ? b64 : b64.replace(/=+$/g, '')
    }

    base64Decode(str) {
        return Buffer.from(str, 'base64').toString()
    }

    urlSafeBase64(str) {
      return encodeURIComponent(
        this.base64(str, {padding: false})
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
      )
    }

    urlSafeBase64Decode(str) {
      return this.base64Decode(
        decodeURIComponent(str)
          .replace(/-/g, '+')
          .replace(/_/g, '/')
      )
    }

    sha1(str) {
        const s1 = _sha1.create()
        s1.update(str)
        return s1.hex()
    }

    sha256(str) {
        const s256 = _sha256.create()
        s256.update(str)
        return s256.hex()
    }

    hmac(str, pass) {
        const hmac = _sha256.hmac.create(pass)
        hmac.update(str)
        return hmac.hex()
    }

    md5(str) {
        const m5 = crypto.createHash('md5')
        m5.update(str)
        return m5.digest('hex')
    }

    verifySignatureHmac(signature, str, pass) {
        return this.hmac(str, pass) == signature
    }

    genericUUID(size = 10) {
        const uuidChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.,!@#$%&*()+=[]{}/\\<>;:".split('')
        let uuid = ""
        for (let i = 0; i < size; i++) {
            uuid += uuidChars[Math.floor(Math.random()*uuidChars.length)]
        }
        return uuid
    }

    async newSecret(size = 32) {
      const crypto256Token = (await randomBytesAsync(size)).toString('hex')
      const uuidToken = uuid()
      return this.hmac(crypto256Token, uuidToken)
    }
})()
