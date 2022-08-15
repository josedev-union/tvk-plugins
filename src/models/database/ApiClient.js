import {idGenerator} from '../tools/idGenerator'
import {Database} from './Database'
import {InMemory as Cache} from '../../cache/InMemory'

import {timeInSeconds} from '../../utils/time'
const {SECONDS, MINUTES, HOURS, DAYS} = timeInSeconds

const API_CONFIG_ALLOWED_HOSTS = 'allowedHosts'
const API_CONFIG_RATE_LIMIT = 'rateLimit'
const API_CONFIG_DEFAULT = {
  [API_CONFIG_ALLOWED_HOSTS]: null,
  [API_CONFIG_RATE_LIMIT]: null,
}

const cache = Cache.build({
  cacheTTL: 1.0 * MINUTES,
  staleTTL: 3.0 * DAYS,
})

export class ApiClient {
    static get COLLECTION_NAME() {return 'api_clients'}

    constructor({id, secret, createdAt = null, updatedAt = null, apisConfig = null}) {
        this.id = id
        this.secret = secret
        this.createdAt = createdAt || Database.toTimestamp(new Date())
        this.updatedAt = updatedAt || this.createdAt
        this.apisConfig = apisConfig || {
          default: {...API_CONFIG_DEFAULT},
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

    apiMaxSuccessesPerSecond({api='default'}) {
      const rateLimitCfg = this.#getApiConfig({api, config: API_CONFIG_RATE_LIMIT}) || {}
      return rateLimitCfg.maxSuccessesPerSecond
    }
    setMaxSuccessesPerSecond({api='default', value}) {
      const rateLimitCfg = this.#rawGetApiConfig({api, config: API_CONFIG_RATE_LIMIT}) || {}
      rateLimitCfg.maxSuccessesPerSecond = value
      this.#setApiConfig({api, config: API_CONFIG_ALLOWED_HOSTS, value: rateLimitCfg})
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
        if (id === '/' || id === '' || !id) throw "Can't delete root"
        return Database.instance().delete(`/${ApiClient.COLLECTION_NAME}/${id}`)
    }

    static build() {
        return new ApiClient({
            id: this.newId(),
            secret: this.newSecret(),
        })
    }

    static newId() {
        return idGenerator.newOrderedId({uuidSize: 15})
    }

    static newSecret() {
        return idGenerator.newSecret()
    }
}
