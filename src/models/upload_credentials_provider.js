import AWS from 'aws-sdk'

class UploadCredentialsProvider {
    constructor(s3, {bucket, contentTypePrefix, maxSizeInMegabytes}) {
        this.s3 = s3
        this.bucket = bucket
        this.contentTypePrefix = contentTypePrefix
        this.maxSizeInMegabytes = maxSizeInMegabytes
    }

    static forImageUpload(s3) {
        return new UploadCredentialsProvider(new AWS.S3(), {
            bucket: process.env.MIROWEB_S3_BUCKET, 
            contentTypePrefix: 'image/',
            maxSizeInMegabytes: 5,
        })
    }

    presignedPostFor(keyName, {expiresInSeconds}) {
        const params = {
            Bucket: this.bucket,
            Expires: expiresInSeconds,
            Conditions: [
                ['content-length-range', 0, this.maxSizeInMegabytes * 1024 * 1024],
                ['starts-with', '$key', keyName + '.'],
                ['starts-with', '$Content-Type', this.contentTypePrefix],
            ]
        }
        return new Promise((resolve, reject) => {
            this.s3.createPresignedPost(params, (err, data) => {
                if (err) reject(err)
                else resolve(data)
            })
        })
    }
}

export default UploadCredentialsProvider