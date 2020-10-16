import path from 'path'
import admin from 'firebase-admin'
import {env} from '../../config/env'

export class Database {
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
        return this.getRef(obj_path).set(obj)
    }

    transaction(obj_path, cb) {
        return this.getRef(obj_path).transaction(cb)
    }

    getAll(objs_path) {
        return this.get(objs_path)
    }

    async get(objs_path) {
        const all = await this.getRef(objs_path).once("value")
        return all.val()
    }

    set(obj_path, value) {
        return this.getRef(obj_path).set(value)
    }

    async delete(obj_path, allow_root = false) {
        if (!allow_root && (obj_path === '/' || obj_path === '' || !obj_path)) throw "Can't delete root"
        return this.getRef(obj_path).remove()
    }

    getRef(obj_path) {
        const full_path = path.join(this.namespace, obj_path)
        return this.connection.ref(full_path)
    }

    async drop() {
        if (!env.isLocal()) {
            throw `Can't drop database on ${env.name}`
        }
        return this.delete('/', true)
    }
}