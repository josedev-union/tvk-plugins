import { Factory } from 'rosie'
import {User} from '../src/models/database/User'
import {Database} from '../src/models/database/Database'
import {ApiClient} from '../src/models/database/ApiClient'
import {SmileTask} from '../src/models/database/SmileTask'
import {simpleCrypto} from '../src/shared/simpleCrypto'
import {idGenerator} from '../src/models/tools/idGenerator'
import uuid from 'uuid/v4'

Factory.define('user', User)
  .sequence('id', (i) => simpleCrypto.sha1(simpleCrypto.genericUUID()))
  .sequence('email', (i) => `smilesuser${i}@fgmail.com`)
  .sequence('fullName', (i) => `Smiles User${i}`)
  .sequence('company', (i) => `Company ${i}`)

Factory.define('api_client', ApiClient)
  .sequence('id', (i) => simpleCrypto.sha1(simpleCrypto.genericUUID()))
  .sequence('secret', (i) => simpleCrypto.sha1(simpleCrypto.genericUUID() + "abcdef"))

Factory.define('smile_task', SmileTask)
  .sequence('id', (i) => simpleCrypto.sha1(simpleCrypto.genericUUID()))
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
