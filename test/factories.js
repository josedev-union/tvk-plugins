import { Factory } from 'rosie'
import {DentistAccessPoint} from '../src/models/database/DentistAccessPoint'
import {ImageProcessingSolicitation, SolicitationRequesterType} from '../src/models/database/ImageProcessingSolicitation'
import {MiroSmilesUser} from '../src/models/database/MiroSmilesUser'
import {simpleCrypto} from '../src/shared/simpleCrypto'
import {idGenerator} from '../src/models/tools/idGenerator'

Factory.define('dentist_access_point', DentistAccessPoint)
  .attr('id', () => DentistAccessPoint.newId())
  .sequence('userId', (i) => simpleCrypto.sha1(simpleCrypto.genericUUID()))
  .attr('secret', () => DentistAccessPoint.newSecret())
  .attr('customEmail', null)
  .attr('directPage', () => {
    return {slug: 'dr-suresh', disabled: false}
  })

Factory.define('patient_info')
  .attr('ip', '127.0.0.1')
  .attr('origin', 'dentist-website.com')
  .attr('phone', '+55 21 3040-5596')
  .sequence('email', (i) => `an-email${i}@fgmail.com`)
  .sequence('name', (i) => `User Name ${i}`)

Factory.define('dentist_info')
  .attr('ip', '127.0.0.1')
  .attr('deviceId', () => idGenerator.newOrderedId())

Factory.define('image_processing_solicitation', ImageProcessingSolicitation)
  .option('requesterType', SolicitationRequesterType.patient())
  .attr('requester', ['requesterType'], (requesterType) => {
    return {
      type: requesterType,
      info: Factory.attributes(`${requesterType}_info`)
    }
  })

Factory.define('miro_smiles_user', MiroSmilesUser)
  .sequence('id', (i) => simpleCrypto.sha1(simpleCrypto.genericUUID()))
  .sequence('email', (i) => `smilesuser${i}@fgmail.com`)
  .sequence('fullName', (i) => `Smiles User${i}`)
  .sequence('company', (i) => `Company ${i}`)
