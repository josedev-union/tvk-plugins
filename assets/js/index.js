import Uploader from './uploader.js'
{
    var input = document.querySelector("input")
    input.addEventListener("change", (event) => {
        Uploader.getPresignedData().then(([{presignedUpload, presignedDownloadOriginal, presignedDownloadAfter}, _]) => {
            document.querySelectorAll('p').forEach(e => e.remove())
            const p = document.createElement("p")
            Uploader.uploadFile(input.files[0], presignedUpload)
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
        })
    })
}