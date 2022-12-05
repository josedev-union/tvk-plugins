import { Factory } from 'rosie'
import {User} from '../src/models/database/User'
import {Database} from '../src/models/database/Database'
import {ApiClient} from '../src/models/database/ApiClient'
import {SmileTask} from '../src/models/database/SmileTask'
import {QuickSimulation} from '../src/models/database/QuickSimulation'
import {simpleCrypto} from '../src/shared/simpleCrypto'
import {idGenerator} from '../src/models/tools/idGenerator'
import {v4 as uuid} from 'uuid'

Factory.define('user', User)
  .sequence('id', (i) => simpleCrypto.sha1(uuid()))
  .sequence('email', (i) => `smilesuser${i}@fgmail.com`)
  .sequence('fullName', (i) => `Smiles User${i}`)
  .sequence('company', (i) => `Company ${i}`)

Factory.define('api_client', ApiClient)
  .sequence('id', (i) => simpleCrypto.sha1(uuid()))
  .sequence('secret', (i) => simpleCrypto.sha1(uuid() + "abcdef"))
  .sequence('exposedSecret', (i) => simpleCrypto.sha1(uuid() + "ghijkl"))
  .attr('revoked', false)
  .option('apiConfigs', null)
  .option('defaultConfig', null)
  .after((client, {apiConfigs, defaultConfig}) => {
    if (defaultConfig) {
      apiConfigs = apiConfigs || {}
      apiConfigs['default'] = defaultConfig
    }
    if (!apiConfigs) return
    for (let apiId of Object.keys(apiConfigs)) {
      const {customGoogleProject, customBucket, enabled, allowedHosts, recaptcha} = apiConfigs[apiId]
      if (customBucket) client.setCustomBucket({api: apiId, bucket: customBucket})
      if (customGoogleProject) client.setCustomGoogleProject({api: apiId, projectKey: customGoogleProject})
      if (typeof(enabled) === true) client.enableApi({api: apiId})
      if (typeof(enabled) === false) client.disableApi({api: apiId})
      if (allowedHosts) {
        allowedHosts.forEach((origin) => {
          client.addApiAllowedHost({api: apiId, host: origin})
        })
      }
      if (recaptcha && Object.keys(recaptcha).length > 0) {
        client.setApiRecaptcha({api: apiId}, recaptcha)
      }
    }
  })

Factory.define('smile_task', SmileTask)
  .sequence('id', (i) => simpleCrypto.sha1(uuid()))
  .sequence('userId', (i) => Factory.build('user').id)
  .sequence('clientId', (i) => Factory.build('api_client').id)
  .sequence('createdAt', (i) => Database.toTimestamp(new Date()))
  .sequence('filepathUploaded', ['userId'], (i, userId) => `ml-images/${userId}/smile.jpg`)
  .sequence('filepathResult', ['userId'], (i, userId) => `ml-images/${userId}/smile_after.jpg`)
  .sequence('filepathPreprocessed', ['userId'], (i, userId) => `ml-images/${userId}/smile_before.jpg`)
  .sequence('filepathSideBySide', ['userId'], (i, userId) => `ml-images/${userId}/smile_sidebyside.jpg`)
  .sequence('filepathSideBySideSmall', ['userId'], (i, userId) => `ml-images/${userId}/smile_sidebyside_small.jpg`)
  .attrs({
    'imageMD5': 'fba3cbecf7f5ed9fdd4a24021ca1928c',
    'contentType': "image/jpeg",
    'status': 'finished',
    'requester': {
      'type': SmileTask.RequesterType.inhouseClient(),
      'info': {'ip': '127.0.0.1'}
    }
  })

Factory.define('quick_simulation', QuickSimulation)
  .sequence('id', (i) => simpleCrypto.sha1(uuid()))
  .sequence('clientId', (i) => Factory.build('api_client').id)
  .sequence('createdAt', (i) => Database.toTimestamp(new Date()))
  .attrs({
    metadata: {},
    storage: {},
    params: {
      mode: 'cosmetic',
      blend: 'poisson',
      styleMode: 'mix_manual',
      mixFactor: 0.7,
      whiten: 0.5,
      brightness: 0.6,
    },
  })
