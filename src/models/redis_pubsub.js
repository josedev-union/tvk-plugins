import redis from 'redis'

const config = {
  host: process.env.MIROWEB_REDIS_HOSTNAME,
  port: process.env.MIROWEB_REDIS_PORT,
  db: process.env.MIROWEB_REDIS_DB,
}

export function newRedis() {
  return redis.createClient(config)
}