import {idGenerator} from '../tools/idGenerator'
import {Database} from './Database'

}

export class ApiClient {
    static get COLLECTION_NAME() {return 'api_clients'}

    constructor({id, secret, createdAt = null, updatedAt = null}) {
        this.id = id
        this.secret = secret
        this.createdAt = createdAt || Database.toTimestamp(new Date())
        this.updatedAt = updatedAt || this.createdAt
    }

    save() {
        this.updatedAt = Database.toTimestamp(new Date())
        this.createdAt = this.createdAt || this.updatedAt
        const data = Object.assign({}, this)
        delete data.id
        return Database.instance().save(data, `${ApiClient.COLLECTION_NAME}/${this.id}`)
    }

    static async get(id) {
      const data = await Database.instance().get(`${ApiClient.COLLECTION_NAME}/${id}`)
      if (!data) return null
      data.id = id
      return new ApiClient(data)
    }

    static destroy(id) {
        if (id === '/' || id === '' || !id) throw "Can't delete root"
        return Database.instance().delete(`/${ApiClient.COLLECTION_NAME}/${id}`)
    }

    static build() {
        return new ApiClient({
            id: this.newId(),
            secret: this.newSecret(),
        })
    }

    static newId() {
        return idGenerator.newOrderedId({uuidSize: 15})
    }

    static newSecret() {
        return idGenerator.newSecret()
    }
}
