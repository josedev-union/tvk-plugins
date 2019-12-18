import Uploader from '../uploader.js'
import DataForm from '../data_form.js'
import {base64} from '../../../src/shared/simple_crypto'

const TIMEOUT_TO_START_PROCESSING = 20000
const TIMEOUT_TO_FINISH_PROCESSING = 30000
const TIMEOUT_TO_IMAGE_GET_READY = 30000
const RETRY_DELAY = 2500


class ProcessingForm {
  constructor(root) {
    this.root = root
    this.userDataForm = root.querySelector('.data-form')
    this.uploadForm = root.querySelector('.upload-form')
    this.uploadButton = root.querySelector('.processing-button')
    this.uploadInput = this.uploadForm.querySelector("input[name=image]")
    this.secret = this.uploadForm.querySelector("input[name=secret]").value
    this.locked = false
  }

  setup() {
    this.uploadButton.addEventListener('click', event => this.onFormSubmit(event))
    this.uploadForm.addEventListener('submit', event => event.preventDefault())
  }

  onFormSubmit(event) {
    if (this.locked) return
    this.lock()
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
    console.log("Waiting for websockets connection")

    const promise = waitFor((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.onclose = (event) => {
        reject({error: 'websockets-could-not-connect', data: event})
      }
      ws.onopen = () => {
        ws.onclose = null
        resolve(ws)
      }
    }, TIMEOUT_TO_START_PROCESSING)

    promise.catch((error) => {
      console.warn('Could not connect to websockets', error)
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
      ws.onclose = null
      if (ws) ws.close()
      if (hasTimedout) {
        console.warn('Processing took too long', error)
        this.doImagePolling(response)
      } else {
        console.error('Critical error when receiving messages', error)
        this.emitError(error.error, error.data)
      }
    })

    return new Promise((resolve, reject) => promise.then(resolve))
  }

  doImagePolling(response) {
    console.warn('Starting image polling as fallback')
    let retriesCount = 0
    const maxRetries = Math.floor(TIMEOUT_TO_IMAGE_GET_READY / RETRY_DELAY)
    const presignedDownloadAfter = response.presignedDownloadAfter
    waitFor((resolve, reject) => {
      this.emitImagePollingTry(++retriesCount, maxRetries)
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
    .then(() => this.emitCompletion(response))
    .catch((err) => {
      console.error('Could not find the image on server', err)
      this.emitError('image-polling-timedout', 'Could not find the image on server.')
    })
  }

  emitError(error, data) {
    this.unlock()
    if (this.onerror) this.onerror({error: error, data: data})
  }

  emitCompletion(response) {
    this.unlock()
    if (this.oncomplete) this.oncomplete(response)
  }

  emitStart() {
    if (this.onstart) this.onstart()
  }

  emitProgress(stage, percent) {
    if (this.onprogress) this.onprogress(stage, percent)
  }

  emitImagePollingTry(count, max) {
    if (this.onimagepolling) this.onimagepolling(count, max)
  }

  lock() {
    this.locked = true
    this.uploadButton.disabled = true
  }

  unlock() {
    this.locked = false
    this.uploadButton.disabled = false
  }
}

function waitFor(condition, timeout) {
  let lastError = null
  let currentSchedule = null
  let timedout = false
  return new Promise((resolve, reject) => {
    timeoutFor((resolve, reject) => {
      let tryAgain = null

      const execCondition = () => {
        return new Promise((resolve, reject) => condition(resolve, reject))
          .then(resolve)
          .catch(tryAgain)
      }

      tryAgain = (error) => {
        if (timedout) return
        lastError = error
        currentSchedule = setTimeout(() => execCondition(), RETRY_DELAY)
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
