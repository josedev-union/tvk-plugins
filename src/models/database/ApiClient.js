import {idGenerator} from '../tools/idGenerator'
import {Database} from './Database'
import {InMemory as Cache} from '../../cache/InMemory'

import {timeInSeconds} from '../../utils/time'
const {SECONDS, MINUTES, HOURS, DAYS} = timeInSeconds

const API_CONFIG_ENABLED = 'enabled'
const API_CONFIG_ALLOWED_HOSTS = 'allowedHosts'
const API_CONFIG_RATE_LIMIT = 'rateLimit'
const API_CONFIG_RECAPTCHA = 'recaptcha'
const API_CONFIG_CUSTOM_BUCKET = 'customBucket'
const NEW_API_CONFIG_DEFAULT = () => {
  return {
    [API_CONFIG_ENABLED]: true,
    [API_CONFIG_ALLOWED_HOSTS]: null,
    [API_CONFIG_RATE_LIMIT]: null,
    [API_CONFIG_RECAPTCHA]: {},
    [API_CONFIG_CUSTOM_BUCKET]: null,
  }
}

const cache = Cache.build({
  cacheTTL: 5.0 * MINUTES,
  staleTTL: 3.0 * DAYS,
})

export class ApiClient {
    static get COLLECTION_NAME() {return 'api_clients'}

    constructor({id, secret, exposedSecret, createdAt = null, updatedAt = null, revoked=false, apisConfig = null}) {
        this.id = id
        this.secret = secret
        this.exposedSecret = exposedSecret
        this.createdAt = createdAt || Database.toTimestamp(new Date())
        this.updatedAt = updatedAt || this.createdAt
        this.revoked = revoked
        this.apisConfig = apisConfig || {
          default: NEW_API_CONFIG_DEFAULT(),
        }
    }

    addApiAllowedHost({api='default', host}) {
      const hosts = this.#rawGetApiConfig({api, config: API_CONFIG_ALLOWED_HOSTS}) || []
      hosts.push(host)
      this.#setApiConfig({api, config: API_CONFIG_ALLOWED_HOSTS, value: hosts})
      return hosts
    }

    clearApiAllowedHosts({api='default'}) {
      this.#setApiConfig({api, config: API_CONFIG_ALLOWED_HOSTS, value: null})
    }

    apiAllowedHosts({api='default', host}) {
      return this.#getApiConfig({api, config: API_CONFIG_ALLOWED_HOSTS}) || []
    }

    apiIsEnabled({api='default'}) {
      const configValue = this.#getApiConfig({api, config: API_CONFIG_ENABLED})
      if (typeof(configValue) === 'undefined') return true
      return configValue
    }
    enableApi({api='default'}) {
      return this.#setApiConfig({api, config: API_CONFIG_ENABLED, value: true})
    }
    disableApi({api='default', value}) {
      return this.#setApiConfig({api, config: API_CONFIG_ENABLED, value: false})
    }

    customBucket({api='default'}) {
      return this.#getApiConfig({api, config: API_CONFIG_CUSTOM_BUCKET})
    }
    setCustomBucket({api='default', bucket}) {
      return this.#setApiConfig({api, config: API_CONFIG_CUSTOM_BUCKET, value: bucket})
    }

    isRevoked() {
      return this.revoked === true
    }

    static async all() {
      return cache.wrap({
        key: 'ApiClient.all',
        op: async () => {
          const db = Database.instance()
          const query = db.startQuery(ApiClient.COLLECTION_NAME)
          return db.getResults(ApiClient, query)
        }
      })
    }

    static async getAllAllowedHosts({api: apiId}) {
      return cache.wrap({
        key: `ApiClient.getAllAllowedHosts:${apiId}`,
        op: async () => {
          const clients = await ApiClient.all()
          return clients.flatMap((c) => c.apiAllowedHosts({api: apiId}))
        }
      })
    }

    apiMaxSuccessesPerSecond({api='default'}) {
      const rateLimitCfg = this.#getApiConfig({api, config: API_CONFIG_RATE_LIMIT}) || {}
      return rateLimitCfg.maxSuccessesPerSecond
    }
    setMaxSuccessesPerSecond({api='default', value}) {
      const rateLimitCfg = this.#rawGetApiConfig({api, config: API_CONFIG_RATE_LIMIT}) || {}
      rateLimitCfg.maxSuccessesPerSecond = value
      this.#setApiConfig({api, config: API_CONFIG_RATE_LIMIT, value: rateLimitCfg})
    }

    apiRecaptcha({api='default'}) {
      const recaptchaCfg = this.#getApiConfig({api, config: API_CONFIG_RECAPTCHA}) || {}
      return recaptchaCfg
    }

    setApiRecaptcha({api='default'}, {secret, minScore}) {
      const recaptchaCfg = this.#rawGetApiConfig({api, config: API_CONFIG_RECAPTCHA}) || {}
      if (secret) recaptchaCfg.secret = secret
      if (minScore) recaptchaCfg.minScore = minScore
      this.#setApiConfig({api, config: API_CONFIG_RECAPTCHA, value: recaptchaCfg})
    }

    save() {
        this.updatedAt = Database.toTimestamp(new Date())
        this.createdAt = this.createdAt || this.updatedAt
        const data = Object.assign({}, this)
        delete data.id
        return Database.instance().save(data, `${ApiClient.COLLECTION_NAME}/${this.id}`)
    }

    #setApiConfig({api, config, value}) {
      if (!this.apisConfig) {
        this.apisConfig = {}
      }
      if (!this.apisConfig[api]) {
        this.apisConfig[api] = {}
      }
      this.apisConfig[api][config] = value
    }

    #rawGetApiConfig({api, config}) {
      if (!this.apisConfig) return null
      if (!(api in this.apisConfig)) return null
      return this.apisConfig[api][config]
    }

    #getApiConfig({api, config}) {
      let value = this.#rawGetApiConfig({api, config})
      if (typeof(value) === 'undefined' || value == null) {
        value = this.#rawGetApiConfig({api: 'default', config})
      }
      return value
    }

    static async get(id, skipCache=false) {
      const data = await cache.wrap({
        key: `ApiClient:${id}`,
        skip: skipCache,
        op: async () => {
          return Database.instance().get(`${ApiClient.COLLECTION_NAME}/${id}`)
        }
      })
      if (!data) return null
      data.id = id
      return new ApiClient(data)
    }

    static destroy(id) {
        if (id === '/' || id === '' || !id) throw new Error("Can't delete root")
        return Database.instance().delete(`/${ApiClient.COLLECTION_NAME}/${id}`)
    }

    static build({idSuffix}={}) {
        let id = this.newId()
        if (idSuffix) {
          id = `${id}_${idSuffix}`
        }
        return new ApiClient({
            id,
            secret: this.newSecret(),
            exposedSecret: this.newSecret(),
        })
    }

    static newId() {
        return idGenerator.newOrderedId()
    }

    static newSecret() {
        return idGenerator.newSecret()
    }
}
