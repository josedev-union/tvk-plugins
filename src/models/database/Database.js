import path from 'path'
import admin from 'firebase-admin'
import {env} from '../../config/env'

export class Database {
    constructor({connection, namespace = ""}) {
        this.connection = connection
        this.namespace = namespace
    }

    static build(db = admin.firestore(), namespace = 'dentrino-web') {
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
      if (!instance) throw new Error(`Couldn't find database named ${key}`)
      return instance
    }

    static toTimestamp(date) {
        return admin.firestore.Timestamp.fromDate(date)
    }

    save(obj, objPath, overwrite=false) {
        return this.#getRef(objPath).set(adaptObj(obj), {merge: !overwrite})
    }

    startQuery(collectionName) {
        return this.connection.collection(collectionName)
    }

    async getResults(constructor, query) {
        const rawResults = await query.get()
        let results = []
        rawResults.forEach(raw => results.push(new constructor({id: raw.id, ...raw.data()})))
        return results
    }

    async get(objsPath) {
        const ref = this.#getRef(normalizePath(objsPath))
        const got = await ref.get()
        return got.exists ? got.data() : null
    }

    set(objPath, value) {
        return this.#getRef(objPath).set(value)
    }

    async delete(objPath, allow_root = false) {
        if (!allow_root && (objPath === '/' || objPath === '' || !objPath)) throw new Error("Can't delete root")
        return this.#getRef(objPath).delete()
    }

    #getRef(objPath) {
        return this.connection.doc(objPath)
    }
}

function adaptObj(value) {
    if (typeof(value) !== 'object') return value
    var obj = Object.assign({}, value)
    Object.keys(obj).forEach(key => {
        if (obj[key] instanceof admin.firestore.Timestamp) {
            obj[key] = obj[key].toDate()
        }
    })
    return obj
    // var obj = {}
    // Object.keys(value).forEach(key => {
    //     obj[key] = value[key]
    // })
    // return obj
}

function normalizePath(objPath) {
    let parts = []
    objPath.split('/').forEach(part => {
        const trimmed = part.trim()
        if (trimmed !== '') parts.push(part)
    })
    return parts.join('/')
}
