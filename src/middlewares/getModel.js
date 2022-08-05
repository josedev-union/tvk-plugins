import {helpers} from '../routes/helpers'
import {ApiClient} from '../models/database/ApiClient'
import {User} from '../models/database/User'
import {SmileTask} from '../models/database/SmileTask'

export const getModel = new (class {
  async client(req, res, next) {
    return await helpers.redirectCatch(next, async () => {
      const clientId = res.locals.dentClientId
      const client = await ApiClient.get(clientId)
      if (!client) {
        console.warn(`Unauthorized: Could not find client "${clientId}"`)
        return helpers.respondError(res, 403, "Not Authorized")
      }
      res.locals.dentClient = client
      return next()
    })
  }

  async user(req, res, next) {
    return await helpers.redirectCatch(next, async () => {
      const userId = req.params['userId']
      const user = await User.get(userId)
      if (!user) {
        return helpers.respondError(res, 404, "User not found")
      }
      res.locals.dentUser = user
      return next()
    })
  }

  async smileTask(req, res, next) {
    return await helpers.redirectCatch(next, async () => {
      const smileTaskId = req.params['smileTaskId']
      const smileTask = await SmileTask.get(smileTaskId)
      if (!smileTask) {
        return helpers.respondError(res, 404, "SmileTask not found")
      }
      res.locals.dentSmileTask = smileTask
      return next()
    })
  }
})()
