export const envShared = new (class {
    signatureHeaderName = 'DENTRINO-ID'
    apiSecretToken = process.env.DENTRINO_API_SECRET_TOKEN
})()
