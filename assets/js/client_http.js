class ClientHTTP {
    static post(url, data = null) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open("POST", url, true)
            xhr.send(data)
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const contentType = xhr.getResponseHeader('Content-Type');
                    const isJsonResponse = typeof(contentType) === 'string' && contentType.toLowerCase().includes('json');
                    if (isJsonResponse) resolve(JSON.parse(xhr.responseText))
                    else resolve(xhr.responseText)
                } else reject(xhr.responseText)
            }
        })
    }
}

export default ClientHTTP