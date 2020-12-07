import {GcloudPresignedCredentialsProvider} from './GcloudPresignedCredentialsProvider'
import {env} from '../../config/env'

const EXPIRATION_IN_SECONDS = 10 * 60
export class ImageProcessingService {
    constructor(credentialsProvider) {
        this.credentialsProvider = credentialsProvider
    }

    static build() {
        return new ImageProcessingService(GcloudPresignedCredentialsProvider.build())
    }

    credentialsFor(solicitation) {
        const jsonUploadConstraints = {
            keyName: solicitation.filepathOriginal,
            contentTypePrefix: 'image/',
            maxSizeInMegabytes: env.maxUploadSizeMb,
            expiresInSeconds: EXPIRATION_IN_SECONDS,
        }
        return {
            requestJsonToUpload: this.credentialsProvider.jsonToUpload(jsonUploadConstraints),
            requestUrlToGetOriginal: this.credentialsProvider.urlToGet(solicitation.filepathOriginal, {expiresInSeconds: EXPIRATION_IN_SECONDS}),
            requestUrlToGetProcessed: this.credentialsProvider.urlToGet(solicitation.filepathProcessed, {expiresInSeconds: EXPIRATION_IN_SECONDS}),
        }
    }
}
