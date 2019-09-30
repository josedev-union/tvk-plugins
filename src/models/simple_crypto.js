import crypto from 'crypto'

export function base64(str, params = {padding: true}) {
    var b64 = Buffer.from(str).toString('base64')
    return params.padding ? b64 : b64.replace(/=+/g, '')
}

export function sha1(str) {
    const sha1 = crypto.createHash('sha1')
    sha1.update(str)
    return sha1.digest('hex')
}

export function hmac(str, pass) {
    const hmac = crypto.createHmac('sha256', pass)
    hmac.update(str)
    return hmac.digest('hex')
}

export function generic_uuid(size = 10) {
    const uuidChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.,!@#$%&*()+=[]{}/\\<>;:".split('')
    let uuid = ""
    for (let i = 0; i < size; i++) {
        uuid += uuidChars[Math.floor(Math.random()*uuidChars.length)]
    }
    return uuid
}