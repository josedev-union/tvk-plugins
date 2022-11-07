const FALSE_STRINGS = ['', 'false', 'undefined', 'null', '0', 'no', '-1']

export const env = new (class {
  name = process.env.NODE_ENV || 'development'
  gcloudBucket = process.env.DENTRINO_GCLOUD_BUCKET || 'dentrino-test.appspot.com'
  port = normalizePort(process.env.PORT || '3000')
  host = process.env.HOST || '0.0.0.0'
  masterHost = process.env.MASTER_HOST
  rateLimitDisabled = parseBool(process.env.DENTRINO_RATE_LIMIT_DISABLED)
  rateLimitIgnore = parseBool(process.env.DENTRINO_RATE_LIMIT_IGNORE)
  recaptchaIgnore = parseBool(process.env.DENTRINO_RECAPTCHA_IGNORE)
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
  apiResponsesWithAllDebugData = parseBool(process.env.DENTRINO_API_RESPONSES_WITH_ALL_DEBUG_DATA)
  quickApiRouteTimeout = parseFloat(process.env.DENTRINO_QAPI_ROUTE_TIMEOUT || 60)
  quickApiInputUploadTimeout = parseFloat(process.env.DENTRINO_QAPI_INPUT_UPLOAD_TIMEOUT || 15)
  quickApiSimulationTimeout = parseFloat(process.env.DENTRINO_QAPI_SIMULATION_TIMEOUT || 15)
  quickApiRecaptchaTimeout = parseFloat(process.env.DENTRINO_QAPI_RECAPTCHA_TIMEOUT || 15)
  quickApiResultsUploadTimeout = parseFloat(process.env.DENTRINO_QAPI_RESULTS_UPLOAD_TIMEOUT || 15)
  quickApiMaxUploadSizeMb = process.env.DENTRINO_QAPI_MAX_UPLOAD_SIZE_MB || 15
  quickApiMaxUploadSizeBytes = this.quickApiMaxUploadSizeMb * 1024 * 1024


  // Rate limiting timeWindow
  quickApiRateLimit_timeWindowSeconds = parseFloat(process.env.DENTRINO_QAPI_RLIMIT_TIME_WINDOW_SECONDS || 10)
  // Client rate limiting
  quickApiRateLimit_clientSimulationsPerSecond = parseFloat(process.env.DENTRINO_QAPI_RLIMIT_CLIENT_SIMULATIONS_PER_SECOND || 6.0)
  quickApiRateLimit_clientRequestsPerSecond = parseFloat(process.env.DENTRINO_QAPI_RLIMIT_CLIENT_REQUESTS_PER_SECOND || 25.0)

  // IP rate limiting
  quickApiRateLimit_ipSimulationsPerSecond = parseFloat(process.env.DENTRINO_QAPI_RLIMIT_IP_SIMULATIONS_PER_SECOND || 1.0/3.0)
  quickApiRateLimit_ipRequestsPerSecond = parseFloat(process.env.DENTRINO_QAPI_RLIMIT_IP_REQUESTS_PER_SECOND || 1.0)

  // On timeWindow amount
  quickApiRateLimit_clientSimulationsPerTimeWindow = this.quickApiRateLimit_clientSimulationsPerSecond * this.quickApiRateLimit_timeWindowSeconds
  quickApiRateLimit_clientRequestsPerTimeWindow = this.quickApiRateLimit_clientRequestsPerSecond * this.quickApiRateLimit_timeWindowSeconds
  quickApiRateLimit_ipSimulationsPerTimeWindow = this.quickApiRateLimit_ipSimulationsPerSecond * this.quickApiRateLimit_timeWindowSeconds
  quickApiRateLimit_ipRequestsPerTimeWindow = this.quickApiRateLimit_ipRequestsPerSecond * this.quickApiRateLimit_timeWindowSeconds

  supportedImagesStr = process.env.DENTRINO_SUPPORTED_IMAGES || 'jpg,jpeg,png,heic,heif,avif'
  supportedImagesFilepathRegex = toFilepathRegex(this.supportedImagesStr)

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
  instSimPoisson = parseBool(process.env.DENTRINO_INSTSIM_POISSON)
  instSimGiveUpStartTimeout = this.instSimRouteTimeout - this.instSimEstimatedDuration
  instSimRouter = parseBool(process.env.DENTRINO_INSTSIM_ROUTER)
  instSimTokenDisabled = parseBool(process.env.DENTRINO_INSTSIM_TOKEN_DISABLED)
  instSimRecaptchaSecretKey = process.env.DENTRINO_INSTSIM_RECAPTCHA_SECRET_KEY
  disableXForwardedForCheck = parseBool(process.env.DENTRINO_INSTSIM_DISABLE_X_FORWARDED_FOR_CHECK)

  isProduction = () => this.name === 'production'
  isStaging = () => this.name === 'staging'
  isTest = () => this.name === 'test'
  isDevelopment = () => this.name === 'development'
  isLocal = () => this.isTest() || this.isDevelopment()
  isNonLocal = () => !this.isLocal()
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

function parseBool(val) {
  if (!val) return false
  val = String(val).trim().toLowerCase()
  if (!val || FALSE_STRINGS.includes(val)) return false
  return true
}

function toFilepathRegex(str) {
  if (typeof(str) !== 'string') return str
  str = str.replaceAll(/,/g, '|').replaceAll(/\s/g, '')
  return new RegExp(`^(.*\\.)?(?<ext>${str})$`, 'i')
}
