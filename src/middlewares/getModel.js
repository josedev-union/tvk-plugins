import {ApiClient} from '../models/database/ApiClient'
import {User} from '../models/database/User'
import {SmileTask} from '../models/database/SmileTask'
import {RichError} from "../utils/RichError"

import {helpers} from '../routes/helpers'
import {asyncMiddleware} from './expressAsync'


export const getModel = new (class {

  /**
   * @returns {async function} A route handler which gets the ApiClient model object from clientId
   * Update the Response object as followings;
   *    - res.locals.dentClient {ApiClient}
   * Dependency handlers
   *    - quickApi.parseAuthToken
   */
  get client() {
    return asyncMiddleware('getModel.client', async (req, res, next) => {
      const clientId = res.locals.dentClientId
      const client = await ApiClient.get(clientId)
      if (!client) {
        throw new RichError({
          httpCode: 403,
          id: 'not-authorized',
          subtype: 'bad-token',
          debugMessage: `Unauthorized: Could not find client "${clientId}"`,
          debugDetails: {clientId},
          publicMessage: 'Not Authorized',
          logLevel: 'debug',
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
          id: 'not-found',
          subtype: 'user-not-found',
          subtypeIsPublic: true,
          publicMessage: 'User not found',
          debugDetails: {userId},
          logLevel: 'debug',
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
          id: 'not-found',
          subtype: 'smiletask-not-found',
          subtypeIsPublic: true,
          publicMessage: 'SmileTask not found',
          debugDetails: {smileTaskId},
          logLevel: 'debug',
        })
      }
      res.locals.dentSmileTask = smileTask
    })
  }
})()
