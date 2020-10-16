import redis from 'redis'
import {logger} from '../instrumentation/logger'
import {env} from '../config/env'

export const redisPubsub = new (class {
  newRedis() {
    let client = redis.createClient(env.redis)
    client.on('error', (err) => {
      logger.error('Error on Redis', err)
      client.isOnline = false
    })
    client.on('ready', () => {
      client.isOnline = true
    })
    return client
  }
})()