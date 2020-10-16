import {MiroSmilesUser} from '../../../src/models/database/MiroSmilesUser'
import { Factory } from 'rosie'
import {Database} from '../../../src/models/database/Database'
import '../../../src/config/config'

describe('static', () => {
  test('user get by id', async () => {
    await Database.instance('mirosmiles').drop()
    const user = Factory.build('miro_smiles_user')
    user.save()

    const userfound = await MiroSmilesUser.get(user.id)
    expect(userfound.id).toBe(user.id)
    expect(userfound.email).toBe(user.email)

    const usernotfound = await MiroSmilesUser.get('nonexistentid')
    expect(usernotfound).toBe(null)
  })
})
