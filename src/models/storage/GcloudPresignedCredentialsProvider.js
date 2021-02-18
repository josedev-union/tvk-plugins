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

    async jsonToUpload({keyName, expiresInSeconds, contentType, contentMD5, maxSizeInMegabytes}) {
        const extensionHeaders = {
          'x-goog-content-length-range': `0,${maxSizeInMegabytes*1024*1024}`
        }
        const options = {
            version: 'v4',
            action: 'write',
            contentType: contentType,
            expires: Date.now() + expiresInSeconds * 1000,
            contentMd5: contentMD5,
            extensionHeaders: extensionHeaders,
        }

        const [url] = await this.bucket.file(keyName).getSignedUrl(options)

        const uploadHeaders = Object.assign({
          "Content-MD5": contentMD5,
          "Content-Type": contentType,
        }, extensionHeaders)
        return this.#buildRequestDescriptor('put', url, uploadHeaders)
    }

    async urlToGet(keyName, {expiresInSeconds}) {
        const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + expiresInSeconds * 1000,
        }
        const [url] = await this.bucket.file(keyName).getSignedUrl(options)

        return this.#buildRequestDescriptor('get', url)
    }

    #buildRequestDescriptor(verb, url, headers={}) {
      return {
        verb: verb,
        url: url,
        headers: headers,
      }
    }
}
