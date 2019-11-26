const ONE_KILOBYTE = 1024

class ClientHTTP {
  static post({url, data, headers = {}, onuploadprogress = () => {}}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", url, true)
      for (let name in headers) {
        xhr.setRequestHeader(name, headers[name])
      }
      const onResponse = () => {
        const contentType = xhr.getResponseHeader('Content-Type');
        const isJsonResponse = typeof(contentType) === 'string' && contentType.toLowerCase().includes('json');
        const data = isJsonResponse ? JSON.parse(xhr.responseText) : xhr.responseText
        if (xhr.status <= 299) resolve([data, xhr.status])
        else reject([data, xhr.status])
      }

      xhr.onload = onResponse
      xhr.onerror = onResponse
      xhr.upload.onprogress = (evt) => {
        if (evt.total >= ONE_KILOBYTE) {
          const percentage = Math.round(evt.loaded / evt.total * 100)
          onuploadprogress(percentage)
        }
      }
      xhr.send(data)
    })
  }
}

export default ClientHTTP
