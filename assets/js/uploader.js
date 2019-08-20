import ClientHTTP from './client_http.js'

class Uploader {
    static uploadFile(file, presignedPost) {
        var data = new FormData()
        const extension = file.name.match(/([^.]+)$/)[1]
        data.append('Key', 'xpto/xpto/pre.' + extension)
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
                    console.log(message, message.includes('Content-Type'))
                    if (message.includes('Content-Type')) {
                        reject('BadContentType')
                    } else reject(errorCode)
                } else {
                    resolve(response)
                }
            })
        })
    }

    static getPresignedData() {
        return ClientHTTP.post("/uploadCredentials")
    }
}
export default Uploader