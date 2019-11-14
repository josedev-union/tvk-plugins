import "regenerator-runtime/runtime"
import Uploader from './uploader.js'
import DataForm from './data_form.js'
import {base64} from '../../src/shared/simple_crypto'

{
    const userDataForm = document.getElementById('miroweb-data-form')
    const uploadForm = document.getElementById('miroweb-upload-form')
    const uploadButton = document.getElementById('miroweb-simulation-button')
    const uploadInput = uploadForm.querySelector("input[name=image]")
    const secret = uploadForm.querySelector("input[name=secret]").value

    uploadButton.addEventListener('click', onFormSubmit)
    uploadForm.addEventListener('submit', event => event.preventDefault())

    async function onFormSubmit(event) {
        var response = await DataForm.submit(userDataForm, secret)
        const presignedUpload = response.presignedUpload
        const presignedDownloadOriginal = response.presignedDownloadOriginal
        const presignedDownloadAfter = response.presignedDownloadAfter
        const sessionId = response.sessionId
        const key = response.key

        document.querySelectorAll('p').forEach(e => e.remove())
        document.querySelectorAll('img').forEach(e => e.remove())
        const p = document.createElement("p")

      // TODO: Uploader progress
        Uploader.uploadFile(uploadInput.files[0], key, presignedUpload)
        .then(() => {
            p.innerHTML = `Image uploaded successfully. <a href="${presignedDownloadAfter}">Download Result</a>`
            waitFor(() => {
                return new Promise((resolve, reject) => {
                  var idBase = `autosmile.dev.us/${sessionId}/`
                  var processingId = base64(idBase)
                  var url = `ws://${window.location.host}/ws/processings/${processingId}`
                  console.log(url, idBase)
                  var ws = new WebSocket(url)
                  ws.onopen = function() { console.log("open") }
                  ws.onmessage = function(msg) {
                    var data = JSON.parse(msg.data)
                    if (data.event === "progress") {
                      var percent = parseInt(data.percent * 1000) / 10.0
                      console.log(`${percent}%`)
                    } else if (data.event === "end") {
                      console.log("Processing Ended")
                      resolve()
                    }
                  }
                  ws.onerror = reject
                })
            }).then(() => {
                var imgoriginal = document.createElement('img')
                imgoriginal.height = 240
                imgoriginal.src = presignedDownloadOriginal
                var imgafter = document.createElement('img')
                imgafter.height = 240
                imgafter.src = presignedDownloadAfter

                uploadInput.after(p)
                p.after(imgoriginal)
                imgoriginal.after(imgafter)
            })
        })
        .catch((errorCode) => {
            if (errorCode === 'EntityTooLarge') {
                p.textContent = 'Image exceeded the 5mb size limit'
            } else if (errorCode === 'BadContentType') {
                p.textContent = 'File must be an image'
            } else {
                p.textContent = 'Error on upload'
            }
            uploadInput.after(p)
        })
    }

    function waitFor(condition) {
        return new Promise((resolve, reject) => {
            const tryAgain = () => {
                setTimeout(() => {
                    condition()
                        .then(resolve)
                        .catch(tryAgain)
                }, 1000)
            }

            condition()
                .then(resolve)
                .catch(tryAgain)
        })
    }
}
