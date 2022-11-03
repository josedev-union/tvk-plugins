import redis from 'redis'
import {logger} from '../instrumentation/logger'
import {env} from '../config/env'

export const redisFactory = new (class {
  newRedis(config = {}, overwriteConfig = false) {
    const finalConfig = overwriteConfig ? config : Object.assign({}, env.redis, config)
    const client = redis.createClient(finalConfig)
    client.on('error', (err) => {
      logger.error('Error on Redis', err)
      client.isOnline = false
    })
    client.on('ready', () => {
      client.isOnline = true
    })
    return client
  }

  newRedisPubsub(config = {}) {
    return this.newRedis(Object.assign({}, env.redisPubsub, config), true)
  }
})()
