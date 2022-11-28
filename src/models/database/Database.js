import path from 'path'
import admin from 'firebase-admin'
import {env} from '../../config/env'

const SOURCE_NAME_KEY = '__source'
export class Database {
    constructor({connection, name}) {
        this.connection = connection
        this.name = name
    }

    static build({app, name = 'default'}) {
        if (env.isTest() && !app.options.databaseURL.includes('localhost')) {
            throw `Invalid firestore options ${app.options}. Test environment can connect on localhost only.`
        }
        return new Database({
            connection: app.firestore(),
            name,
        })
    }

    static setInstance({database}) {
        if (!this.instances) this.instances = {}
        this.instances[database.name] = database
    }

    static instance({name}={}) {
      if (!this.instances) return null
      name = name || 'default'
      let instance = this.instances[name]
      if (!instance) throw new Error(`Couldn't find database named ${name}`)
      return instance
    }

    static toTimestamp(date) {
        return admin.firestore.Timestamp.fromDate(date)
    }

    static sourceOf(obj) {
      return obj[SOURCE_NAME_KEY] || 'default'
    }

    save(obj, objPath, overwrite=false, attrs=undefined) {
        obj[SOURCE_NAME_KEY] = this.name
        return this.#getRef(objPath).set(adaptObj(obj, {attrs}), {merge: !overwrite})
    }

    startQuery(collectionName) {
        return this.connection.collection(collectionName)
    }

    async getResults(constructor, query) {
        const rawResults = await query.get()
        let results = []
        rawResults.forEach(raw => {
            const obj = this.#firebaseObjToModelObj(constructor, raw)
            results.push(obj)
        })
        return results
    }

    async get(constructor, objsPath) {
        const fullPath = path.join(constructor.COLLECTION_NAME, String(objsPath))
        const ref = this.#getRef(normalizePath(fullPath))
        const got = await ref.get()
        if (!got.exists) return null
        return this.#firebaseObjToModelObj(constructor, got)
    }

    #firebaseObjToModelObj(constructor, firebaseObj) {
        const attrs = {
            id: firebaseObj.id,
            ...firebaseObj.data(),
        }
        const obj = new constructor(attrs)
        obj[SOURCE_NAME_KEY] = this.name
        return obj
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

function adaptObj(value, {attrs}={}) {
    if (typeof(value) !== 'object') return value
    const obj = {}
    if (!attrs) {
      Object.assign(obj, value)
    } else {
      attrs.forEach(attr => {
        obj[attr] = value[attr]
      })
    }
    Object.keys(obj).forEach(key => {
        if (obj[key] instanceof admin.firestore.Timestamp) {
            obj[key] = obj[key].toDate()
        }
    })
    delete obj.id
    delete obj[SOURCE_NAME_KEY]
    return obj
}

function normalizePath(objPath) {
    let parts = []
    objPath.split('/').forEach(part => {
        const trimmed = part.trim()
        if (trimmed !== '') parts.push(part)
    })
    return parts.join('/')
}
