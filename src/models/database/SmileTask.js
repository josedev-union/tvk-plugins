import {Database} from '../database/Database'
import {idGenerator} from '../tools/idGenerator'
import {sanitizer} from '../tools/sanitizer'
import {Enum} from '../tools/Enum'
import {join} from 'path'

const UPLOADED_IMAGE_FILENAME = 'smile.jpg'
const RESULT_IMAGE_FILENAME = 'smile_after.jpg'
const SIDEBYSIDE_IMAGE_FILENAME = 'sidebyside.jpg'

const RequesterType = new Enum([
    'patient',
    'inhouseClient',
])

const REQUESTER_METADATA = {
  [RequesterType.patient()]: {
    fields: ['ip', 'accessPointId', 'origin', 'email', 'name', 'phone'],
    pathPattern: 'ml-images/{clientId}/{id}/{filename}',
  },
  [RequesterType.inhouseClient()]: {
    fields: ['ip'],
    pathPattern: '{userId}/on_demand/{id}/{filename}',
  },
}

function afterClassDefinition() {
    Database.registerCollection(SmileTask.COLLECTION_NAME)
}
export class SmileTask {
    static get COLLECTION_NAME() { return 'smile_tasks' }
    static get RequesterType() { return RequesterType }

    constructor(attrs = {}) {
        this.id = attrs.id
        this.createdAt = attrs.createdAt

        this.imageMD5 = attrs.imageMD5
        this.userId = attrs.userId
        this.clientId = attrs.clientId
        this.contentType = attrs.contentType
        this.status = attrs.status || 'pending'
        this.filepathUploaded = attrs.filepathUploaded
        this.filepathResult = attrs.filepathResult

        this.requester = attrs.requester
    }

    static build(requesterType, attrs) {
        const finalAttrs = SmileTask.#prepareBuildAttrs(requesterType, attrs)
        return new SmileTask(finalAttrs)
    }

    async save() {
        return Database.instance().save(this, `${SmileTask.COLLECTION_NAME}/${this.id}`)
    }

    static async get(id) {
        const data = await Database.instance().get(`${SmileTask.COLLECTION_NAME}/${id}`)
        if (!data) return null
        return new SmileTask(data)
    }

    static newId(createdAt) {
        return idGenerator.newOrderedId()
    }

    static #prepareBuildAttrs(requesterType, attrs) {
        const metadata = REQUESTER_METADATA[requesterType]
        const id = attrs.id || SmileTask.newId()
        attrs = Object.assign({
          id: id,
          createdAt: attrs.createdAt || Database.toTimestamp(new Date()),
          requester: {
            type: requesterType,
            info: sanitizer.onlyKeys(attrs, metadata.fields),
          },
        }, attrs)
        return Object.assign({
          filepathUploaded:   SmileTask.#buildPath(metadata.pathPattern, attrs, UPLOADED_IMAGE_FILENAME),
          filepathResult:     SmileTask.#buildPath(metadata.pathPattern, attrs, RESULT_IMAGE_FILENAME),
        }, attrs)
    }

  static #buildPath(pattern, attrs, filename) {
      let path = pattern.replace('{filename}', filename)
      Object.keys(attrs).forEach(k => {
          path = path.replace('{'+k+'}', attrs[k])
      })
      return path
  }
}
afterClassDefinition()
