export const envShared = new (class {
    signatureHeaderName = 'Authorization'
    deviceIdHeaderName = 'X-DEVICE-ID'
    apiSecretToken = process.env.DENTRINO_API_SECRET_TOKEN || "test-api-secret"
    maxUploadSizeMb = process.env.DENTRINO_MAX_UPLOAD_SIZE_MB || 15
    maxUploadSizeBytes = this.maxUploadSizeMb * 1024 * 1024
    instSimSecretToken = process.env.DENTRINO_INSTSIM_SECRET_TOKEN || "test-instsim-secret"
    instSimRecaptchaClientKey = process.env.DENTRINO_INSTSIM_RECAPTCHA_CLIENT_KEY
    instSimFirebaseApiKey = process.env.DENTRINO_INSTSIM_FIREBASE_API_KEY
    instSimFirebaseAuthDomain = process.env.DENTRINO_INSTSIM_FIREBASE_AUTH_DOMAIN
    instSimFirebaseProjectId = process.env.DENTRINO_INSTSIM_FIREBASE_PROJECT_ID
    instSimFirebaseStorageBucket = process.env.DENTRINO_INSTSIM_FIREBASE_STORAGE_BUCKET
    instSimFirebaseMessagingSenderId = process.env.DENTRINO_INSTSIM_FIREBASE_MESSAGING_SENDER_ID
    instSimFirebaseAppId = process.env.DENTRINO_INSTSIM_FIREBASE_APP_ID
    instSimFirebaseMeasurementId = process.env.DENTRINO_INSTSIM_FIREBASE_MEASUREMENT_ID
})()
