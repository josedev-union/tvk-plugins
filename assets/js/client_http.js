class ClientHTTP {
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

export default ClientHTTP