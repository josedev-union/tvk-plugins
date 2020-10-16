import {GcloudPresignedCredentialsProvider} from './GcloudPresignedCredentialsProvider'

const EXPIRATION_IN_SECONDS = 10 * 60
export class ImageProcessingService {
    constructor(credentialsProvider) {
        this.credentialsProvider = credentialsProvider
    }

    static build() {
        return new ImageProcessingService(GcloudPresignedCredentialsProvider.build())
    }

    credentialsFor(solicitation) {
        // const pathWithoutExtension = solicitation.filepathOriginal.replace(/[^\.]+$/, '')
        const jsonUploadConstraints = {
            keyName: solicitation.filepathOriginal,
            contentType: 'image/jpeg',
            maxSizeInMegabytes: 15,
            expiresInSeconds: EXPIRATION_IN_SECONDS,
        }
        return {
            requestJsonToUpload: this.credentialsProvider.jsonToUpload(jsonUploadConstraints),
            requestUrlToGetOriginal: this.credentialsProvider.urlToGet(solicitation.filepathOriginal, {expiresInSeconds: EXPIRATION_IN_SECONDS}),
            requestUrlToGetProcessed: this.credentialsProvider.urlToGet(solicitation.filepathProcessed, {expiresInSeconds: EXPIRATION_IN_SECONDS}),
        }
    }
}