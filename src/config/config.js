import {Database} from '../models/database/Database'
import Handlebars from 'hbs'
import {i18n} from '../shared/i18n'
import {env} from './env'
import admin from 'firebase-admin'

Handlebars.registerHelper('i18n', key => i18n(key))

let databaseURL = env.firestoreEmulatorDatabaseUrl
if (env.isTest() && !databaseURL) databaseURL = 'http://localhost:8080'

for (const {projectKey, projectId, credentialCfg} of Object.values(env.googleProjects)) {
  const config = {
    projectId: projectId || 'dentrino-local',
  }
  if (databaseURL) Object.assign(config, {databaseURL})
  if (credentialCfg) Object.assign(config, {credential: admin.credential.cert(credentialCfg)})
  setupProject({
    app: admin.initializeApp(config, projectKey),
    name: projectKey,
  })
}

function setupProject(databaseConfig) {
  const database = Database.build(databaseConfig)
  Database.setInstance({database})
}
