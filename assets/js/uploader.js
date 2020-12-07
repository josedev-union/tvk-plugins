import ClientHTTP from './client_http.js'

class Uploader {
  constructor() {
    this.onprogress = () => {}
  }

  uploadFile(file, key, presignedUploadData) {
      let data = new FormData()
      let headers = {}
      Object.keys(presignedUploadData.fields).forEach(key => {
          data.append(key, presignedUploadData.fields[key])
      })
      data.append('file', file)
      return ClientHTTP.post({
        url: presignedUploadData.url,
        data: data,
        headers: headers,
        onuploadprogress: this.onprogress
      }).then(([response, status]) => {
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
