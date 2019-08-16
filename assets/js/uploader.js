import ClientHTTP from './client_http.js'

class Uploader {
    static uploadFile(file, presignedPost) {
        var data = new FormData()
        Object.keys(presignedPost.fields).forEach(key => {
            data.append(key, presignedPost.fields[key])
        })
        data.append('file', file)
        return ClientHTTP.post(presignedPost.url, data)
    }

    static getPresignedPost() {
        return ClientHTTP.post("/uploadCredentials")
    }
}
export default Uploader