import {User} from '../../../src/models/database/User'
import { Factory } from 'rosie'
import '../../../src/config/config'
import {firebaseHelpers} from '../../helpers/firebaseHelpers'

beforeAll(async () => {
  await firebaseHelpers.ensureTestEnv()
})
beforeEach(async () => {
  await firebaseHelpers.clearFirestore()
})

describe('static', () => {
  describe('user get by id', () => {
    test(`return the user if it exist`, async () => {
      const user = Factory.build('user')
      await user.save()

      const userfound = await User.get(user.id)
      expect(userfound.id).toBe(user.id)
      expect(userfound.email).toBe(user.email)
    })

    test(`return null if user doesn't exist`, async () => {
      const usernotfound = await User.get('nonexistentid')
      expect(usernotfound).toBe(null)
    })
  })
})
