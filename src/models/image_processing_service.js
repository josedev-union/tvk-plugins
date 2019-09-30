import S3PresignedCredentialsProvider from '../models/s3_presigned_credentials_provider'

const EXPIRATION_IN_SECONDS = 10 * 60
class ImageProcessingService {
    constructor(credentialsProvider) {
        this.credentialsProvider = credentialsProvider
    }

    static build() {
        return new ImageProcessingService(S3PresignedCredentialsProvider.build())
    }

    credentialsFor(solicitation) {
        const pathWithoutExtension = solicitation.imageFilepath.replace(/[^\.]+$/, '')
        const jsonUploadConstraints = {
            keyPrefix: pathWithoutExtension,
            contentTypePrefix: 'image/',
            maxSizeInMegabytes: 5,
            expiresInSeconds: EXPIRATION_IN_SECONDS,
        }
        return {
            requestJsonToUpload: this.credentialsProvider.jsonToUpload(jsonUploadConstraints),
            requestUrlToGetOriginal: this.credentialsProvider.urlToGet(solicitation.imageFilepath, {expiresInSeconds: EXPIRATION_IN_SECONDS}),
            requestUrlToGetProcessed: this.credentialsProvider.urlToGet(solicitation.processedFilepath, {expiresInSeconds: EXPIRATION_IN_SECONDS}),
        }
    }
}

export default ImageProcessingService