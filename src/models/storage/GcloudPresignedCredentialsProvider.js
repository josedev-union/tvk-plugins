import {env} from '../../config/env'
import {storageFactory} from './storageFactory'
import path from 'path'

export class GcloudPresignedCredentialsProvider {
    constructor(bucket) {
        this.bucket = bucket
    }

    static build() {
        return new GcloudPresignedCredentialsProvider(storageFactory().bucket(env.gcloudBucket))
    }

    jsonToUpload({keyName, expiresInSeconds, contentTypePrefix, maxSizeInMegabytes}) {
        const options = {
            expires: Date.now() + expiresInSeconds * 1000,
            conditions: [
                ['content-length-range', 0, maxSizeInMegabytes * 1024 * 1024],
                // ['starts-with', '$Content-Type', contentTypePrefix],
            ]
        }
        return new Promise((resolve, reject) => {
            this.bucket.file(keyName).generateSignedPostPolicyV4(options)
            .then(([response]) => {
                resolve(response)
            })
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
