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
        const p = document.createElement("p")

        Uploader.uploadFile(uploadInput.files[0], key, presignedUpload)
        .then(() => {
            p.innerHTML = `Image uploaded successfully. <a href="${presignedDownloadAfter}">Download Result</a>`
            var imgoriginal = document.createElement('img')
            imgoriginal.width = 240
            imgoriginal.src = presignedDownloadOriginal
            var imgafter = document.createElement('img')
            imgafter.width = 240
            imgafter.src = presignedDownloadAfter

            input.after(p)
            p.after(imgoriginal)
            imgoriginal.after(imgafter)
        })
        .catch((errorCode) => {
            if (errorCode === 'EntityTooLarge') {
                p.textContent = 'Image exceeded the 5mb size limit'
            } else if (errorCode === 'BadContentType') {
                p.textContent = 'File must be an image'
            } else {
                p.textContent = 'Error on upload'
            }
            input.after(p)
        })
    }
}