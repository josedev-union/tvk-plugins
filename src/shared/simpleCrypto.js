import _sha1 from 'js-sha1'
import _sha256 from 'js-sha256'
import {v4 as uuid} from 'uuid'
import crypto from 'crypto'

const ENCRYPTED_ENCODING = 'base64'

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

    encrypt(contentBuffer, key) {
      try {
        if (typeof(contentBuffer) === 'string') {
          contentBuffer = Buffer.from(contentBuffer, 'utf8')
        }
        const iv = crypto.randomBytes(16)
        const salt = crypto.randomBytes(32)
        const secret = crypto.scryptSync(key, salt, 32)

        const cipher = crypto.createCipheriv("aes-256-cbc", secret, iv)
        const ciphered = Buffer.concat([cipher.update(contentBuffer), cipher.final()])
        const ivStr = iv.toString(ENCRYPTED_ENCODING)
        const saltStr = salt.toString(ENCRYPTED_ENCODING)
        const cipheredStr = ciphered.toString(ENCRYPTED_ENCODING)
        const encrypted = [cipheredStr, ivStr, saltStr].join(':')
        return encrypted
      } catch (err) {
        console.warn("Ignoring encryption error:", err)
        return null
      }
    }

    decrypt(encrypted, key) {
      let decrypted = null
      try {
        if (typeof(encrypted) !== 'string') {
          encrypted = encrypted.toString('utf8')
        }
        const [cipheredStr, ivStr, saltStr] = encrypted.split(':')
        const iv = Buffer.from(ivStr, ENCRYPTED_ENCODING)
        const salt = Buffer.from(saltStr, ENCRYPTED_ENCODING)
        const ciphered = Buffer.from(cipheredStr, ENCRYPTED_ENCODING)
        const secret = crypto.scryptSync(key, salt, 32)

        const decipher = crypto.createDecipheriv("aes-256-cbc", secret, iv)
        decrypted = Buffer.concat([decipher.update(ciphered), decipher.final()])
      } catch (err) {
        console.warn("Ignoring decryption error:", err)
      }
      return decrypted
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

    uuid() {
      return uuid()
    }

    newSecret() {
      const crypto256Token = crypto.randomBytes(32).toString('hex')
      const uuidToken = uuid()
      return this.hmac(crypto256Token, uuidToken)
    }
})()
