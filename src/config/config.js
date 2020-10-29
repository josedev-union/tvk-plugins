import mail from '@sendgrid/mail'
import {Database} from '../models/database/Database'
import Handlebars from 'hbs'
import {i18n} from '../shared/i18n'
import {env} from './env'
import * as Sentry from '@sentry/node'

Handlebars.registerHelper('i18n', key => i18n(key))

mail.setApiKey(env.sendgridKey)

let app
if (env.isTest()) {
    const admin = require('@firebase/testing')
    app = admin.initializeAdminApp({
      databaseName: 'miroweb-test-db',
      databaseURL: 'http://localhost:9000',
      projectId: 'dentrino-test-us'
    })
} else {
    if (env.isNonLocal()) Sentry.init({ dsn: env.sentryDsn, env: env.name });
    const admin = require('firebase-admin')
    const appConfig = {}
    if (env.firebaseCredentials) {
      appConfig.credential = admin.credential.cert(env.firebaseCredentials)
    }
    appConfig.databaseURL = env.firebaseDatabaseUrl || "http://localhost:9000"
    app = admin.initializeApp(appConfig)
}
const defaultDatabase = Database.build(app.firestore())
const mirosmilesDatabase = Database.build(app.database(), 'app_data')
Database.setInstance(defaultDatabase)
Database.setInstance(mirosmilesDatabase, 'mirosmiles')
