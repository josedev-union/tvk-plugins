import {User} from '../src/models/database/User'
import {DentistAccessPoint} from '../src/models/database/DentistAccessPoint'

const USER_EMAIL = 'dentrino@fgmail.com'
const USER_ID = 'dentrino-ID-1kjn1j3asd'
const USER_ATTRS = {
  id: USER_ID,
  email: USER_EMAIL,
  company: 'Dentrino Tasty',
  fullName: 'Dentrino Full Name',
  country: 'Brazil',
  phone: '21986411271'
}

const ACCESS_POINT_ATTRS = {
  userId: USER_ID,
  directPage: {
    slug: 'dentrino',
    disabled: false,
  },
  hosts: [
    'localhost',
    'localhost:3000',
  ]
}

async function main() {
  let user = await User.getByEmail(USER_EMAIL)
  if (user) {
    Object.assign(user, USER_ATTRS)
  } else {
    user = new User(USER_ATTRS)
  }
  await user.save()
  console.log("User ID", user.id)
  console.log("User:", user)

  let point = await DentistAccessPoint.findOneByUserId(user.id)
  if (point) {
    Object.assign(point, ACCESS_POINT_ATTRS)
  } else {
    point = DentistAccessPoint.build(ACCESS_POINT_ATTRS)
  }
  await point.save()
  console.log("Access Point ID", point.id)
  console.log("Access Point:", point)
}

main()
