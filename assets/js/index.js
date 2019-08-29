import "regenerator-runtime/runtime"
import Uploader from './uploader.js'
import DataForm from './data_form.js'

{
    const userDataForm = document.getElementById('miroweb-data-form')
    const uploadForm = document.getElementById('miroweb-upload-form')
    const uploadButton = document.getElementById('miroweb-simulation-button')
    const uploadInput = uploadForm.querySelector("input[name=image]")

    uploadButton.addEventListener('click', onFormSubmit)
    uploadForm.addEventListener('submit', event => event.preventDefault())

    async function onFormSubmit(event) {
        var response = await DataForm.submit(userDataForm)
        const presignedUpload = response.presignedUpload
        const presignedDownloadOriginal = response.presignedDownloadOriginal
        const presignedDownloadAfter = response.presignedDownloadAfter
        const key = response.key

        document.querySelectorAll('p').forEach(e => e.remove())
        document.querySelectorAll('img').forEach(e => e.remove())
        const p = document.createElement("p")

        Uploader.uploadFile(uploadInput.files[0], key, presignedUpload)
        .then(() => {
            p.innerHTML = `Image uploaded successfully. <a href="${presignedDownloadAfter}">Download Result</a>`
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