import DentistAccessPoint from '../../src/models/dentist_access_point.js'
import { Factory } from 'rosie'

jest.mock('firebase-admin')
import admin from 'firebase-admin'
const refMock = {}
refMock.once = jest.fn(() => Promise.resolve({
  "97415f9cecf782e931a3737fc70d81a87b425e18": {
    hosts: [ 'xpto.com', 'xpto2.com' ],
    id: '97415f9cecf782e931a3737fc70d81a87b425e18',
    secret: 'MGZkMTRjYzMwNTYxMjM0NjVlNjExZDA1NjMzMDMzY2ExY2YxZjIxZDk1NDU3NjUyNTM1MWYyNDkzZjgwZGRiZA'
  },
  "a8cbd26dba547994880472b1dda27ca4eb1ae23b": {
    hosts: [ 'xpto.com', 'xpto3.com' ],
    id: 'a8cbd26dba547994880472b1dda27ca4eb1ae23b',
    secret: 'MzRhZjFkZjI4MWM4YTljNmQwMzgzNzM4ZjgzYjRhMTRmODhjMDg0MmRlMDRkZjU3YmI2N2ZiYmJlNDNkZWZiMg'
  }
}))
admin.ref = jest.fn(() => refMock)

const ID_PATTERN = /^[-0-9a-f]+$/
const SECRET_PATTERN = /^[0-9A-Za-z]+$/

test('can add new hosts', () => {
    var access = Factory.build('dentist_access_point')
    access.addHost('myhost.com')
    expect(access.hosts).toEqual(['myhost.com'])
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

    test('get all access points', () => {
      DentistAccessPoint.getAll().then((all) => {
        expect(all).toEqual([
          {
            hosts: [ 'xpto.com', 'xpto2.com' ],
            id: '97415f9cecf782e931a3737fc70d81a87b425e18',
            secret: 'MGZkMTRjYzMwNTYxMjM0NjVlNjExZDA1NjMzMDMzY2ExY2YxZjIxZDk1NDU3NjUyNTM1MWYyNDkzZjgwZGRiZA'
          },
          {
            hosts: [ 'xpto.com', 'xpto3.com' ],
            id: 'a8cbd26dba547994880472b1dda27ca4eb1ae23b',
            secret: 'MzRhZjFkZjI4MWM4YTljNmQwMzgzNzM4ZjgzYjRhMTRmODhjMDg0MmRlMDRkZjU3YmI2N2ZiYmJlNDNkZWZiMg'
          }
        ])
      })
    })
})