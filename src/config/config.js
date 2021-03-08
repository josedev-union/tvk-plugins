import {Database} from '../models/database/Database'
import Handlebars from 'hbs'
import {i18n} from '../shared/i18n'
import {env} from './env'

Handlebars.registerHelper('i18n', key => i18n(key))

let app
if (env.isTest()) {
    const admin = require('@firebase/testing')
    app = admin.initializeAdminApp({
      projectId: 'dentrino-test-us'
    })
} else {
    const admin = require('firebase-admin')
    const appConfig = {}
    app = admin.initializeApp(appConfig)
}
const defaultDatabase = Database.build(app.firestore())
Database.setInstance(defaultDatabase)
