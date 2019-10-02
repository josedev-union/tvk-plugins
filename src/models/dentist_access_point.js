import {newOrderedId, newSecret} from '../models/id_generator'
import Database from '../models/database'

class DentistAccessPoint {
    constructor({id, secret, hosts = [], createdAt = new Date().toISOString(), updatedAt = null}) {
        this.id = id
        this.secret = secret
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
        return Database.instance.save(this, `/dentist_access_points/${this.id}`)
    }

    static async getAll() {
        const db = Database.instance
        const allAsObject = await db.getAll(`/dentist_access_points/`)
        const all = []
        for (var key in allAsObject) {
            all.push(allAsObject[key])
        }
        return all.reverse()
    }

    static async allForHost(host) {
        let normalized = DentistAccessPoint.normalizeHost(host)
        let all = await this.getAll()
        var filtered = []
        all.forEach((access_point) => {
            if ((access_point.hosts || []).includes(normalized)) {
                filtered.push(access_point)
            }
        })
        return filtered
    }

    static build({hosts = []}) {
        return new DentistAccessPoint({
            id: this.newId(),
            secret: this.newSecret(),
            hosts: hosts
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
}

export default DentistAccessPoint