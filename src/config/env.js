export const env = new (class {
  name = process.env.NODE_ENV || 'development'
  s3Bucket = process.env.MIROWEB_S3_BUCKET
  gcloudBucket = process.env.DENTRINO_GCLOUD_BUCKET
  firebaseCredentials = getEnvJson(process.env.MIROWEB_GOOGLE_APPLICATION_CREDENTIALS)
  gcloudCredentials = getEnvJson(process.env.DENTRINO_GOOGLE_APPLICATION_CREDENTIALS)
  port = normalizePort(process.env.PORT || '3000')
  masterHost = process.env.MASTER_HOST
  sendgridKey = process.env.SENDGRID_API_KEY
  rateLimitDisabled = process.env.DENTRINO_RATE_LIMIT_DISABLED
  sentryDsn = process.env.SENTRY_DSN
  firebaseDatabaseUrl = process.env.MIROWEB_FIREBASE_DATABASE_URL
  redis = {
      host: process.env.DENTRINO_REDIS_HOSTNAME,
      port: process.env.DENTRINO_REDIS_PORT,
      db: process.env.DENTRINO_REDIS_DB,
  }
  aws = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_DEFAULT_REGION,
  }

  isProduction() { return this.name === 'production' }
  isStaging() { return this.name === 'staging' }
  isTest() { return this.name === 'test' }
  isDevelopment() { return this.name === 'development' }
  isLocal() { return this.isTest() || this.isDevelopment() }
  isNonLocal() { return !this.isLocal() }
})()

function getEnvJson(envValue) {
    return (envValue ? JSON.parse(envValue) : null)
}

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