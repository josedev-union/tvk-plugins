import Database from '../models/database'
import {generic_uuid, base64, hmac} from '../shared/simple_crypto'
import {join} from 'path'

const ORIGINAL_IMAGE_FILENAME = 'pre.jpg'
const PROCESSED_IMAGE_FILENAME = 'after.jpg'

class ImageProcessingSolicitation {
    constructor(attrs = {}) {
        this.id = attrs.id
        this.createdAt = attrs.createdAt
        this.ip = attrs.ip
        this.origin = attrs.origin
        this.email = attrs.email
        this.name = attrs.name
        this.phone = attrs.phone
        this.imageFilepath = attrs.imageFilepath
        this.processedFilepath = attrs.processedFilepath
    }

    static build(attrs) {
        const createdAt = new Date()
        const id = attrs.id || ImageProcessingSolicitation.newId(createdAt)
        return new ImageProcessingSolicitation(Object.assign({
           id: id,
           createdAt: createdAt,
           imageFilepath: join(id, ORIGINAL_IMAGE_FILENAME),
           processedFilepath: join(id, PROCESSED_IMAGE_FILENAME),
        }, attrs))
    }

    save() {
        return Database.instance.save(this, `/image_processing_solicitations/${this.id}`)
    }

    static newId(createdAt) {
        return base64(`${createdAt.getTime()}${generic_uuid(8)}`, {padding: false})
    }
}

export default ImageProcessingSolicitation