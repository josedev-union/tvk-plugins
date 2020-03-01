import {Factory} from 'rosie'
import Database from '../../src/models/database'
import SolicitationRateLimit from '../../src/models/solicitation_rate_limit'
import Solicitation from '../../src/models/image_processing_solicitation'
import '../../src/config'

describe(`add solicitations`, () => {
    test(`can not add more than the limit on the same ip`, async () => {
        await Database.instance().drop()
        let rateLimit = new SolicitationRateLimit({limit: 2, expiresIn: 24*60*60*1000})
        const sol1 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", origin: 'localhost:3000'}))
        const sol2 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", origin: 'localhost:3000'}))
        const sol3 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", origin: 'localhost:3000'}))
        const sol1Allowed = await rateLimit.add(sol1)
        const sol2Allowed = await rateLimit.add(sol2)
        const sol3Allowed = await rateLimit.add(sol3)
        expect(sol1Allowed).toBe(true)
        expect(sol2Allowed).toBe(true)
        expect(sol3Allowed).toBe(false)
    })

    test(`can not add more than the limit on the same email`, async () => {
        await Database.instance().drop()
        let rateLimit = new SolicitationRateLimit({limit: 2, expiresIn: 24*60*60*1000})
        const sol1 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
        const sol2 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.2", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
        const sol3 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.3", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
        const sol1Allowed = await rateLimit.add(sol1)
        const sol2Allowed = await rateLimit.add(sol2)
        const sol3Allowed = await rateLimit.add(sol3)
        expect(sol1Allowed).toBe(true)
        expect(sol2Allowed).toBe(true)
        expect(sol3Allowed).toBe(false)
    })

    test(`limit is set per origin`, async () => {
        await Database.instance().drop()
        let rateLimit = new SolicitationRateLimit({limit: 2, expiresIn: 24*60*60*1000})
        const sol1 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
        const sol2 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
        const sol3 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail@fgmail.com", origin: 'localhost2:3000'}))
        const sol1Allowed = await rateLimit.add(sol1)
        const sol2Allowed = await rateLimit.add(sol2)
        const sol3Allowed = await rateLimit.add(sol3)
        expect(sol1Allowed).toBe(true)
        expect(sol2Allowed).toBe(true)
        expect(sol3Allowed).toBe(true)
    })

    test(`slots are expired after the configured time`, async () => {
        await Database.instance().drop()
        let rateLimit = new SolicitationRateLimit({limit: 2, expiresIn: 20})
        const sol1 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
        const sol2 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
        const sol3 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
        const sol1Allowed = await rateLimit.add(sol1)
        const sol2Allowed = await rateLimit.add(sol2)
        await new Promise((resolve, reject) => setTimeout(resolve, 40))
        const sol3Allowed = await rateLimit.add(sol3)
        expect(sol1Allowed).toBe(true)
        expect(sol2Allowed).toBe(true)
        expect(sol3Allowed).toBe(true)
    })

    test(`don't persist anything if solicitation is denied`, async () => {
        await Database.instance().drop()
        let rateLimit = new SolicitationRateLimit({limit: 1, expiresIn: 10000})
        const sol1 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
        const sol2 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail2@fgmail.com", origin: 'localhost:3000'}))
        const sol3 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.2", email: "anemail2@fgmail.com", origin: 'localhost:3000'}))
        const sol1Allowed = await rateLimit.add(sol1)
        const sol2Allowed = await rateLimit.add(sol2)
        const sol3Allowed = await rateLimit.add(sol3)
        expect(sol1Allowed).toBe(true)
        expect(sol2Allowed).toBe(false)
        expect(sol3Allowed).toBe(true)
    })
})

test(`delete all entries`, async () => {
    await Database.instance().drop()
    let rateLimit = new SolicitationRateLimit({limit: 1, expiresIn: 10000})
    const sol1 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
    const sol2 = Solicitation.build(Factory.attributes('image_processing_solicitation', {ip: "127.0.0.1", email: "anemail@fgmail.com", origin: 'localhost:3000'}))
    const sol1Allowed = await rateLimit.add(sol1)
    await SolicitationRateLimit.deleteAll()
    const sol2Allowed = await rateLimit.add(sol2)
    expect(sol1Allowed).toBe(true)
    expect(sol2Allowed).toBe(true)
})
