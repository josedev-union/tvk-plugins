import {redisFactory} from '../models/redisFactory'
import {promisify} from "util"
import {logger} from '../instrumentation/logger'

export const redis = redisFactory.newRedis()
export const buffersRedis = redisFactory.newRedis({return_buffers: true})
export const redisPubsub = redisFactory.newRedisPubsub()
export const clearRedis = promisify(redis.flushall).bind(redis)
export function redisSubscribe(channel) {
  return new Promise((resolve, reject) => {
    try {
      const subscriber = redisPubsub.duplicate()
      subscriber.on('message', (channel, message) => {
        logger.info(`MESSAGE RECEIVED ${message}`)
        subscriber.unsubscribe()
        subscriber.quit()
        resolve(message)
      })
      subscriber.subscribe(channel)
    } catch (error) {
      reject(error)
    }
  })
}
