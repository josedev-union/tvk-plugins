import path from 'path'
import admin from 'firebase-admin'

class Database {
    constructor({connection, namespace = ""}) {
        this.connection = connection
        this.namespace = namespace
    }

    static build(db = admin.database()) {
        return new Database({
            connection: db,
            namespace: "miroweb_data"
        })
    }

    static setInstance(db = null) {
        this.instance = this.build(db)
    }

    save(obj, obj_path) {
        const full_path = path.join(this.namespace, obj_path)
        return this.connection.ref(full_path).set(obj)
    }

    async getAll(objs_path) {
        const full_path = path.join(this.namespace, objs_path)
        const all = await this.connection.ref(full_path).once("value")
        return all.val()
    }
}

export default Database