import DentistAccessPoint from '../../src/models/dentist_access_point.js'
import * as signer from '../../src/shared/signer'
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

test('get configured slug to the website', async () => {
    var access = Factory.build('dentist_access_point', {directPage: {slug: 'my-host', disabled: false}})
    expect(access.slug()).toBe('my-host')
})

test('verify slug matching', async () => {
    var access = Factory.build('dentist_access_point', {directPage: {slug: 'My-Host', disabled: false}})
    expect(access.matchSlug('My-Host')).toBe(true)
    expect(access.matchSlug('my-host')).toBe(true)
    expect(access.matchSlug('MY-HOST')).toBe(true)
    expect(access.matchSlug('myhost')).toBe(false)
})

test(`get email from mirosmiles user if customEmail wasn't set`, async () => {
    await Database.instance().drop()
    const user = Factory.build('miro_smiles_user')
    user.save()
    const accessEmailNull = Factory.build('dentist_access_point', {customEmail: null, userId: user.id})
    const accessEmailEmpty = Factory.build('dentist_access_point', {customEmail: '', userId: user.id})
    await expect(accessEmailNull.email()).resolves.toEqual(user.email)
    await expect(accessEmailEmpty.email()).resolves.toEqual(user.email)
})

test(`get custom email`, async () => {
    await Database.instance().drop()
    const access = Factory.build('dentist_access_point', {customEmail: 'customemail@fgmail.com'})
    await expect(access.email()).resolves.toEqual('customemail@fgmail.com')
})

test(`get null email when has no user and no customEmail`, async () => {
    await Database.instance().drop()
    const access = Factory.build('dentist_access_point', {customEmail: null})
    await expect(access.email()).resolves.toEqual(null)
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
      await Database.instance().drop()
      const access1 = Factory.build('dentist_access_point')
      const access2 = Factory.build('dentist_access_point')
      access1.addHost('xpto.com')
      access1.addHost('xpto2.com')
      access2.addHost('xpto.com')
      access2.addHost('xpto3.com')
      await access1.save()
      await access2.save()
      const accessPoints = await DentistAccessPoint.getAll()
      const ids = accessPoints.map((access) => access.id)
      expect(ids.length).toBe(2)
      expect(ids).toContain(access1.id)
      expect(ids).toContain(access2.id)
    })

    test('get all access points for specific host', async () => {
      await Database.instance().drop()
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
      const ids = accessPoints.map((access) => access.id)
      expect(ids.length).toBe(2)
      expect(ids).toContain(access1.id)
      expect(ids).toContain(access2.id)
    })

    test('get all access points if is master host', async () => {
      await Database.instance().drop()
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
      const accessPoints = await DentistAccessPoint.allForHost('localhost')
      const ids = accessPoints.map((access) => access.id)
      expect(ids.length).toBe(3)
      expect(ids).toContain(access1.id)
      expect(ids).toContain(access2.id)
      expect(ids).toContain(access3.id)
    })

    test('find the access point that match host and the parameters serialization', async () => {
      await Database.instance().drop()
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
      const params = {user: {name: 'Dr. Suresh', telephone: '+5521999999999'}}
      const access2signature = signer.sign(params, access2.secret)
      const accessFound = await DentistAccessPoint.findOne(params, 'http://xpto.com/random/page', access2signature)
      expect(accessFound.id).toBe(access2.id)
    })

    test('find the access point for direct page access', async () => {
      await Database.instance().drop()
      const access1 = Factory.build('dentist_access_point', {directPage: {slug: 'access-1', disabled: false}})
      const access2 = Factory.build('dentist_access_point', {directPage: {slug: 'access-2', disabled: false}})
      const access3 = Factory.build('dentist_access_point', {directPage: {slug: 'access-3', disabled: false}})
      access1.addHost('xpto.com')
      access1.addHost('xpto2.com')
      access2.addHost('xpto.com')
      access2.addHost('xpto3.com')
      access3.addHost('xpto2.com')
      access3.addHost('xpto3.com')
      await access1.save()
      await access2.save()
      await access3.save()

      const accessFound1 = await DentistAccessPoint.findForDirectPage('access-2', 'http://xpto.com/random/page')
      expect(accessFound1.id).toBe(access2.id)

      const accessFound2 = await DentistAccessPoint.findForDirectPage('access-1', '')
      expect(accessFound2.id).toBe(access1.id)

      const accessNotFound1 = await DentistAccessPoint.findForDirectPage('access-3', 'http://xpto.com/random/page')
      expect(accessNotFound1).toBe(null)

      const accessNotFound2 = await DentistAccessPoint.findForDirectPage('access-unknown', 'http://xpto.com/random/page')
      expect(accessNotFound2).toBe(null)
    })
})
