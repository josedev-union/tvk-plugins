import AWS from 'aws-sdk'

class GetFileCredentialsProvider {
    static presignedGetFor(keyName, {expiresInSeconds, s3, bucket}) {
        if (s3 === undefined) s3 = new AWS.S3()
        if (bucket === undefined) bucket = process.env.MIROWEB_S3_BUCKET
        const params = {
            Bucket: bucket,
            Expires: expiresInSeconds,
            Key: keyName,
        }
        return new Promise((resolve, reject) => {
            s3.getSignedUrl('getObject', params, (err, url) => {
                if (err) reject(err)
                else resolve(url)
            })
        })
    }
}

export default GetFileCredentialsProvider