import {User} from '../../../src/models/database/User'
import { Factory } from 'rosie'
import {Database} from '../../../src/models/database/Database'
import '../../../src/config/config'

describe('static', () => {
  describe('user get by id', () => {
    beforeEach(async () => {
      await Database.instance().drop()
    })

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
