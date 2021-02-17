import {Database} from '../database/Database'
import {idGenerator} from '../tools/idGenerator'
import {sanitizer} from '../tools/sanitizer'
import {Enum} from '../tools/Enum'
import {join} from 'path'

const UPLOADED_IMAGE_FILENAME = 'smile.jpg'
const RESULT_IMAGE_FILENAME = 'smile_after.jpg'
const SIDEBYSIDE_IMAGE_FILENAME = 'sidebyside.jpg'
const FOLDER_NAMESPACE = 'ml-images'

const RequesterType = new Enum([
    'patient',
    'inhouseClient',
])

const INFO_FIELDS = {
  [RequesterType.patient()]: ['ip', 'accessPointId', 'origin', 'email', 'name', 'phone'],
  [RequesterType.inhouseClient()]: ['ip'],
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
        this.filepathSideBySide = attrs.filepathSideBySide

        this.requester = attrs.requester
    }

    static build(requesterType, attrs) {
        const finalAttrs = SmileTask.#prepareBuildAttrs(requesterType, attrs)
        return new SmileTask(finalAttrs)
    }

    save() {
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
        const id = attrs.id || SmileTask.newId()
        return Object.assign({
          id: id,
          createdAt: attrs.createdAt || Database.toTimestamp(new Date()),
          requester: {
            type: requesterType,
            info: sanitizer.onlyKeys(attrs, INFO_FIELDS[requesterType]),
          },
          filepathUploaded: join(FOLDER_NAMESPACE, id, UPLOADED_IMAGE_FILENAME),
          filepathResult: join(FOLDER_NAMESPACE, id, RESULT_IMAGE_FILENAME),
          filepathSideBySide: join(FOLDER_NAMESPACE, id, SIDEBYSIDE_IMAGE_FILENAME),
        }, attrs)
    }
}
afterClassDefinition()
