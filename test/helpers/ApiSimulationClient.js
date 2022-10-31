import {simpleCrypto} from "../../src/shared/simpleCrypto"
import FormData from 'form-data'

const ROUTE_PUBLIC_NAMESPACE = '/public-api/'
const ROUTE_BACKEND_NAMESPACE = '/api/'
const ORTHO_SIMULATION_PATH = 'simulations/ortho'
const COSMETIC_SIMULATION_PATH = 'simulations/cosmetic'
const SIMULATION_PATH = 'simulations/:ID'
const BODY_FORMAT_FORMDATA = 'formdata'
const BODY_FORMAT_JSON = 'json'
const AUTH_FORMAT_SIGNED_CLAIMS = 'signed-claims'
const AUTH_FORMAT_SIMPLE_CLAIMS = 'simple-claims'
const AUTH_FORMAT_QUERYSTRING_CLIENT_ID = 'querystring-client-id'

export class ApiSimulationClient {
  constructor({sendRequest}) {
    this.sendRequest = sendRequest
  }

  async doRequest(cfg) {
    const mode = cfg.mode || 'ortho'
    let route = null
    let method = 'post'
    if (mode === 'ortho') {
      route = ORTHO_SIMULATION_PATH
    } else if (mode === 'cosmetic') {
      route = COSMETIC_SIMULATION_PATH
    } else if (mode === 'update') {
      route = SIMULATION_PATH.replace(':ID', cfg.id)
      method = 'patch'
    }
    Object.assign(cfg, {method, route})
    return this.#requestWithInterface(cfg)
  }

  async #requestWithInterface({host, method, route, params={}, origin,
    credentials={}, format={}}) {
    const {clientId, clientSecret, recaptchaToken} = credentials
    if(!format.body) format.body = BODY_FORMAT_FORMDATA
    if(!format.auth) format.auth = AUTH_FORMAT_SIGNED_CLAIMS

    if (format.body === BODY_FORMAT_JSON) {
      params = {data: params['data']}
    }

    const fields = this.#paramsToFields(params)

    const routeNamespace = format.isPublicCall ? ROUTE_PUBLIC_NAMESPACE : ROUTE_BACKEND_NAMESPACE

    let routePath = routeNamespace + route
    const query = {}
    let bodyData = null
    const headers = {'Accept': 'application/json'}

    if (format.isPublicCall && origin) {
      headers['Origin'] = origin
    }

    if (format.body === BODY_FORMAT_FORMDATA) {
      const form = this.#fieldsToFormData(fields)
      bodyData = form.getBuffer()
      headers['Content-Type'] = 'multipart/form-data;boundary=' + form.getBoundary()
    } else if (format.body === BODY_FORMAT_JSON) {
      bodyData = fields['data']['value']
      headers['Content-Type'] = 'application/json'
    } else {
      throw new Error(`Couldn't recognize format.body ${format.body}`)
    }

    if (format.auth === AUTH_FORMAT_SIGNED_CLAIMS) {
      const signature = await this.#generateSignature({fields, credentials})
      headers['Authorization'] = 'Bearer ' + signature
    } else if (format.auth === AUTH_FORMAT_SIMPLE_CLAIMS) {
      headers['Authorization'] = 'Bearer ' + simpleCrypto.base64(JSON.stringify({clientId}))
    } else if (format.auth === AUTH_FORMAT_QUERYSTRING_CLIENT_ID) {
      query['clientId'] = clientId
    } else {
      throw new Error(`Couldn't recognize format.body ${format.body}`)
    }
    return this.sendRequest({
      baseURL: host,
      method,
      url: routePath,
      query,
      responseType: 'json',
      headers,
      data: bodyData,
      fields,
    })
  }

  async #generateSignature({fields, credentials}) {
    const paramsHashedEntries = await Promise.all(
      Object.entries(fields).map(([key, {value: val}]) => {
        return Promise.resolve(val).then((val) => {
          var hashed = simpleCrypto.md5(val)
          return [key, hashed]
        })
      })
    )

    const paramsHashed = Object.fromEntries(paramsHashedEntries)
    const claims = {
      'clientId': credentials.clientId,
      'paramsHashed': paramsHashed
    }
    if (credentials.recaptchaToken) {
      claims['recaptchaToken'] = credentials.recaptchaToken
    }
    const claimsJson = JSON.stringify(claims)
    const claimsSigned = simpleCrypto.hmac(claimsJson, credentials.clientSecret)
    const claimsBase64 = simpleCrypto.base64(claimsJson)
    return `${claimsBase64}:${claimsSigned}`
  }

  #paramsToFields(params) {
    const fields = {}
    Object.entries(params).forEach(([fieldName, fieldval]) => {
      const fieldInfo = {fieldName, originalValue: fieldval}
      if (fieldName.startsWith('img')) {
        const filename = `${fieldName}.jpg`
        const contentType = 'image/jpeg'
        Object.assign(fieldInfo, {filename, contentType})
      } else {
        if (fieldval.constructor === Object) {
          fieldval = JSON.stringify(fieldval)
        }
      }
      fields[fieldName] = {value: fieldval, ...fieldInfo}
    })
    return fields
  }

  #fieldsToFormData(fields) {
    const form = new FormData()
    Object.entries(fields).forEach(([fieldName, fieldInfo]) => {
      const {filename, contentType, value} = fieldInfo
      if (filename) {
        form.append(fieldName, value, {filename, contentType})
      } else {
        form.append(fieldName, value)
      }
    })
    return form
  }

  async #fileAsBinary(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader()
      reader.onloadend = function() {
        resolve(reader.result)
      }
      reader.readAsBinaryString(file)
    })
  }

}
