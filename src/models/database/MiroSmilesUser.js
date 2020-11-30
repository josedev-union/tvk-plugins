import {Database} from './Database'
import {env} from '../../config/env'

export class MiroSmilesUser {
  static get COLLECTION_NAME() {return 'users'}

  constructor({id, email, fullName, company}) {
    this.id = id
    this.email = email
    this.fullName = fullName
    this.company = company
  }

  static async get(id) {
    const db = Database.instance()
    const userData = await db.get(`${MiroSmilesUser.COLLECTION_NAME}/${id}`)
    if (!userData) return null
    userData.id = id
    return new MiroSmilesUser(userData)
  }

  static async getByEmail(email) {
    const db = Database.instance()
    const query = db.startQuery(MiroSmilesUser.COLLECTION_NAME)
      .where('email', '==', email)
    return await db.getResults(MiroSmilesUser, query)[0]
  }

  async save() {
    if (!env.isLocal()) throw `Can't save a mirosmiles User`
    const db = Database.instance()
    return db.save(this, `${MiroSmilesUser.COLLECTION_NAME}/${this.id}`)
  }
}
