import {helpers} from '../routes/helpers'
import {signer} from '../shared/signer'

export const smileTaskSecurity = new (class {
  getSignature(req, res, next) {
    const signature = helpers.getSignature(req)
    if (!signature) {
      return helpers.respondError(res, 403, "Not Authorized")
    }

    const parts = signature.split(':')
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return helpers.respondError(res, 403, "Not Authorized")
    }
    res.locals.dentClientId = parts[0]
    res.locals.dentSignature = parts[1]
    return next()
  }

  getImageMD5(req, res, next) {
    const imageMD5 = req.body.imageMD5
    if (!imageMD5) {
      return helpers.respondError(res, 422, 'imageMD5 is mandatory')
    }
    res.locals.dentImageMD5 = imageMD5
    return next()
  }

  getContentType(req, res, next) {
    const contentType = req.body.contentType
    if (!contentType) {
      return helpers.respondError(res, 422, 'contentType is mandatory')
    }
    res.locals.dentImageContentType = contentType
    return next()
  }

  verifySignature(req, res, next) {
    const receivedSignature = res.locals.dentSignature
    const userId = res.locals.dentUser.id
    const imageMD5 = res.locals.dentImageMD5
    const clientSecret = res.locals.dentClient.secret
    if (!signer.apiVerify(userId, imageMD5, clientSecret, receivedSignature)) {
      return helpers.respondError(res, 403, "Not Authorized")
    }
    return next();
  }
})()
