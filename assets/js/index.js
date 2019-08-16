import Uploader from './uploader.js'
{
    var input = document.querySelector("input")
    input.addEventListener("change", (event) => {
        Uploader.getPresignedPost().then((presignedPost) => {
            Uploader.uploadFile(input.files[0], presignedPost)
        })
    })
}