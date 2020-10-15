export const name = process.env.NODE_ENV || 'development'
export const isProduction = () => name === 'production'
export const isStaging = () => name === 'staging'
export const isTest = () => name === 'test'
export const isDevelopment = () => name === 'development'
export const isLocal = () => isTest() || isDevelopment()
export const isNonLocal = () => !isLocal()
export const s3Bucket = process.env.MIROWEB_S3_BUCKET
export const gcloudBucket = process.env.MIROWEB_GCLOUD_BUCKET
export const gcloudCredentials = (process.env.MIROWEB_GOOGLE_APPLICATION_CREDENTIALS ? JSON.parse(process.env.MIROWEB_GOOGLE_APPLICATION_CREDENTIALS) : null)
