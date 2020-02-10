import redis from 'redis'
import logger from '../models/logger'

const config = {
  host: process.env.MIROWEB_REDIS_HOSTNAME,
  port: process.env.MIROWEB_REDIS_PORT,
  db: process.env.MIROWEB_REDIS_DB,
}

export function newRedis() {
  let client = redis.createClient(config)
  client.on('error', (err) => {
    logger.error('Error on Redis', err)
    client.isOnline = false
  })
  client.on('ready', () => {
    client.isOnline = true
  })
  return client
}
