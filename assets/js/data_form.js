import ClientHTTP from './client_http.js'
import * as signer from '../../src/shared/signer'

class DataForm {
  static submit(form, secret) {
    let data = {};
    let urlEncodedParts = []
    form.querySelectorAll("input").forEach((input) => {
      data[input.name] = input.value
      urlEncodedParts.push(`${input.name}=${encodeURIComponent(input.value)}`)
    })
    let urlEncoded = `${urlEncodedParts.join('&')}`
    return ClientHTTP.post({
      url: form.action,
      data: urlEncoded,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Miroweb-ID': signer.sign(data, secret)
      }
    })
  }
}
export default DataForm
