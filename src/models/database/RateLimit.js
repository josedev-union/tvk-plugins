import {logger} from '../../instrumentation/logger'
import {env} from "../../config/env"
import {redis} from "../../config/redis"
import {promisify} from "util"
import {v4 as uuid} from 'uuid'

const zcountAsync = promisify(redis.zcount).bind(redis)

const NAMESPACE = 'dent-rl'
export class RateLimit {
    constructor({limit, expiresIn}) {
        this.limit = limit
        this.expiresIn = expiresIn
    }

    async useSlotFrom(buckets, noCount=false) {
        if (env.rateLimitDisabled) return true
        if (typeof(buckets) === 'string') buckets = [buckets]
        const bucketKeys = buckets.map(bucket => this.#buildBucketKey(bucket))
        return this.#addSlotInBuckets(bucketKeys, noCount)
    }

    async manualCountFor(buckets) {
        if (env.rateLimitDisabled) return true
        if (typeof(buckets) === 'string') buckets = [buckets]
        const bucketKeys = buckets.map(bucket => this.#buildBucketKey(bucket))
        bucketKeys.forEach(bucketKey => this.#addSlotIn(bucketKey))
    }

    #buildBucketKey(id) {
        return [NAMESPACE, id].join(':')
    }

    async #addSlotInBuckets(bucketKeys, noCount=false) {
        const results = await Promise.all(bucketKeys.map(bucketKey => this.#haveAvailableSlotsIn(bucketKey)))
        const allowed = !results.includes(false)
        if (allowed && !noCount) {
            bucketKeys.forEach(bucketKey => this.#addSlotIn(bucketKey))
        }
        return allowed
    }

    async #haveAvailableSlotsIn(bucketKey) {
      const usedSlotsCount = await zcountAsync(bucketKey, nowMillis()-this.expiresIn, '+inf')
      return usedSlotsCount < this.limit
    }

    async #addSlotIn(bucketKey) {
      redis.zadd(bucketKey, nowMillis(), uuid())
      redis.pexpire(bucketKey, this.expiresIn)
    }
}

function nowMillis() {
    return new Date().getTime()
}
