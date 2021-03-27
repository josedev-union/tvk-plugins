import {GcloudPresignedCredentialsProvider} from './GcloudPresignedCredentialsProvider'
import {env} from '../../config/env'

const EXPIRATION_IN_SECONDS = 10 * 60
export class SmileResourcesGuide {
    constructor(credentialsProvider) {
        this.credentialsProvider = credentialsProvider
    }

    static build() {
        return new SmileResourcesGuide(GcloudPresignedCredentialsProvider.build())
    }

    async uploadDescriptor(smileTask, {overwriteImageName=false}={}) {
        let keyName = smileTask.filepathUploaded
        if (overwriteImageName) {
          keyName = keyName.replace(/[^\/]+(\..*)$/, `${overwriteImageName}$1`)
        }
        return await this.credentialsProvider.jsonToUpload({
            keyName: keyName,
            contentType: smileTask.contentType,
            contentMD5: smileTask.imageMD5,
            maxSizeInMegabytes: env.maxUploadSizeMb,
            expiresInSeconds: EXPIRATION_IN_SECONDS,
        })
    }

    async uplodedDescriptorGet(smileTask) {
        return await this.credentialsProvider.urlToGet(
            smileTask.filepathUploaded,
            {
                expiresInSeconds: EXPIRATION_IN_SECONDS
            }
        )
    }

    async resultDescriptorGet(smileTask) {
        return await this.credentialsProvider.urlToGet(
            smileTask.filepathResult,
            {
                expiresInSeconds: EXPIRATION_IN_SECONDS
            }
        )
    }
}
