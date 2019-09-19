// require("regenerator-runtime/runtime")
import path from 'path'
import admin from 'firebase-admin'

class Database {
    constructor({connection, namespace = ""}) {
        this.connection = connection
        this.namespace = namespace
    }

    static build() {
        return new Database({
            connection: admin.database(),
            namespace: "miroweb_data"
        })
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