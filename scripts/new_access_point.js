import {DentistAccessPoint} from '../src/models/DentistAccessPoint'

let point = DentistAccessPoint.build({
  userId: '!!!replace-it!!!',
  directPage: {
    slug: '!!!replace-it!!!',
    disabled: true,
  },
  hosts: [
    'replace-it.com',
    'replace-it2.com:3000',
  ]
})

point.save()

console.log(`Access Point Created! ID: ${point.id}`)
