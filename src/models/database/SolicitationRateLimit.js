import {Database} from "./Database"
import {simpleCrypto} from "../../shared/simpleCrypto"
import {logger} from '../../instrumentation/logger'
import {env} from "../../config/env"
import {redis} from "../../config/redis"
import {promisify} from "util"

const zcountAsync = promisify(redis.zcount).bind(redis)

const NAMESPACE = 'solicitation_rate_limit'
export class SolicitationRateLimit {
    constructor({limit, expiresIn}) {
        this.limit = limit
        this.expiresIn = expiresIn
    }

    static build() {
        return new SolicitationRateLimit({
            limit: 5,
            expiresIn: 24 * 60 * 60 * 1000 // milliseconds
        })
    }

    async addPatientSlots(solicitation) {
        if (env.rateLimitDisabled) return true
        const originCode = simpleCrypto.base64(solicitation.requester.info.origin, {padding: false})
        var ipKey = this.#buildKey(`ips:{originCode}`, solicitation.requester.info.ip)
        var emailKey = this.#buildKey(`emails:{originCode}`, solicitation.requester.info.email)
        return this.#addKeys([ipKey, emailKey])
    }

    async addDentistSlots(solicitation) {
        if (env.rateLimitDisabled) return true
        const accessPointKey = this.#buildKey('access-points', solicitation.accessPointId)
        return this.#addKeys([accessPointKey])
    }

    #buildKey(keyCategory, keyIdBase) {
        const keyId = simpleCrypto.base64(keyIdBase, {padding: false})
        return [NAMESPACE, keyCategory, keyId].join(':')
    }

    async #addKeys(keys) {
        const results = await Promise.all(keys.map(key => this.#haveAvailableSlotsOn(key)))
        const allowed = !results.includes(false)
        if (allowed) {
            keys.forEach(key => this.#addSlot(key, solicitation.id))
        }
        return allowed
    }

    async #haveAvailableSlotsOn(zsetkey) {
      const usedSlotsCount = await zcountAsync(zsetkey, nowMillis()-this.expiresIn, '+inf')
      return usedSlotsCount < this.limit
    }

    async #addSlot(zsetkey, token) {
      redis.zadd(zsetkey, nowMillis(), token)
      redis.pexpire(zsetkey, this.expiresIn)
    }
}

function nowMillis() {
    return new Date().getTime()
}
