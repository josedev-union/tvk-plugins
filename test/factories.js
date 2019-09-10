import { Factory } from 'rosie'
import DentistAccessPoint from '../src/models/dentist_access_point.js'

Factory.define('dentist_access_point', DentistAccessPoint)
    .attr('id', () => DentistAccessPoint.newId())
    .attr('secret', () => DentistAccessPoint.newSecret())