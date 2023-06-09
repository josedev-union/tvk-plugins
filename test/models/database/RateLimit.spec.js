import {Factory} from 'rosie'
import {RateLimit} from '../../../src/models/database/RateLimit'
import {clearRedis, quitRedis, quitBuffersRedis, quitRedisPubsub} from '../../../src/config/redis'
import '../../../src/config/config'

describe(`limit the amount of the slots within a timeframe`, () => {
    test(`can not use more than the limit on the same slot`, async () => {
        await clearRedis()
        const rateLimit = new RateLimit({limit: 2, expiresIn: 24*60*60*1000})
        const firstAllowed = await rateLimit.useSlotFrom('bucket1')
        const secondAllowed = await rateLimit.useSlotFrom('bucket1')
        const thirdAllowed = await rateLimit.useSlotFrom('bucket1')
        expect(firstAllowed).toBe(true)
        expect(secondAllowed).toBe(true)
        expect(thirdAllowed).toBe(false)
    })

    test(`when using multiple slots at once can be blocked by any of them`, async () => {
        await clearRedis()
        const rateLimit = new RateLimit({limit: 2, expiresIn: 24*60*60*1000})
        const firstAllowed = await rateLimit.useSlotFrom('bucket1')
        const secondAllowed = await rateLimit.useSlotFrom(['bucket1', 'bucket2'])
        const thirdAllowed = await rateLimit.useSlotFrom(['bucket1', 'bucket2'])
        expect(firstAllowed).toBe(true)
        expect(secondAllowed).toBe(true)
        expect(thirdAllowed).toBe(false)
    })

    test(`slots expires after the configured time`, async () => {
        await clearRedis()
        let rateLimit = new RateLimit({limit: 2, expiresIn: 20})
        const firstAllowed = await rateLimit.useSlotFrom('bucket1')
        const secondAllowed = await rateLimit.useSlotFrom('bucket1')
        await new Promise((resolve, reject) => setTimeout(resolve, 40))
        const thirdAllowed = await rateLimit.useSlotFrom('bucket1')
        expect(firstAllowed).toBe(true)
        expect(secondAllowed).toBe(true)
        expect(thirdAllowed).toBe(true)
    })
})

afterAll(async () => {
  await quitRedis()
  await quitBuffersRedis()
  await quitRedisPubsub()
})
