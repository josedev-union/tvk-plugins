import AWS from 'aws-sdk'

class S3PresignedCredentialsProvider {
    constructor(s3, bucket) {
        this.s3 = s3
        this.bucket = bucket
    }

    static build() {
        return new S3PresignedCredentialsProvider(new AWS.S3(), process.env.MIROWEB_S3_BUCKET)
    }

    jsonToUpload({keyPrefix, expiresInSeconds, contentTypePrefix, maxSizeInMegabytes}) {
        const params = {
            Bucket: this.bucket,
            Expires: expiresInSeconds,
            Conditions: [
                ['content-length-range', 0, maxSizeInMegabytes * 1024 * 1024],
                ['starts-with', '$key', keyPrefix],
                ['starts-with', '$Content-Type', contentTypePrefix],
            ]
        }
        return new Promise((resolve, reject) => {
            this.s3.createPresignedPost(params, (err, data) => {
                if (err) reject(err)
                else resolve(data)
            })
        })
    }

    urlToGet(keyName, {expiresInSeconds}) {
        const params = {
            Bucket: this.bucket,
            Expires: expiresInSeconds,
            Key: keyName,
        }
        return new Promise((resolve, reject) => {
            this.s3.getSignedUrl('getObject', params, (err, url) => {
                if (err) reject(err)
                else resolve(url)
            })
        })
    }
}

export default S3PresignedCredentialsProvider