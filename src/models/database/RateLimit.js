import {logger} from '../../instrumentation/logger'
import {env} from "../../config/env"
import {redis} from "../../config/redis"
import {promisify} from "util"
import {v4 as uuid} from 'uuid'
import {getNowInMillis} from '../../utils/time'

const zcountAsync = promisify(redis.zcount).bind(redis)

const NAMESPACE = 'dent-rl'
export class RateLimit {
    constructor({limit, expiresIn}) {
        this.limit = limit
        this.expiresIn = expiresIn
    }

    async useSlotFrom(buckets, countNow=true) {
        if (env.rateLimitDisabled) return true
        if (typeof(buckets) === 'string') buckets = [buckets]
        const bucketKeys = buckets.map(bucket => this.#buildBucketKey(bucket))
        return this.#addSlotInBuckets(bucketKeys, countNow)
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

    async #addSlotInBuckets(bucketKeys, countNow=true) {
        const results = await Promise.all(bucketKeys.map(bucketKey => this.#haveAvailableSlotsIn(bucketKey)))
        const allowed = !results.includes(false)
        if (allowed && countNow) {
            bucketKeys.forEach(bucketKey => this.#addSlotIn(bucketKey))
        }
        return allowed
    }

    async #haveAvailableSlotsIn(bucketKey) {
      const usedSlotsCount = await zcountAsync(bucketKey, getNowInMillis()-this.expiresIn, '+inf')
      const isAvailable = usedSlotsCount < this.limit
      return env.rateLimitIgnore ? true : isAvailable
    }

    async #addSlotIn(bucketKey) {
      redis.zadd(bucketKey, getNowInMillis(), uuid())
      redis.pexpire(bucketKey, this.expiresIn)
    }
}
