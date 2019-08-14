import AWS from 'aws-sdk'

AWS.config.update({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    signatureVersion: 'v4',
})

class Uploader {
    constructor(s3) {
        this.s3 = s3
    }

    presignedPost() {
        const params = {
            Bucket: 'autosmile.dev.us',
            Key: 'xpto/pre.jpg',
            Fields: {
                Key: 'xpto/pre.jpg',
            },
            Expires: 10 * 60, // 10 min
            ContentType: 'image/jpeg',
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

export default Uploader