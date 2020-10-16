import ClientHTTP from './client_http.js'
import {signer} from '../../src/shared/signer'
import {envShared} from '../../src/shared/envShared'

class DataForm {
  static submit(form, secret) {
    let data = {};
    let urlEncodedParts = []
    form.querySelectorAll("input").forEach((input) => {
      data[input.name] = input.value
      urlEncodedParts.push(`${input.name}=${encodeURIComponent(input.value)}`)
    })
    let urlEncoded = `${urlEncodedParts.join('&')}`
    return new Promise((resolve, reject) => {
      ClientHTTP.post({
        url: form.action,
        data: urlEncoded,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          [envShared.signatureHeaderName] : signer.sign(data, secret)
        }
      }).then(([response, httpStatus]) => {
        if (typeof(response) !== 'object' || httpStatus === 0) {
          reject([`Non-HTTP Error: ${response}`, httpStatus])
        } else {
          resolve([response, httpStatus])
        }
      }).catch(reject)
    })
  }
}
export default DataForm
