import {redisFactory} from '../models/redisFactory'
import {promisify} from "util"
import {logger} from '../instrumentation/logger'

export const redis = redisFactory.newRedis()
export const buffersRedis = redisFactory.newRedis({return_buffers: true})
export const redisPubsub = redisFactory.newRedisPubsub()
export const clearRedis = promisify(redis.flushall).bind(redis)

export const quitRedis = promisify(redis.quit).bind(redis)
export const quitBuffersRedis = promisify(buffersRedis.quit).bind(buffersRedis)
export const quitRedisPubsub = promisify(redisPubsub.quit).bind(redisPubsub)

const allSubscribers = {}
export function redisSubscribe(channel) {
  if (!allSubscribers[channel]) allSubscribers[channel] = []
  return new Promise((resolve, reject) => {
    try {
      const subscriber = redisPubsub.duplicate()
      allSubscribers[channel].push(subscriber)
      subscriber.on('message', (channel, message) => {
        logger.verbose(`MESSAGE RECEIVED ${message}`)
        subscriber.unsubscribe()
        subscriber.quit()
        resolve(message)
      })
      subscriber.on('error', (error) => {
        //logger.verbose('Unhandled redis error', err)
        reject(error)
      })
      subscriber.subscribe(channel)
    } catch (error) {
      reject(error)
    }
  })
}

export function redisUnsubscribeAll({channel}) {
  if (channel) {
    const subscribers = allSubscribers[channel]
    if (subscribers) {
      subscribers.forEach(subscriber => {
        subscriber.unsubscribe()
        subscriber.quit()
      })
      delete allSubscribers[channel]
    }
  } else {
    Object.keys(allSubscribers).forEach(channel => redisUnsubscribeAll({channel}))
  }
}
