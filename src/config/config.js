import {Database} from '../models/database/Database'
import Handlebars from 'hbs'
import {i18n} from '../shared/i18n'
import {env} from './env'
import admin from 'firebase-admin'

Handlebars.registerHelper('i18n', key => i18n(key))

for (const {name, config} of env.firebaseProjects) {
  setupProject({
    app: admin.initializeApp(config, name),
    name,
  })
}

function setupProject(databaseConfig) {
  const database = Database.build(databaseConfig)
  Database.setInstance({database})
}
