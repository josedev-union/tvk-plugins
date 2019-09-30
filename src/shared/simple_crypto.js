import _sha1 from 'js-sha1'
import sha256 from 'js-sha256'

export function base64(str, params = {padding: true}) {
    var b64 = Buffer.from(str).toString('base64')
    return params.padding ? b64 : b64.replace(/=+/g, '')
}

export function sha1(str) {
    const s1 = _sha1.create()
    s1.update(str)
    return s1.hex()
}

export function hmac(str, pass) {
    const hmac = sha256.hmac.create(pass)
    hmac.update(str)
    return hmac.hex()
}

export function generic_uuid(size = 10) {
    const uuidChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.,!@#$%&*()+=[]{}/\\<>;:".split('')
    let uuid = ""
    for (let i = 0; i < size; i++) {
        uuid += uuidChars[Math.floor(Math.random()*uuidChars.length)]
    }
    return uuid
}