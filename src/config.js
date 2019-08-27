import AWS from 'aws-sdk'

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_DEFAULT_REGION,
    signatureVersion: 'v4',
})

import admin from 'firebase-admin'
const rawCredentials = JSON.parse(process.env.MIROWEB_GOOGLE_APPLICATION_CREDENTIALS)
admin.initializeApp({
    credential: admin.credential.cert(rawCredentials),
    databaseURL: process.env.MIROWEB_FIREBASE_DATABASE_URL
})