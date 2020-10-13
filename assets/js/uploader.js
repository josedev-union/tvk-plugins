import ClientHTTP from './client_http.js'

class Uploader {
  constructor() {
    this.onprogress = () => {}
  }

  uploadFile(file, key, presignedUrl) {
      return ClientHTTP.put({
        url: presignedUrl,
        data: file,
        headers: {'Content-Type': 'application/octet-stream'},
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
