import {ApiClient} from '../models/database/ApiClient'
import {User} from '../models/database/User'
import {SmileTask} from '../models/database/SmileTask'

import {helpers} from '../routes/helpers'
import {asyncMiddleware} from './expressAsync'

export const getModel = new (class {
  get client() {
    return asyncMiddleware('getModel.client', async (req, res, next) => {
      const clientId = res.locals.dentClientId
      const client = await ApiClient.get(clientId)
      if (!client) {
        console.warn(`Unauthorized: Could not find client "${clientId}"`)
        return helpers.respondError(res, 403, "Not Authorized")
      }
      res.locals.dentClient = client
    })
  }

  get user() {
    return asyncMiddleware('getModel.user', async (req, res, next) => {
      const userId = req.params['userId']
      const user = await User.get(userId)
      if (!user) {
        return helpers.respondError(res, 404, "User not found")
      }
      res.locals.dentUser = user
    })
  }

  get smileTask() {
    return asyncMiddleware('getModel.smileTask', async (req, res, next) => {
      const smileTaskId = req.params['smileTaskId']
      const smileTask = await SmileTask.get(smileTaskId)
      if (!smileTask) {
        return helpers.respondError(res, 404, "SmileTask not found")
      }
      res.locals.dentSmileTask = smileTask
    })
  }
})()
