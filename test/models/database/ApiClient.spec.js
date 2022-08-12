import {ApiClient} from '../../../src/models/database/ApiClient'
import { Factory } from 'rosie'
import '../../../src/config/config'
import {firebaseHelpers} from '../../helpers/firebaseHelpers'

beforeAll(async () => {
  await firebaseHelpers.ensureTestEnv()
})
beforeEach(async () => {
  await firebaseHelpers.clearFirestore()
})

describe('static', () => {
  describe('client get by id', () => {
    test(`return the client if it exist`, async () => {
      const client = Factory.build('api_client', {})
      await client.save()

      const clientfound = await ApiClient.get(client.id)
      expect(clientfound.id).toEqual(client.id)
      expect(clientfound.secret).toEqual(client.secret)
    })

    test(`return null if client doesn't exist`, async () => {
      const clientnotfound = await ApiClient.get('nonexistentid')
      expect(clientnotfound).toEqual(null)
    })
  })
})

describe('instance', () => {
  describe('api config allowed hosts', () => {
    test(`gives priority to specific config instead of default`, async () => {
      const client = Factory.build('api_client', {
        apisConfig: {
          simulations: { 'allowedHosts': ['https://simulations.com'] },
          default: { 'allowedHosts': ['https://default.com'] },
        }
      })
      await client.save()

      expect(client.apiAllowedHosts({api: 'simulations'})).toEqual(['https://simulations.com'])
      expect(client.apiAllowedHosts({api: 'default'})).toEqual(['https://default.com'])

      const clientfound = await ApiClient.get(client.id)
      expect(clientfound.apiAllowedHosts({api: 'simulations'})).toEqual(['https://simulations.com'])
      expect(clientfound.apiAllowedHosts({api: 'default'})).toEqual(['https://default.com'])
    })

    test(`gives default config if it hasn't specific one`, async () => {
      const client = Factory.build('api_client', {
        apisConfig: {
          default: { 'allowedHosts': ['https://default.com'] },
        }
      })
      await client.save()

      expect(client.apiAllowedHosts({api: 'simulations'})).toEqual(['https://default.com'])
      expect(client.apiAllowedHosts({api: 'default'})).toEqual(['https://default.com'])

      const clientfound = await ApiClient.get(client.id)
      expect(clientfound.apiAllowedHosts({api: 'simulations'})).toEqual(['https://default.com'])
      expect(clientfound.apiAllowedHosts({api: 'default'})).toEqual(['https://default.com'])
    })

    test(`add new hosts`, async () => {
      const client = Factory.build('api_client')
      client.addApiAllowedHost({api: 'default', host: 'https://default.com'})

      expect(client.apiAllowedHosts({api: 'simulations'})).toEqual(['https://default.com'])
      expect(client.apiAllowedHosts({api: 'default'})).toEqual(['https://default.com'])

      client.addApiAllowedHost({api: 'simulations', host: 'https://simulations.com'})
      expect(client.apiAllowedHosts({api: 'simulations'})).toEqual(['https://simulations.com'])
      expect(client.apiAllowedHosts({api: 'default'})).toEqual(['https://default.com'])
    })

    test(`clear hosts`, async () => {
      const client = Factory.build('api_client', {
        apisConfig: {
          simulations: { 'allowedHosts': ['https://simulations.com'] },
          default: { 'allowedHosts': ['https://default.com'] },
        }
      })

      expect(client.apiAllowedHosts({api: 'simulations'})).toEqual(['https://simulations.com'])
      client.clearApiAllowedHosts({api: 'simulations'})
      console.log('--- --- API CLIENT --- ---')
      console.log(client)

      expect(client.apiAllowedHosts({api: 'simulations'})).toEqual(['https://default.com'])
      expect(client.apiAllowedHosts({api: 'default'})).toEqual(['https://default.com'])

      client.clearApiAllowedHosts({api: 'default'})
      expect(client.apiAllowedHosts({api: 'simulations'})).toEqual([])
      expect(client.apiAllowedHosts({api: 'default'})).toEqual([])
    })
  })
})
