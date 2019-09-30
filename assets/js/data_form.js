import ClientHTTP from './client_http.js'
import * as signer from '../../src/models/signer'

class DataForm {
    static async submit(form, secret) {
        var data = {};
        form.querySelectorAll("input")
            .forEach((input) => data[input.name] = input.value)
        let [response, _] = await ClientHTTP.post({
            url: form.action,
            body: JSON.stringify(data),
            headers: {
                'Content-Type': "application/json",
                'Miroweb-ID': signer.sign(data, secret)
            }
        })
        return response
    }
}
export default DataForm