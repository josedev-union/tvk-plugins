import {ApiClient} from '../../../src/models/database/ApiClient'
import { Factory } from 'rosie'
import '../../../src/config/config'
import {firebaseHelpers} from '../../helpers/firebaseHelpers'
import {InMemory as Cache} from '../../../src/cache/InMemory'

beforeAll(async () => {
  await firebaseHelpers.ensureTestEnv()
})
beforeEach(async () => {
  await firebaseHelpers.clearFirestore()
  Cache.clear()
})
afterEach(async () => {
  Cache.clear()
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

  describe('all', () => {
    test(`return all clients`, async () => {
      const client1 = Factory.build('api_client', {})
      await client1.save()
      const client2 = Factory.build('api_client', {})
      await client2.save()


      const clients = await ApiClient.all()
      const client1Found = clients.find(c => c.id === client1.id)
      const client2Found = clients.find(c => c.id === client2.id)
      expect(client1Found).toEqual(client1)
      expect(client2Found).toEqual(client2)
      expect(clients.length).toEqual(2)
    })

    test(`cache the response`, async () => {
      const client1 = Factory.build('api_client', {})
      await client1.save()
      await ApiClient.all()

      const client2 = Factory.build('api_client', {})
      await client2.save()

      const clients = await ApiClient.all()
      const client1Found = clients.find(c => c.id === client1.id)
      const client2Found = clients.find(c => c.id === client2.id)
      expect(client1Found).toEqual(client1)
      expect(client1Found.constructor).toBe(ApiClient)
      expect(client2Found).toBeUndefined()
      expect(clients.length).toEqual(1)
    })

    test(`return empty array if there're no clients`, async () => {
      const clients = await ApiClient.all()
      expect(clients).toEqual([])
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

      expect(client.apiAllowedHosts({api: 'simulations'})).toEqual(['https://default.com'])
      expect(client.apiAllowedHosts({api: 'default'})).toEqual(['https://default.com'])

      client.clearApiAllowedHosts({api: 'default'})
      expect(client.apiAllowedHosts({api: 'simulations'})).toEqual([])
      expect(client.apiAllowedHosts({api: 'default'})).toEqual([])
    })
  })
})
