import { Factory } from 'rosie'
import {User} from '../src/models/database/User'
import {simpleCrypto} from '../src/shared/simpleCrypto'
import {idGenerator} from '../src/models/tools/idGenerator'

Factory.define('user', User)
  .sequence('id', (i) => simpleCrypto.sha1(simpleCrypto.genericUUID()))
  .sequence('email', (i) => `smilesuser${i}@fgmail.com`)
  .sequence('fullName', (i) => `Smiles User${i}`)
  .sequence('company', (i) => `Company ${i}`)
