import { Factory } from 'rosie'
import DentistAccessPoint from '../src/models/dentist_access_point.js'
import ImageProcessingSolicitation from '../src/models/image_processing_solicitation.js'
import MiroSmilesUser from '../src/models/miro_smiles_user.js'
import { generic_uuid, sha1 } from '../src/shared/simple_crypto'

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
  .sequence('id', (i) => sha1(generic_uuid()))
  .sequence('email', (i) => `smilesuser${i}@fgmail.com`)
