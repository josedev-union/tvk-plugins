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

    async add(solicitation) {
        if (env.rateLimitDisabled) return true
        const originCode = simpleCrypto.base64(solicitation.origin, {padding: false})
        const ipCode = simpleCrypto.base64(solicitation.ip, {padding: false})
        const emailCode = simpleCrypto.base64(solicitation.email, {padding: false})
        const ipPath = [NAMESPACE, 'ips', originCode, ipCode].join(':')
        const emailPath = [NAMESPACE, 'emails', originCode, emailCode].join(':')
        const [allowedByIp, allowedByEmail] = await Promise.all([
            this.#haveAvailableSlotsOn(ipPath),
            this.#haveAvailableSlotsOn(emailPath),
        ])
        const allowed = allowedByIp && allowedByEmail
        if (allowed) {
            this.#addSlot(ipPath, solicitation.id)
            this.#addSlot(emailPath, solicitation.id)
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
