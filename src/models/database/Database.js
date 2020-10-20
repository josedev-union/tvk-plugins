import path from 'path'
import admin from 'firebase-admin'
import {env} from '../../config/env'
import {DentistAccessPoint} from '../../models/database/DentistAccessPoint'
import {ImageProcessingSolicitation} from '../../models/database/ImageProcessingSolicitation'

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
      if (!instance) throw `Couldn't find database named ${key}`
      return instance
    }

    static toTimestamp(date) {
        return admin.firestore.Timestamp.fromDate(date)
    }

    save(obj, objPath) {
        return this.#getRef(objPath).set(adaptObj(obj))
    }

    startQuery(collectionName) {
        return this.connection.collection(collectionName)
    }

    async getResults(constructor, query) {
        const rawResults = await query.get()
        let results = []
        rawResults.forEach(raw => results.push(new constructor(raw.data())))
        return results
    }

    async get(objsPath) {
      const ref = this.#getRef(normalizePath(objsPath))
      if (ref.once) {
          const all = await ref.once('value')
          return all.val()
      } else {
          const got = await ref.get()
          return got.data()
      }
    }

    set(objPath, value) {
        return this.#getRef(objPath).set(value)
    }

    async delete(objPath, allow_root = false) {
        if (!allow_root && (objPath === '/' || objPath === '' || !objPath)) throw "Can't delete root"
        return this.#getRef(objPath).delete()
    }

    async drop() {
        if (!env.isTest()) {
            throw `Can't drop database on ${env.name}`
        }

        if (this.connection.clearPersistence) {
            // await this.connection.clearPersistence()
            let batch = this.connection.batch()
            var collects = [
              DentistAccessPoint.COLLECTION_NAME,
              ImageProcessingSolicitation.COLLECTION_NAME,
            ]
            for (var i = 0; i < collects.length; i++) {
                batch = await this.#dropCollection(collects[i], batch)
            }
            await batch.commit()
        } else {
            return await this.delete('/', true)
        }
    }

    #getRef(objPath) {
        if (this.connection.doc) {
            return this.connection.doc(objPath)
        } else {
            const full_path = path.join(this.namespace, objPath)
            return this.connection.ref(full_path)
        }
    }

    async #dropCollection(collectionName, batch) {
        const snapshot = await this.startQuery(collectionName).get()
        snapshot.docs.forEach(doc => batch.delete(doc.ref))
        return batch
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
