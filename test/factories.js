import { Factory } from 'rosie'
import {DentistAccessPoint} from '../src/models/database/DentistAccessPoint'
import {ImageProcessingSolicitation} from '../src/models/database/ImageProcessingSolicitation'
import {MiroSmilesUser} from '../src/models/database/MiroSmilesUser'
import {simpleCrypto} from '../src/shared/simpleCrypto'

Factory.define('dentist_access_point', DentistAccessPoint)
  .attr('id', () => DentistAccessPoint.newId())
  .attr('userId', () => "user-external-id")
  .attr('secret', () => DentistAccessPoint.newSecret())
  .attr('customEmail', null)
  .attr('directPage', () => {
    return {slug: 'dr-suresh', disabled: false}
  })

Factory.define('image_processing_solicitation', ImageProcessingSolicitation)
  .attr('ip', '127.0.0.1')
  .sequence('origin', (i) => `host${i}:3000`)
  .sequence('email', (i) => `an-email${i}@fgmail.com`)
  .attr('name', (i) => `User Name ${i}`)
  .attr('phone', '+55 21 3040-5596')

Factory.define('miro_smiles_user', MiroSmilesUser)
  .sequence('id', (i) => simpleCrypto.sha1(simpleCrypto.genericUUID()))
  .sequence('email', (i) => `smilesuser${i}@fgmail.com`)
  .sequence('fullName', (i) => `Smiles User${i}`)
  .sequence('company', (i) => `Company ${i}`)
