import Uploader from './uploader.js'
{
    var input = document.querySelector("input")
    input.addEventListener("change", (event) => {
        Uploader.getPresignedPost().then(([presignedPost, _]) => {
            document.querySelectorAll('p').forEach(e => e.remove())
            const p = document.createElement("p")
            Uploader.uploadFile(input.files[0], presignedPost)
            .then(() => {
                p.textContent = 'Image uploaded successfully'
                input.after(p)
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