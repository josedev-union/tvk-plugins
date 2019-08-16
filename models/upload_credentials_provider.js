import AWS from 'aws-sdk'

class UploadCredentialsProvider {
    constructor(s3, bucket, contentType) {
        this.s3 = s3
        this.bucket = bucket
        this.contentType = contentType
    }

    static forImage(s3) {
        return new UploadCredentialsProvider(new AWS.S3(), 'autosmile.dev.us', 'image/*')
    }

    presignedPostFor(key, {expiresInSeconds}) {
        const params = {
            Bucket: this.bucket,
            Key: key,
            Fields: {Key: key},
            Expires: expiresInSeconds,
            ContentType: this.contentType,
            // Conditions: [
            //     ['starts-with', '$key', '/path/to/key']
            // ]
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