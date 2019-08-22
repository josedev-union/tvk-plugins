import ClientHTTP from './client_http.js'

class DataForm {
    static async submit(form) {
        var data = {};
        form.querySelectorAll("input")
            .forEach((input) => data[input.name] = input.value)
        let [response, _] = await ClientHTTP.post(form.action, JSON.stringify(data), "application/json")
        return response
    }
}
export default DataForm