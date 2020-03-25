import Database from '../models/database'
import * as signer from '../shared/signer'
import * as env from '../models/env'

const db = () => Database.instance('mirosmiles')

class MiroSmilesUser {
  constructor({id, email, fullName, company}) {
    this.id = id
    this.email = email
    this.fullName = fullName
    this.company = company
  }

  static async get(id) {
    const userData = await db().get(`/users/${id}`)
    if (!userData) return null
    userData.id = id
    return new MiroSmilesUser(userData)
  }

  async save() {
    if (!env.isLocal()) throw `Can't save a mirosmiles User`
    return db().save(this, `/users/${this.id}`)
  }
}

export default MiroSmilesUser
