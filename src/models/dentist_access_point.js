import {newOrderedId, newSecret} from '../models/id_generator'
import Database from '../models/database'
import MiroSmilesUser from '../models/miro_smiles_user'
import * as signer from '../shared/signer'

class DentistAccessPoint {
    constructor({id, userId, secret, customEmail = null, directPage = {}, hosts = [], createdAt = new Date().toISOString(), updatedAt = null}) {
        this.id = id
        this.userId = userId
        this.customEmail = customEmail
        this.secret = secret
        this.directPage = {
          slug: directPage.slug,
          disabled: directPage.disabled || false,
        }
        this.hosts = hosts
        this.createdAt = createdAt
        this.updatedAt = updatedAt || createdAt
    }

    addHost(host) {
        var normalized = DentistAccessPoint.normalizeHost(host)
        if (!this.hosts.includes(normalized)) {
            this.hosts.push(normalized)
        }
    }

    save() {
        this.updatedAt = new Date().toISOString()
        this.createdAt = this.createdAt || new Date().toISOString()
        return Database.instance().save(this, `/dentist_access_points/${this.id}`)
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

    matchSlug(slug) {
      var s = this.slug()
      if (!s) return false
      return s.toLowerCase() === slug.toLowerCase()
    }

    checkHost(host) {
        let normalized = DentistAccessPoint.normalizeHost(host)
        return (this.hosts || []).includes(normalized)
    }

    static async get(id) {
      const data = await Database.instance().get(`/dentist_access_points/${id}`)
      return new DentistAccessPoint(data)
    }

    static async getAll() {
        const db = Database.instance()
        const allAsObject = await db.getAll(`/dentist_access_points/`)
        const all = []
        for (var key in allAsObject) {
            all.push(new DentistAccessPoint(allAsObject[key]))
        }
        return all.reverse()
    }

    static async allForHost(host) {
        let all = await this.getAll()
        return this.filterHost(all, host)
    }

    static async findOne(params, referer, signature) {
        const accessPoints = await this.allForHost(referer)
        const access = accessPoints.find((access) => {
            return signer.verify(params, access.secret, signature)
        })
        return access
    }

    static async findOneBySlug(slug) {
        let all = await this.getAll()
        all = this.filterSlug(all, slug)
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
        return newOrderedId()
    }

    static newSecret() {
        return newSecret()
    }

    static isMasterHost(host) {
      var normalizedHost = this.normalizeHost(host)
      var masterHost = process.env.MASTER_HOST
      if (!masterHost) {
        return normalizedHost.includes('localhost')
      } else {
        return this.normalizeHost(masterHost) === normalizedHost
      }
    }

    static filterHost(all, host) {
        if (DentistAccessPoint.isMasterHost(host) || !host) {
          return all
        }
        var filtered = []
        all.forEach((accessPoint) => {
            if (accessPoint.checkHost(host)) {
                filtered.push(accessPoint)
            }
        })
        return filtered
    }

    static filterSlug(all, slug) {
        let filtered = []
        all.forEach((accessPoint) => {
          if (accessPoint.matchSlug(slug)) {
            filtered.push(accessPoint)
          }
        })
        return filtered
    }
}

export default DentistAccessPoint
