import redis from 'redis'

const config = {
  host: process.env.MIROWEB_REDIS_HOSTNAME,
  port: process.env.MIROWEB_REDIS_PORT,
  db: process.env.MIROWEB_REDIS_DB,
}

export function newRedis() {
  let client = redis.createClient(config)
  client.on('error', (err) => {
    console.error('[REDIS ERROR]', err)
    client.isOnline = false
  })
  client.on('ready', (x) => {
    console.log('[READY]', x)
    client.isOnline = true
  })
  return client
}
