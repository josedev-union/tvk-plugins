import {redisFactory} from '../models/redisFactory'
import {promisify} from "util"

export const redis = redisFactory.newRedis()
export const clearRedis = promisify(redis.flushall).bind(redis)
