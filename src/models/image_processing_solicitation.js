import Database from '../models/database'
import {generic_uuid, base64, hmac} from '../shared/simple_crypto'
import {newOrderedId} from '../models/id_generator'
import {join} from 'path'

const ORIGINAL_IMAGE_FILENAME = 'pre.jpg'
const PROCESSED_IMAGE_FILENAME = 'after.jpg'
const SIDEBYSIDE_IMAGE_FILENAME = 'sidebyside.jpg'

class ImageProcessingSolicitation {
    constructor(attrs = {}) {
        this.id = attrs.id
        this.createdAt = attrs.createdAt
        this.ip = attrs.ip
        this.origin = attrs.origin
        this.email = attrs.email
        this.name = attrs.name
        this.phone = attrs.phone
        this.filepathOriginal = attrs.filepathOriginal
        this.filepathProcessed = attrs.filepathProcessed
        this.filepathSideBySide = attrs.filepathSideBySide
        this.accessPointId = attrs.accessPointId
    }

    static build(attrs) {
        const createdAt = attrs.createdAt || new Date().toISOString()
        const id = attrs.id || ImageProcessingSolicitation.newId()
        return new ImageProcessingSolicitation(Object.assign({
           id: id,
           createdAt: createdAt,
           filepathOriginal: join(id, ORIGINAL_IMAGE_FILENAME),
           filepathProcessed: join(id, PROCESSED_IMAGE_FILENAME),
           filepathSideBySide: join(id, SIDEBYSIDE_IMAGE_FILENAME),
        }, attrs))
    }

    save() {
        return Database.instance().save(this, `/image_processing_solicitations/${this.id}`)
    }

    static async get(id) {
        const data = await Database.instance().get(`/image_processing_solicitations/${id}`)
        return new ImageProcessingSolicitation(data)
    }

    static newId(createdAt) {
        return newOrderedId()
    }
}

export default ImageProcessingSolicitation
