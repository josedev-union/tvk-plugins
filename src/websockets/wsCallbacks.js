import {ImageProcessingSolicitation} from '../models/database/ImageProcessingSolicitation'
import {DentistAccessPoint} from '../models/database/DentistAccessPoint'
import {mailHelpers} from './mailHelpers'
import {downloader} from '../models/storage/downloader'
import {logger} from '../instrumentation/logger'

export const wsCallbacks = new (class {
  async onProcessingComplete(bucket, solicitationId) {
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
})()