import {Database} from '../database/Database'
import {idGenerator} from '../tools/idGenerator'
import {sanitizer} from '../tools/sanitizer'
import {Enum} from '../tools/Enum'
import * as path from 'path'

const UPLOADED_IMAGE_FILENAME = 'smile.jpg'
const RESULT_IMAGE_FILENAME = 'smile_after.jpg'
const PREPROCESSED_IMAGE_FILENAME = 'smile_before.jpg'
const SIDEBYSIDE_IMAGE_FILENAME = 'smile_sidebyside.jpg'
const SIDEBYSIDE_SMALL_IMAGE_FILENAME = 'smile_sidebyside_small.jpg'
const UPLOADED_TO_REVIEW_NAME = 'smile_review_pending'

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

const METADATA_WHITELIST = [
  'mode', 'blend',
  'mix_factor', 'style_mode', 'whiten', 'brightness',
  'feedback_score', 'capture_type', 'external_customer_id',
]

export class SmileTask {
  COLLECTION_NAME() { return 'smile_tasks' }
  static get RequesterType() { return RequesterType }
  static get UPLOADED_TO_REVIEW_NAME() { return UPLOADED_TO_REVIEW_NAME }

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
    this.filepathPreprocessed = attrs.filepathPreprocessed
    this.filepathSideBySide = attrs.filepathSideBySide
    this.filepathSideBySideSmall = attrs.filepathSideBySideSmall
    this.metadata = {}

    this.requester = attrs.requester
  }

  static build(requesterType, attrs) {
    const finalAttrs = this.#prepareBuildAttrs(requesterType, attrs)
    return new SmileTask(finalAttrs)
  }

  hasFinished() {
    return this.status === 'finished'
  }

  async save({attrs}={}) {
    return Database.instance().save(this, `${this.COLLECTION_NAME()}/${this.id}`, false, attrs)
  }

  addMetadata(metadata) {
    metadata = sanitizer.onlyKeys(metadata, METADATA_WHITELIST)
    Object.assign(this.metadata, metadata)
  }

  uploadsDir() {
    return path.join(path.dirname(this.filepathUploaded), '/')
  }

  resultsDirectory() {
    return path.join(path.dirname(this.filepathResult), '/')
  }

  filepathUploadedToReview() {
    const imageExtension = path.extname(this.filepathUploaded)
    const filename = UPLOADED_TO_REVIEW_NAME + imageExtension
    return path.join(this.uploadsDir(), filename)
  }

  static async get(id) {
    const db = Database.instance()
    return await db.get(SmileTask, id)
  }

  static async all() {
    const db = Database.instance()
    const query = db.startQuery(this.COLLECTION_NAME())
    return await db.getResults(SmileTask, query)
  }

  static newId(createdAt) {
    return idGenerator.newOrderedId()
  }

  static #prepareBuildAttrs(requesterType, attrs) {
    const metadata = REQUESTER_METADATA[requesterType]
    const id = attrs.id || this.newId()
    attrs = Object.assign({
      id: id,
      createdAt: attrs.createdAt || Database.toTimestamp(new Date()),
      requester: {
        type: requesterType,
        info: sanitizer.onlyKeys(attrs, metadata.fields),
      },
    }, attrs)
    return Object.assign({
      filepathUploaded:        this.#buildPath(metadata.pathPattern, attrs, UPLOADED_IMAGE_FILENAME),
      filepathResult:          this.#buildPath(metadata.pathPattern, attrs, RESULT_IMAGE_FILENAME),
      filepathPreprocessed:    this.#buildPath(metadata.pathPattern, attrs, PREPROCESSED_IMAGE_FILENAME),
      filepathSideBySide:      this.#buildPath(metadata.pathPattern, attrs, SIDEBYSIDE_IMAGE_FILENAME),
      filepathSideBySideSmall: this.#buildPath(metadata.pathPattern, attrs, SIDEBYSIDE_SMALL_IMAGE_FILENAME),
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
