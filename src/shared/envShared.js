export const envShared = new (class {
    signatureHeaderName = 'Authorization'
    deviceIdHeaderName = 'X-DEVICE-ID'
    apiSecretToken = process.env.DENTRINO_API_SECRET_TOKEN || "test-api-secret"
})()
