class ClientHTTP {
    static post(url, data = null, contentType = null) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open("POST", url, true)
            if(contentType !== null) xhr.setRequestHeader("Content-Type", contentType)
            xhr.send(data)
            const onResponse = () => {
                const contentType = xhr.getResponseHeader('Content-Type');
                const isJsonResponse = typeof(contentType) === 'string' && contentType.toLowerCase().includes('json');
                const data = isJsonResponse ? JSON.parse(xhr.responseText) : xhr.responseText
                resolve([data, xhr.status])
            }

            xhr.onload = onResponse
            xhr.onerror = onResponse
        })
    }
}

export default ClientHTTP