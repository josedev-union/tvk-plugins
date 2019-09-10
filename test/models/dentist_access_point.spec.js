import DentistAccessPoint from '../../src/models/dentist_access_point.js'
import { Factory } from 'rosie'

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
})