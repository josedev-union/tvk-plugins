import ClientHTTP from './client_http.js'

class Uploader {
    static uploadFile(file, key, presignedPost) {
        var data = new FormData()
        data.append('Key', key)
        data.append('Content-Type', file.type)
        Object.keys(presignedPost.fields).forEach(key => {
            data.append(key, presignedPost.fields[key])
        })
        data.append('file', file)
        return ClientHTTP.post(presignedPost.url, data).then(([response, status]) => {
            return new Promise((resolve, reject) => {
                if (status >= 400) {
                    const errorCode = response.match(/<Code>(\w+)<\/Code>/)[1]
                    const message = response.match(/<Message>([^<]+)<\/Message>/)[1]
                    if (message.includes('Content-Type')) {
                        reject('BadContentType')
                    } else reject(errorCode)
                } else {
                    resolve(response)
                }
            })
        })
    }
}
export default Uploader