import Database from "../models/database"
import {base64} from "../shared/simple_crypto"
import { promises } from "fs"

class SolicitationRateLimit {
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
        let originCode = base64(solicitation.origin, {padding: false})
        let ipCode = base64(solicitation.ip, {padding: false})
        let emailCode = base64(solicitation.email, {padding: false})
        let ipPath = `/solicitation_rate_limit/ips/${originCode}/${ipCode}`
        let emailPath = `/solicitation_rate_limit/emails/${originCode}/${emailCode}`
        let [hasSlotOnIp, hasSlotOnEmail] = await Promise.all([
            this.addSolicitationOn(ipPath, solicitation.id),
            this.addSolicitationOn(emailPath, solicitation.id),
        ])
        return hasSlotOnIp && hasSlotOnEmail
    }

    async addSolicitationOn(path, solicitationId) {
        let wasUpdated = true
        await Database.instance.transaction(path, (current_value) => {
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
}

function cleanupExpiredOn(array, expires_in) {
    let now = new Date().getTime()
    return array.filter(({timestamp}) => now - timestamp <= expires_in)
}

export default SolicitationRateLimit