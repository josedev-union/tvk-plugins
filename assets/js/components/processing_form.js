import Uploader from '../uploader.js'
import DataForm from '../data_form.js'
import {base64} from '../../../src/shared/simple_crypto'

const TIMEOUT_TO_START_PROCESSING = 20000
const TIMEOUT_TO_FINISH_PROCESSING = 20000
const TIMEOUT_TO_IMAGE_GET_READY = 20000

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
      const [response, httpStatus] = error
      if (httpStatus === 400) {
        this.emitError('bad-solicitation-request', {data: response, status: httpStatus})
      } else if (httpStatus === 403) {
        this.emitError('solicitation-denied', {data: response, status: httpStatus})
      } else {
        this.emitError('unknown-solicitation-error', {data: response, status: httpStatus})
      }
    })
  }

  uploadToS3(response) {
    const presignedUpload = response.presignedUpload
    const key = response.key

    this.emitStart()
    this.emitProgress('Uploading', 0)

    const uploader = new Uploader()
    uploader.onprogress = (percentage) => this.emitProgress('Uploading', percentage)
    uploader.uploadFile(this.uploadInput.files[0], key, presignedUpload)
    .catch((errorCode) => {
      let msg
      if (errorCode === 'EntityTooLarge') {
        msg = 'Image exceeded the 5mb size limit'
      } else if (errorCode === 'BadContentType') {
        msg = 'File must be an image'
      } else {
        msg = 'Error on upload'
      }
      this.emitError('validation-error', msg)
    })
    .then(() => this.trackProgress(response))
  }

  trackProgress(response) {
    this.emitProgress('Waiting processing start', 0)

    this.openWebsocketsConnection(response)
    .then((ws) => this.waitForMessages(ws, response))
    .then(() => {
      this.emitCompletion(response)
    })
  }

  openWebsocketsConnection(response) {
    const bucket = response.bucket
    const sessionId = response.sessionId

    let idBase = `${bucket}/${sessionId}/`
    let processingId = base64(idBase)
    let url = `ws://${window.location.host}/ws/processings/${processingId}`
    console.log(url, idBase)
    console.log("WAITING FOR CONNECTION")

    const promise = waitFor((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.onclose = (event) => {
        console.log("Connection Closed...")
        reject({error: 'websockets-could-not-connect', data: event})
      }
      ws.onopen = () => {
        console.log("Connection Opened...")
        ws.onclose = null
        resolve(ws)
      }
    }, TIMEOUT_TO_START_PROCESSING)

    promise.catch((error) => {
      console.log("IMAGE POLLING (could not connect)")
      this.doImagePolling(response)
    })
    
    return new Promise((resolve, reject) => promise.then(resolve))
  }

  waitForMessages(ws, response) {
    const promise = timeoutFor((resolve, reject) => {
      console.log("Waiting for messages...")
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data)
        if (data.event === 'progress') {
          const percent = parseInt(data.percent * 100)
          this.emitProgress('Processing', percent)
        } else if (data.event === 'start') {
          this.emitProgress('Processing', 0)
        } else if (data.event === 'finished') {
          resolve()
        } else {
          reject({error: 'unexpected-websockets-error', data: data})
        }
      }
    }, TIMEOUT_TO_FINISH_PROCESSING)

    promise.catch(([hasTimedout, error]) => {
      console.error("Error", `timedout: ${hasTimedout}`, error)
      ws.onclose = null
      if (ws) ws.close()
      if (hasTimedout) {
        this.doImagePolling(response)
      } else {
        this.emitError(error.error, error.data)
      }
    })

    return new Promise((resolve, reject) => promise.then(resolve))
  }

  doImagePolling(response) {
    const presignedDownloadAfter = response.presignedDownloadAfter
    console.log("WAITING FOR IMAGE")
    waitFor((resolve, reject) => {
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
    }, TIMEOUT_TO_IMAGE_GET_READY)
    .then(() => this.emitCompletion())
    .catch(() => this.emitError('image-polling-timedout', 'Could not find the image on the server.'))
  }

  emitError(error, data) {
    if (this.onerror) this.onerror({error: error, data: data})
  }

  emitCompletion(response) {
    if (this.oncomplete) this.oncomplete(response)
  }

  emitStart() {
    if (this.onstart) this.onstart()
  }

  emitProgress(stage, percent) {
    if (this.onprogress) this.onprogress(stage, percent)
  }
}

function waitFor(condition, timeout) {
  const RETRYDELAY = 2500;
  let lastError = null
  let currentSchedule = null
  let timedout = false
  return new Promise((resolve, reject) => {
    timeoutFor((resolve, reject) => {
      let tryAgain = null

      const execCondition = () => {
        new Promise((resolve, reject) => condition(resolve, reject))
          .then(resolve)
          .catch(tryAgain)
      }

      tryAgain = (error) => {
        if (timedout) return
        lastError = error
        currentSchedule = setTimeout(() => execCondition(), RETRYDELAY)
      }

      execCondition()
    }, timeout)
    .then(resolve)
    .catch(([hasTimedout, ...args]) => {
      if (hasTimedout) timedout = true
      if (currentSchedule) {
        clearInterval(currentSchedule)
      }
      reject(lastError)
    })
  })
}

function timeoutFor(condition, timeout) {
  let finished = false
  return new Promise((resolve, reject) => {
    const timeoutTimer = setTimeout(() => {
      if (!finished) reject([true])
    }, timeout)

    new Promise((resolve, reject) => condition(resolve, reject))
      .then((...args) => {
        finished = true
        clearInterval(timeoutTimer)
        resolve(...args)
      })
      .catch((...args) => {
        finished = true
        clearInterval(timeoutTimer)
        reject([false, ...args])
      })
  })
}

export default ProcessingForm
