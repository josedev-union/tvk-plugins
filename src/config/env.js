export const env = new (class {
  name = process.env.NODE_ENV || 'development'
  gcloudBucket = process.env.DENTRINO_GCLOUD_BUCKET
  port = normalizePort(process.env.PORT || '3000')
  host = process.env.HOST || '0.0.0.0'
  masterHost = process.env.MASTER_HOST 
  sendgridKey = process.env.SENDGRID_API_KEY
  rateLimitDisabled = process.env.DENTRINO_RATE_LIMIT_DISABLED
  mailerDisabled = process.env.DENTRINO_MAILER_DISABLED || true
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
