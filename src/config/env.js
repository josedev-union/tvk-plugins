export const env = new (class {
  name = process.env.NODE_ENV || 'development'
  gcloudBucket = process.env.DENTRINO_GCLOUD_BUCKET
  port = normalizePort(process.env.PORT || '3000')
  host = process.env.HOST || '0.0.0.0'
  masterHost = process.env.MASTER_HOST
  rateLimitDisabled = process.env.DENTRINO_RATE_LIMIT_DISABLED
  rateLimitIgnore = process.env.DENTRINO_RATE_LIMIT_IGNORE
  sentryDsn = process.env.SENTRY_DSN
  logLevel = process.env.DENTRINO_LOG_LEVEL
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
  quickApiRouteTimeout = parseFloat(process.env.DENTRINO_QAPI_ROUTE_TIMEOUT || 60)
  quickApiInputUploadTimeout = parseFloat(process.env.DENTRINO_QAPI_INPUT_UPLOAD_TIMEOUT || 15)
  quickApiSimulationTimeout = parseFloat(process.env.DENTRINO_QAPI_SIMULATION_TIMEOUT || 15)
  quickApiRecaptchaTimeout = parseFloat(process.env.DENTRINO_QAPI_RECAPTCHA_TIMEOUT || 15)
  quickApiResultsUploadTimeout = parseFloat(process.env.DENTRINO_QAPI_RESULTS_UPLOAD_TIMEOUT || 15)
  quickApiMaxUploadSizeMb = process.env.DENTRINO_QAPI_MAX_UPLOAD_SIZE_MB || 15
  quickApiMaxUploadSizeBytes = this.quickApiMaxUploadSizeMb * 1024 * 1024
  instSimIpRateLimitMinutely = {
    amount:     parseFloat(process.env.DENTRINO_INSTSIM_IP_RATE_LIMIT_MINUTELY_AMOUNT || 3),
    timeWindow: parseFloat(1 * 60 * 1000),
  }
  instSimIpRateLimitHourly = {
    amount:     parseFloat(process.env.DENTRINO_INSTSIM_IP_RATE_LIMIT_HOURLY_AMOUNT || 5),
    timeWindow: parseFloat(1 * 60 * 60 * 1000),
  }
  instSimIpRateLimitDaily = {
    amount:     parseFloat(process.env.DENTRINO_INSTSIM_IP_RATE_LIMIT_DAILY_AMOUNT || 20),
    timeWindow: parseFloat(24 * 60 * 60 * 1000),
  }
  instSimUploadTimeout = parseFloat(process.env.DENTRINO_INSTSIM_UPLOAD_TIMEOUT || 15)
  instSimRouteTimeout = parseFloat(process.env.DENTRINO_INSTSIM_ROUTE_TIMEOUT || 60)
  instSimEstimatedDuration = parseFloat(process.env.DENTRINO_INSTSIM_ESTIMATED_DURATION || 5)
  instSimMixFactor = parseFloat(process.env.DENTRINO_INSTSIM_MIX_FACTOR || 0.1)
  instSimBrightness = parseFloat(process.env.DENTRINO_INSTSIM_BRIGHTNESS || 1.0)
  instSimWhiten = parseFloat(process.env.DENTRINO_INSTSIM_WHITEN || 0.3)
  instSimPoisson = !!process.env.DENTRINO_INSTSIM_POISSON
  instSimGiveUpStartTimeout = this.instSimRouteTimeout - this.instSimEstimatedDuration
  instSimRouter = !!process.env.DENTRINO_INSTSIM_ROUTER
  instSimTokenDisabled = !!process.env.DENTRINO_INSTSIM_TOKEN_DISABLED
  instSimRecaptchaSecretKey = process.env.DENTRINO_INSTSIM_RECAPTCHA_SECRET_KEY
  disableXForwardedForCheck = process.env.DENTRINO_INSTSIM_DISABLE_X_FORWARDED_FOR_CHECK

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
