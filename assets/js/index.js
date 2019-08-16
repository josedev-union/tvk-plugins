class Uploader {
    static uploadFile(file) {
        return this.getPresignedPost().then((json) => {
            var data = new FormData()
            Object.keys(json.fields).forEach(key => {
                data.append(key, json.fields[key])
            })
            data.append('file', file)
            return this.post(json.url, data)
        })
    }

    static getPresignedPost() {
        return this.post("/uploadCredentials")
    }

    static post(url, data = null) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open("POST", url, true)
            xhr.send(data)
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
                else reject(xhr.responseText)
            }
        })
    }
}

var input = document.querySelector("input")
input.addEventListener("change", (event) => {
    Uploader.uploadFile(input.files[0])
})