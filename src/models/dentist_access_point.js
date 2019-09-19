import {newId, newSecret} from '../models/id_generator'
import Database from '../models/database'

class DentistAccessPoint {
    constructor({id, secret, hosts = []}) {
        this.id = id
        this.secret = secret
        this.hosts = hosts
    }

    addHost(host) {
        this.hosts.push(host)
    }

    save() {
        return Database.build().save(this, `/dentist_access_points/${this.id}`)
    }

    static async getAll() {
        const db = Database.build()
        const allAsObject = await db.getAll(`/dentist_access_points/`)
        const all = []
        for (var key in allAsObject) {
            all.push(allAsObject[key])
        }
        return all
    }

    static async allForHost(host) {
        return this.getAll.then((all) => {
            var filtered = []
            all.foreach((access_point) => {
                if (access_point.hosts.includes(host)) {
                    filtered.push(access_point)
                }
            })
            return filtered
        })
    }

    static build({hosts = []}) {
        return new DentistAccessPoint({
            id: this.newId(),
            secret: this.newSecret(),
            hosts: hosts
        })
    }

    static newId() {
        return newId()
    }

    static newSecret() {
        return newSecret()
    }
}

export default DentistAccessPoint