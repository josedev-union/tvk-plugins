import DentistAccessPoint from '../../src/models/dentist_access_point.js'
import { Factory } from 'rosie'
import Database from '../../src/models/database'
import '../../src/config'

const ID_PATTERN = /^[0-9A-Za-z+/]+$/
const SECRET_PATTERN = /^[0-9A-Za-z]+$/

test('can add new hosts', () => {
    var access = Factory.build('dentist_access_point')
    access.addHost('myhost.com')
    expect(access.hosts).toEqual(['myhost.com'])
})

test('normalize hosts when adding them', () => {
    var access = Factory.build('dentist_access_point')
    access.addHost('http://myhost.com')
    access.addHost('https://myhost.com')
    access.addHost('https://myhost2.com')
    access.addHost('ftp://myhost3.com.br/')
    access.addHost('myhost3.com.br')
    access.addHost('myhost4.com.br:81')
    access.addHost('http://myhost5.com.br:81/')
    access.addHost('http://user:pass@myhost6.com.br:81/')
    access.addHost('http://user@myhost7.com.br:81/')
    expect(access.hosts).toEqual([
      'myhost.com',
      'myhost2.com',
      'myhost3.com.br',
      'myhost4.com.br:81',
      'myhost5.com.br:81',
      'myhost6.com.br:81',
      'myhost7.com.br:81'
    ])
})

test('change updatedAt when saving', async () => {
    var access = Factory.build('dentist_access_point')
    access.addHost('http://myhost.com')
    await access.save()
    let oldUpdatedAt = access.updatedAt
    access.addHost('https://myhost2.com')
    await access.save()
    expect(access.updatedAt).not.toBe(oldUpdatedAt)
})

describe('static', () => {
    test('build a new access point', () => {
        const access = DentistAccessPoint.build({hosts: ['myhost.com']})
        expect(access.id).toMatch(ID_PATTERN)
        expect(access.secret).toMatch(SECRET_PATTERN)
        expect(access.hosts).toEqual(['myhost.com'])
    })

    test('generates unique ids', () => {
        const id1 = DentistAccessPoint.newId()
        const id2 = DentistAccessPoint.newId()
        expect(id1).toMatch(ID_PATTERN)
        expect(id2).toMatch(ID_PATTERN)
        expect(id1).not.toEqual(id2)
    })

    test('generates unique secrets', () => {
        const secret1 = DentistAccessPoint.newSecret()
        const secret2 = DentistAccessPoint.newSecret()
        expect(secret1).toMatch(SECRET_PATTERN)
        expect(secret2).toMatch(SECRET_PATTERN)
        expect(secret1).not.toEqual(secret2)
    })

    test('get all access points', async () => {
      await Database.instance.drop()
      const access1 = Factory.build('dentist_access_point')
      const access2 = Factory.build('dentist_access_point')
      access1.addHost('xpto.com')
      access1.addHost('xpto2.com')
      access2.addHost('xpto.com')
      access2.addHost('xpto3.com')
      await access1.save()
      await access2.save()
      const accessPoints = await DentistAccessPoint.getAll()
      expect(accessPoints).toEqual([access1, access2])
    })

    test('get all access points for specific host', async () => {
      await Database.instance.drop()
      const access1 = Factory.build('dentist_access_point')
      const access2 = Factory.build('dentist_access_point')
      const access3 = Factory.build('dentist_access_point')
      access1.addHost('xpto.com')
      access1.addHost('xpto2.com')
      access2.addHost('xpto.com')
      access2.addHost('xpto3.com')
      access3.addHost('xpto2.com')
      access3.addHost('xpto3.com')
      await access1.save()
      await access2.save()
      await access3.save()
      const accessPoints = await DentistAccessPoint.allForHost('xpto.com')
      expect(accessPoints).toEqual([access1, access2])
    })
})