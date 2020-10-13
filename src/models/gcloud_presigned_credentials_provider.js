import * as env from './env'
import {Storage} from '@google-cloud/storage'

class GcloudPresignedCredentialsProvider {
    constructor(bucket) {
        this.bucket = bucket
    }

    static build() {
        return new GcloudPresignedCredentialsProvider(new Storage().bucket(env.gcloudBucket))
    }

    jsonToUpload({keyName, expiresInSeconds, contentType, maxSizeInMegabytes}) {
        const options = {
            version: 'v4',
            action: 'write',
            contentType: 'application/octet-stream',
            expires: Date.now() + expiresInSeconds * 1000,
            // contentType: contentType,
            // conditions: [
            //     ['content-length-range', 0, maxSizeInMegabytes * 1024 * 1024],
            //     //['starts-with', '$Content-Type', contentTypePrefix],
            //     // ['eq', '$Content-Type', contentType],
            //     // ['starts-with', '$key', keyPrefix],
            // ]
        }
        return new Promise((resolve, reject) => {
            this.bucket.file(keyName).getSignedUrl(options)
            .then(([url]) => resolve(url))
            .catch((err) => reject(err))
        })
    }

    urlToGet(keyName, {expiresInSeconds}) {
        const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + expiresInSeconds * 1000,
        }
        return new Promise((resolve, reject) => {
            this.bucket.file(keyName).getSignedUrl(options)
            .then(([url]) => resolve(url))
            .catch((err) => reject(err))
        })
    }
}

export default GcloudPresignedCredentialsProvider
