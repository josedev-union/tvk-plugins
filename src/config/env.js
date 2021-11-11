export const env = new (class {
  name = process.env.NODE_ENV || 'development'
  gcloudBucket = process.env.DENTRINO_GCLOUD_BUCKET
  port = normalizePort(process.env.PORT || '3000')
  host = process.env.HOST || '0.0.0.0'
  masterHost = process.env.MASTER_HOST 
  rateLimitDisabled = process.env.DENTRINO_RATE_LIMIT_DISABLED
  sentryDsn = process.env.SENTRY_DSN
  redis = {
      host: process.env.DENTRINO_REDIS_HOSTNAME,
      port: process.env.DENTRINO_REDIS_PORT,
      db: process.env.DENTRINO_REDIS_DB,
  }
  redisPubsub = {
      host: process.env.DENTRINO_REDIS_HOSTNAME,
      port: process.env.DENTRINO_REDIS_PORT,
      db: process.env.DENTRINO_REDIS_PUBSUB_DB,
  }
  maxUploadSizeMb = process.env.DENTRINO_MAX_UPLOAD_SIZE_MB || 15
  maxUploadSizeBytes = this.maxUploadSizeMb * 1024 * 1024
  userRateLimit = {
    amount:     parseFloat(process.env.DENTRINO_USER_RATE_LIMIT_AMOUNT || 5),
    timeWindow: parseFloat(process.env.DENTRINO_USER_RATE_LIMIT_TIME || 1 * 60 * 1000),
  }
  ipRateLimit = {
    amount:     parseFloat(process.env.DENTRINO_IP_RATE_LIMIT_AMOUNT || 20),
    timeWindow: parseFloat(process.env.DENTRINO_IP_RATE_LIMIT_TIME || 1 * 60 * 60 * 1000),
  }
  clientRateLimit = {
    amount:     parseFloat(process.env.DENTRINO_CLIENT_RATE_LIMIT_AMOUNT || 100),
    timeWindow: parseFloat(process.env.DENTRINO_CLIENT_RATE_LIMIT_TIME || 1 * 60 * 1000),
  }
  instSimRouteTimeout = parseFloat(process.env.DENTRINO_INSTSIM_ROUTE_TIMEOUT || 60)
  instSimEstimatedDuration = parseFloat(process.env.DENTRINO_INSTSIM_ESTIMATED_DURATION || 5)
  instSimGiveUpStartTimeout = this.instSimRouteTimeout - this.instSimEstimatedDuration

  isProduction() { return this.name === 'production' }
  isStaging() { return this.name === 'staging' }
  isTest() { return this.name === 'test' }
  isDevelopment() { return this.name === 'development' }
  isLocal() { return this.isTest() || this.isDevelopment() }
  isNonLocal() { return !this.isLocal() }
})()

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
