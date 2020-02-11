import { Factory } from 'rosie'
import DentistAccessPoint from '../src/models/dentist_access_point.js'
import ImageProcessingSolicitation from '../src/models/image_processing_solicitation.js'

Factory.define('dentist_access_point', DentistAccessPoint)
    .attr('id', () => DentistAccessPoint.newId())
    .attr('userId', () => "user-external-id")
    .attr('secret', () => DentistAccessPoint.newSecret())
    .attr('directPage', () => {
      return {slug: 'dr-suresh', disabled: false}
    })

Factory.define('image_processing_solicitation', ImageProcessingSolicitation)
    .attr('ip', '127.0.0.1')
    .sequence('origin', (i) => `host${i}:3000`)
    .sequence('email', (i) => `an-email${i}@fgmail.com`)
    .attr('name', (i) => `User Name ${i}`)
    .attr('phone', '+55 21 3040-5596')
