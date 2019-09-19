import uuid from 'uuid/v4'
import crypto from 'crypto'

export function newId() {
    return sha1(uuid())
}

export function newSecret(key = 'dfbd7ac2509df92476f23be475606c8f080872f5') {
    return base64(hmac(base64(manuuid(10)), key)).replace(/=+/g, '')
}

function base64(str) {
    return Buffer.from(str).toString('base64')
}

function sha1(str) {
    const sha1 = crypto.createHash('sha1')
    sha1.update(str)
    return sha1.digest('hex')
}

function hmac(str, pass) {
    const hmac = crypto.createHmac('sha256', pass)
    hmac.update(str)
    return hmac.digest('hex')
}

function manuuid(size = 10) {
    const uuidChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.,!@#$%&*()+=[]{}/\\<>;:".split('')
    let uuid = ""
    for (let i = 0; i < size; i++) {
        uuid += uuidChars[Math.floor(Math.random()*uuidChars.length)]
    }
    return uuid
}