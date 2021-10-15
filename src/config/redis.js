import {redisFactory} from '../models/redisFactory'
import {promisify} from "util"

export const redis = redisFactory.newRedis()
export const buffersRedis = redisFactory.newRedis({return_buffers: true})
export const redisPubsub = redisFactory.newRedisPubsub()
export const clearRedis = promisify(redis.flushall).bind(redis)
