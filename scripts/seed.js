import {DentistAccessPoint} from '../src/models/database/DentistAccessPoint'
import {MiroSmilesUser} from '../src/models/database/MiroSmilesUser'

const nick = process.env.SLUG
if (!nick) {
  throw 'You need to set the env var SLUG'
}
async function seed() {
  const user = new MiroSmilesUser({
    id: `${nick}-id`,
    email: `${nick}@gmail.com`,
    company: 'ShinySmile Dentists',
    fullName: 'Dr. Suresh',
    country: 'India',
    phone: '2199999999'
  })
  await user.save()
  console.log('User Saved', JSON.stringify(user))

  const point = DentistAccessPoint.build({
    userId: user.id,
    directPage: {
      slug: nick,
      disabled: false,
    },
    hosts: [
      'localhost',
      'localhost:3000',
    ]
  })

  await point.save()
  console.log('AccessPoint Saved', JSON.stringify(point))
}

seed()
