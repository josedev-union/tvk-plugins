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
        throw new RichError({
          publicId: 'not-authorized',
          debugId: 'bad-token',
          httpCode: 403,
          debugMessage: `Unauthorized: Could not find client "${clientId}"`,
          debugDetails: {clientId},
          publicMessage: 'Not Authorized',
          logAsWarning: true,
        })
      }
      res.locals.dentClient = client
    })
  }

  get user() {
    return asyncMiddleware('getModel.user', async (req, res, next) => {
      const userId = req.params['userId']
      const user = await User.get(userId)
      if (!user) {
        throw new RichError({
          httpCode: 404,
          publicId: 'user-not-found',
          publicMessage: 'User not found',
          debugDetails: {userId},
          logAsWarning: true,
        })
      }
      res.locals.dentUser = user
    })
  }

  get smileTask() {
    return asyncMiddleware('getModel.smileTask', async (req, res, next) => {
      const smileTaskId = req.params['smileTaskId']
      const smileTask = await SmileTask.get(smileTaskId)
      if (!smileTask) {
        throw new RichError({
          httpCode: 404,
          publicId: 'smiletask-not-found',
          publicMessage: 'SmileTask not found',
          debugDetails: {smileTaskId},
          logAsWarning: true,
        })
      }
      res.locals.dentSmileTask = smileTask
    })
  }
})()
