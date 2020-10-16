import {Database} from "./Database"
import {simpleCrypto} from "../../shared/simpleCrypto"
import {logger} from '../../instrumentation/logger'
import {env} from "../../config/env"

const NAMESPACE = 'solicitation_rate_limit'
export class SolicitationRateLimit {
    constructor({limit, expiresIn}) {
        this.limit = limit
        this.expiresIn = expiresIn
    }

    static build() {
        return new SolicitationRateLimit({
            limit: 5,
            expiresIn: 24 * 60 * 60 * 1000 // milliseconds
        })
    }

    async add(solicitation) {
        if (env.rateLimitDisabled) return true
        const originCode = simpleCrypto.base64(solicitation.origin, {padding: false})
        const ipCode = simpleCrypto.base64(solicitation.ip, {padding: false})
        const emailCode = simpleCrypto.base64(solicitation.email, {padding: false})
        const ipPath = `/${NAMESPACE}/ips/${originCode}/${ipCode}`
        const emailPath = `/${NAMESPACE}/emails/${originCode}/${emailCode}`
        let [ipEntries, emailEntries] = await Promise.all([getFromDB(ipPath), getFromDB(emailPath)])
        ipEntries = ipEntries || []
        emailEntries = emailEntries || []
        const allowedByIp = this.haveAvailableSlotsOn(ipEntries, solicitation.id)
        const allowedByEmail = this.haveAvailableSlotsOn(emailEntries, solicitation.id)
        const allowed = allowedByIp && allowedByEmail
        if (allowed) {
            var entry = {solicitationId: solicitation.id, timestamp: new Date().getTime()}
            ipEntries.push(entry)
            emailEntries.push(entry)
            await Promise.all([setInDB(ipPath, ipEntries), setInDB(emailPath, emailEntries)])
        }
        return allowed
    }

    haveAvailableSlotsOn(entries, solicitationId) {
        if (entries.length >= this.limit) entries = cleanupExpiredOn(entries, this.expiresIn)
        if (entries.length < this.limit && entries.find(({listedSolicitationId}) => listedSolicitationId === solicitationId) === undefined) {
            return true
        } else {
            return false
        }
    }

    async addSolicitationOn(path, solicitationId) {
        let wasUpdated = true
        await Database.instance().transaction(path, (current_value) => {
            let a = current_value || []
            if (a.length >= this.limit) a = cleanupExpiredOn(a, this.expiresIn)
            if (a.length < this.limit && a.find(({listedSolicitationId}) => listedSolicitationId === solicitationId) === undefined) {
                a.push({solicitationId: solicitationId, timestamp: new Date().getTime()})
            } else {
                wasUpdated = false
            }
            return a
        })
        return wasUpdated
    }

    static deleteAll() {
        logger.info(`Deleting all SolicitationRateLimit entries.`)
        return Database.instance().delete(`/${NAMESPACE}/`)
    }
}

function getFromDB(path) {
    return Database.instance().get(path)
}

function setInDB(path, value) {
    return Database.instance().set(path, value)
}

function cleanupExpiredOn(array, expires_in) {
    let now = new Date().getTime()
    return array.filter(({timestamp}) => now - timestamp <= expires_in)
}