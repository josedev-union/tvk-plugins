import path from 'path'
import admin from 'firebase-admin'
import * as env from '../models/env'

class Database {
    constructor({connection, namespace = ""}) {
        this.connection = connection
        this.namespace = namespace
    }

    static build(db = admin.database(), namespace = 'miroweb_data') {
        return new Database({
            connection: db,
            namespace: namespace
        })
    }

    static setInstance(database, key='default') {
        if (!this.instances) this.instances = {}
        this.instances[key] = database
    }

    static instance(key='default') {
      let instance = this.instances[key]
      if (!instance) throw `Couldn't find database named ${key}`
      return instance
    }

    save(obj, obj_path) {
        const full_path = path.join(this.namespace, obj_path)
        return this.connection.ref(full_path).set(obj)
    }

    transaction(obj_path, cb) {
        const full_path = path.join(this.namespace, obj_path)
        return this.connection.ref(full_path).transaction(cb)
    }

    getAll(objs_path) {
        return this.get(objs_path)
    }

    async get(objs_path) {
        const full_path = path.join(this.namespace, objs_path)
        const all = await this.connection.ref(full_path).once("value")
        return all.val()
    }

    set(obj_path, value) {
        const full_path = path.join(this.namespace, obj_path)
        return this.connection.ref(full_path).set(value)
    }

    async drop() {
        if (!env.isLocal()) {
            throw `Can't drop database on ${process.env.NODE_ENV}`
        }
        return this.delete('/')
    }

    async delete(objs_path) {
        const full_path = path.join(this.namespace, objs_path)
        return this.connection.ref(full_path).remove()
    }
}

export default Database
