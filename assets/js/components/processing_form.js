import Uploader from '../uploader.js'
import DataForm from '../data_form.js'
import {base64} from '../../../src/shared/simple_crypto'

class ProcessingForm {
  constructor(root) {
    this.root = root
    this.userDataForm = root.querySelector('.data-form')
    this.uploadForm = root.querySelector('.upload-form')
    this.uploadButton = root.querySelector('.processing-button')
    this.uploadInput = this.uploadForm.querySelector("input[name=image]")
    this.secret = this.uploadForm.querySelector("input[name=secret]").value
  }

  setup() {
    this.uploadButton.addEventListener('click', event => this.onFormSubmit(event))
    this.uploadForm.addEventListener('submit', event => event.preventDefault())
  }

  onFormSubmit(event) {
    DataForm.submit(this.userDataForm, this.secret)
    .then(([response, httpStatus]) => {
      this.uploadToS3(response)
    })
    .catch((error) => {
      let [response, httpStatus] = error
      if (this.onerror) {
        if (httpStatus === 400) {
          this.onerror({error: 'bad-solicitation-request', data: {data: response, status: httpStatus}})
        } else if(httpStatus === 403) {
          this.onerror({error: 'solicitation-denied', data: {data: response, status: httpStatus}})
        } else {
          this.onerror({error: 'unknown-solicitation-error', data: {data: response, status: httpStatus}})
        }
      }
    })
  }

  uploadToS3(response) {
    const presignedUpload = response.presignedUpload
    const key = response.key

    if (this.onstart) this.onstart()
    if (this.onprogress) this.onprogress('Uploading', 0)

    const uploader = new Uploader()
    uploader.onprogress = (percentage) => {
      if (this.onprogress) this.onprogress('Uploading', percentage)
    }
    uploader.uploadFile(this.uploadInput.files[0], key, presignedUpload)
    .then(() => this.trackProgress(response))
    .catch((errorCode) => {
      var msg
      if (errorCode === 'EntityTooLarge') {
        msg = 'Image exceeded the 5mb size limit'
      } else if (errorCode === 'BadContentType') {
        msg = 'File must be an image'
      } else {
        msg = 'Error on upload'
      }
      if (this.onerror) this.onerror({error: 'validation-error', data: msg})
    })
  }

  trackProgress(response) {
    const sessionId = response.sessionId

    if (this.onprogress) this.onprogress('Starting Processing', 0)
    waitFor(() => {
      return new Promise((resolve, reject) => {
        var idBase = `autosmile.dev.us/${sessionId}/`
        var processingId = base64(idBase)
        var url = `ws://${window.location.host}/ws/processings/${processingId}`
        console.log(url, idBase)
        var ws = new WebSocket(url)
        ws.onmessage = (msg) => {
          var data = JSON.parse(msg.data)
          if (data.event === "progress") {
            var percent = parseInt(data.percent * 100)
            if (this.onprogress) this.onprogress('Processing', percent)
          } else if (data.event === "start") {
            if (this.onprogress) this.onprogress('Processing', 0)
          } else if (data.event === "end") {
            resolve()
          } else {
            console.error('Unexpected WebSockets Message:', data)
            if (this.onerror) this.onerror({error: 'unexpected-websockets-error', data: data})
          }
        }
        ws.onclose = (event) => {
          if (event.code > 1000) {
            reject({error: 'websockets-bad-close', data: event})
          }
        }
      })
    }).then(() => {
      if (this.oncomplete) this.oncomplete(response)
    }).catch((error) => {
      const presignedDownloadAfter = response.presignedDownloadAfter
      waitFor(() => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('GET', presignedDownloadAfter, true)
          xhr.onload = () => {
            if (xhr.status >= 400) {
              reject()
            } else {
              resolve()
            }
          }
          xhr.onerror = () => reject()
          xhr.send()
        })
      }, 20000).then(() => {
        if (this.oncomplete) this.oncomplete(response)
      }).catch(() => {
        if (this.onerror) this.onerror(error)
      })
    })
  }
}

function waitFor(condition, timeout=10000) {
  const RETRYDELAY = 5000;
  return new Promise((resolve, reject) => {
    const tryAgain = (error) => {
      if (timeout <= 0) {
        reject(error)
      } else {
        setTimeout(() => {
          timeout -= RETRYDELAY
          condition()
            .then(resolve)
            .catch(tryAgain)
        }, RETRYDELAY)
      }
    }

    condition()
      .then(resolve)
      .catch(tryAgain)
  })
}

export default ProcessingForm
