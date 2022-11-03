import {Database} from '../models/database/Database'
import Handlebars from 'hbs'
import {i18n} from '../shared/i18n'
import {env} from './env'
import admin from 'firebase-admin'

Handlebars.registerHelper('i18n', key => i18n(key))

const appConfig = {}
const app = admin.initializeApp(appConfig)
const defaultDatabase = Database.build(app.firestore())
Database.setInstance(defaultDatabase)
