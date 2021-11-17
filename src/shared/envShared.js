export const envShared = new (class {
    signatureHeaderName = 'Authorization'
    deviceIdHeaderName = 'X-DEVICE-ID'
    apiSecretToken = process.env.DENTRINO_API_SECRET_TOKEN || "test-api-secret"
    maxUploadSizeMb = process.env.DENTRINO_MAX_UPLOAD_SIZE_MB || 15
    maxUploadSizeBytes = this.maxUploadSizeMb * 1024 * 1024
    instSimSecretToken = process.env.DENTRINO_INSTSIM_SECRET_TOKEN || "test-instsim-secret"
    instSimRecaptchaClientKey = process.env.DENTRINO_INSTSIM_RECAPTCHA_CLIENT_KEY
})()
