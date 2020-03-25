import ImageProcessingSolicitation from '../models/image_processing_solicitation'
import DentistAccessPoint from '../models/dentist_access_point'
import * as mailHelpers from '../models/mailHelpers'
import * as downloader from '../models/downloader'
import logger from '../models/logger'

export async function onProcessingComplete(bucket, solicitationId) {
  const solicitation = await ImageProcessingSolicitation.get(solicitationId)
  const accessPoint = await DentistAccessPoint.get(solicitation.accessPointId)
  const email = await accessPoint.email()
  const dentist = await accessPoint.cacheableUser()
  let emailBody = await mailHelpers.render('dentist_notification.hbs', {
    solicitation: solicitation,
    accessPoint: accessPoint,
    email: email,
    dentist: dentist
  })
  let {Body: image} = await downloader.download(solicitation.filepathSideBySide)
  mailHelpers.send({
    to: email,
    subject: 'Smile Processing Finished',
    html: emailBody,
    attachments: [{
      filename: 'sidebyside.jpg',
      type: 'image/jpeg',
      content: image.toString('base64'),
      disposition: 'attachment',
    }]
  })
  logger.debug(`===========>  SENDING EMAIL TO: ${email}`)
  logger.debug(emailBody)
}
