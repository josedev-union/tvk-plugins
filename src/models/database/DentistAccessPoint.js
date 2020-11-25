import {idGenerator} from '../tools/idGenerator'
import {Database} from './Database'
import {MiroSmilesUser} from './MiroSmilesUser'
import {signer} from '../../shared/signer'
import {env} from '../../config/env'
import {envShared} from '../../shared/envShared'

export class DentistAccessPoint {
    static get COLLECTION_NAME() {return 'dentist_access_points'}

    constructor({id, userId, secret, customEmail = null, directPage = {}, hosts = [], createdAt = null, updatedAt = null}) {
        this.id = id
        this.userId = userId
        this.customEmail = customEmail
        this.secret = secret
        this.directPage = {
          slug: directPage.slug,
          disabled: directPage.disabled || false,
        }
        this.hosts = hosts
        this.createdAt = createdAt || Database.toTimestamp(new Date())
        this.updatedAt = updatedAt || this.createdAt
    }

    addHost(host) {
        var normalized = DentistAccessPoint.normalizeHost(host)
        if (!this.hosts.includes(normalized)) {
            this.hosts.push(normalized)
        }
    }

    save() {
        this.updatedAt = Database.toTimestamp(new Date())
        this.createdAt = this.createdAt || this.updatedAt
        if (this.directPage && this.directPage.slug) this.directPage.slug = this.directPage.slug.toLowerCase()
        return Database.instance().save(this, `${DentistAccessPoint.COLLECTION_NAME}/${this.id}`)
    }

    async email() {
        if (this.customEmail) {
          return this.customEmail
        } else {
          let u = await this.user()
          if (u === null) return null
          return u.email
        }
    }

    async user() {
      var user = await MiroSmilesUser.get(this.userId)
      this.cachedUser = user
      return user
    }

    async cacheableUser() {
      if (this.cachedUser) return this.cachedUser
      return await this.user()
    }

    slug() {
        if (this.directPage === null) {
          return null
        } else {
          return this.directPage.slug
        }
    }

    isDisabled() {
        if (this.directPage === null) {
          return false
        } else {
          return this.directPage.disabled
        }
    }

    checkHost(host) {
        let normalized = DentistAccessPoint.normalizeHost(host)
        return (this.hosts || []).includes(normalized)
    }

    static async get(id) {
      const data = await Database.instance().get(`${DentistAccessPoint.COLLECTION_NAME}/${id}`)
      return new DentistAccessPoint(data)
    }

    static async getAll() {
        const db = Database.instance()
        let query = db.startQuery(DentistAccessPoint.COLLECTION_NAME)
        return await db.getResults(DentistAccessPoint, query)
    }

    static async allForHost(host) {
        const normalized = DentistAccessPoint.normalizeHost(host)
        const db = Database.instance()
        let query = db.startQuery(DentistAccessPoint.COLLECTION_NAME)
        
        if (host && !DentistAccessPoint.isMasterHost(host)) {
          query = query.where('hosts', 'array-contains', normalized)
        }
        return await db.getResults(DentistAccessPoint, query)
    }

    static async findOne(params, referer, signature) {
        const accessPoints = await this.allForHost(referer)
        const access = accessPoints.find((access) => {
            return signer.verify(params, access.secret, envShared.apiSecretToken, signature)
        })
        return access
    }

    static destroy(id) {
        if (id === '/' || id === '' || !id) throw "Can't delete root"
        return Database.instance().delete(`/dentist_access_points/${id}`)
    }

    static async findOneBySlug(slug) {
        const db = Database.instance()
        const query = db.startQuery(DentistAccessPoint.COLLECTION_NAME)
          .where('directPage.slug', '==', slug.toLowerCase())
        const all = await db.getResults(DentistAccessPoint, query) 
        return (all.length > 0 ? all[0] : null)
    }

    static build({hosts = [], directPage = {}, userId}) {
        return new DentistAccessPoint({
            id: this.newId(),
            secret: this.newSecret(),
            userId: userId,
            hosts: hosts,
            directPage: directPage
        })
    }

    static normalizeHost(host) {
        return host.match(/^([^:]+:\/\/)?([^@\/]+@)?([^\/]+)/)[3]
    }

    static newId() {
        return idGenerator.newOrderedId()
    }

    static newSecret() {
        return idGenerator.newSecret()
    }

    static isMasterHost(host) {
      var normalizedHost = this.normalizeHost(host)
      var masterHost = env.masterHost
      if (!masterHost) {
        return normalizedHost.includes('localhost')
      } else {
        return this.normalizeHost(masterHost) === normalizedHost
      }
    }
  
}
