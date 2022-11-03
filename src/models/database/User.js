import {Database} from './Database'
import {env} from '../../config/env'

export class User {
  static get COLLECTION_NAME() {return 'users'}

  constructor({id, email, fullName, company}) {
    this.id = id
    this.email = email
    this.fullName = fullName
    this.company = company
  }

  static async get(id) {
    const db = Database.instance()
    const userData = await db.get(`${User.COLLECTION_NAME}/${id}`)
    if (!userData) return null
    userData.id = id
    return new User(userData)
  }

  static async getByEmail(email) {
    const db = Database.instance()
    const query = db.startQuery(User.COLLECTION_NAME)
      .where('email', '==', email)
    return await db.getResults(User, query)[0]
  }

  async save() {
    if (!env.isLocal()) throw new Error(`Save only in development. This application shouldn't change users`)
    const db = Database.instance()
    return db.save(this, `${User.COLLECTION_NAME}/${this.id}`)
  }
}
