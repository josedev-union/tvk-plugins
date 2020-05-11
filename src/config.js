import AWS from 'aws-sdk'
import Database from '../src/models/database'
import Handlebars from 'hbs'
import i18n from './shared/lang'
import * as env from './models/env'
import * as Sentry from '@sentry/node'

Handlebars.registerHelper('i18n', key => i18n(key))

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_DEFAULT_REGION,
    signatureVersion: 'v4',
})

let app
if (env.isTest()) {
    const admin = require('@firebase/testing')
    app = admin.initializeAdminApp({databaseName: 'miroweb-test-db', databaseURL: 'http://localhost:9000'})
} else {
    Sentry.init({ dsn: process.env.SENTRY_DSN, env: env.name });
    const admin = require('firebase-admin')
    const appConfig = {}
    if (process.env.MIROWEB_GOOGLE_APPLICATION_CREDENTIALS) {
        const rawCredentials = JSON.parse(process.env.MIROWEB_GOOGLE_APPLICATION_CREDENTIALS)
        appConfig.credential = admin.credential.cert(rawCredentials)
    }
    appConfig.databaseURL = process.env.MIROWEB_FIREBASE_DATABASE_URL || "http://localhost:9000"
    app = admin.initializeApp(appConfig)
}
const defaultDatabase = Database.build(app.database())
const mirosmilesDatabase = Database.build(app.database(), 'app_data')
Database.setInstance(defaultDatabase)
Database.setInstance(mirosmilesDatabase, 'mirosmiles')
