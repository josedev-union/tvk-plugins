import {Database} from '../database/Database'
import {idGenerator} from '../tools/idGenerator'
import {sanitizer} from '../tools/sanitizer'
import {Enum} from '../tools/Enum'
import {join} from 'path'

const ORIGINAL_IMAGE_FILENAME = 'smile.jpg'
const PROCESSED_IMAGE_FILENAME = 'smile_after.jpg'
const SIDEBYSIDE_IMAGE_FILENAME = 'sidebyside.jpg'
const FOLDER_NAMESPACE = 'ml-images'

export const SolicitationRequesterType = new Enum([
    'dentist',
    'patient',
])

const INFO_FIELDS = {
  [SolicitationRequesterType.patient()]: ['ip', 'origin', 'email', 'name', 'phone'],
  [SolicitationRequesterType.dentist()]: ['ip', 'deviceId'],
}

export class ImageProcessingSolicitation {
    static get COLLECTION_NAME() { return 'image_processing_solicitations' }

    constructor(attrs = {}) {
        this.id = attrs.id
        this.createdAt = attrs.createdAt
        this.accessPointId = attrs.accessPointId

        this.filepathOriginal = attrs.filepathOriginal
        this.filepathProcessed = attrs.filepathProcessed
        this.filepathSideBySide = attrs.filepathSideBySide

        this.requester = attrs.requester
    }

    static requestedByPatient(attrs) {
        const requesterType = SolicitationRequesterType.patient()
        const finalAttrs = ImageProcessingSolicitation.#prepareBuildAttrs(requesterType, attrs)
        return new ImageProcessingSolicitation(finalAttrs)
    }

    static requestedByDentist(attrs) {
        const requesterType = SolicitationRequesterType.dentist()
        const finalAttrs = ImageProcessingSolicitation.#prepareBuildAttrs(requesterType, attrs)
        return new ImageProcessingSolicitation(finalAttrs)
    }

    save() {
        return Database.instance().save(this, `${ImageProcessingSolicitation.COLLECTION_NAME}/${this.id}`)
    }

    static async get(id) {
        const data = await Database.instance().get(`${ImageProcessingSolicitation.COLLECTION_NAME}/${id}`)
        return new ImageProcessingSolicitation(data)
    }

    static newId(createdAt) {
        return idGenerator.newOrderedId()
    }

    static #prepareBuildAttrs(requesterType, attrs) {
        let id = attrs.id || ImageProcessingSolicitation.newId()
        return Object.assign({
          id: id,
          createdAt: attrs.createdAt || Database.toTimestamp(new Date()),
          requester: {
            type: requesterType,
            info: sanitizer.onlyKeys(attrs, INFO_FIELDS[requesterType]),
          },
          filepathOriginal: join(FOLDER_NAMESPACE, id, ORIGINAL_IMAGE_FILENAME),
          filepathProcessed: join(FOLDER_NAMESPACE, id, PROCESSED_IMAGE_FILENAME),
          filepathSideBySide: join(FOLDER_NAMESPACE, id, SIDEBYSIDE_IMAGE_FILENAME),
        }, attrs)
    }
}
