import {ImageProcessingSolicitation} from '../models/database/ImageProcessingSolicitation'
import {DentistAccessPoint} from '../models/database/DentistAccessPoint'
import {mailHelpers} from './mailHelpers'
import {downloader} from '../models/storage/downloader'
import {logger} from '../instrumentation/logger'

export const dentistMailer = new (class {
  async notifyProcessingComplete(solicitation) {
    // const solicitation = await ImageProcessingSolicitation.get(solicitationId)
    const accessPoint = await DentistAccessPoint.get(solicitation.accessPointId)
    const email = await accessPoint.email()
    const dentist = await accessPoint.cacheableUser()
    const emailBody = await mailHelpers.render('dentist_notification.hbs', {
      solicitation: solicitation,
      accessPoint: accessPoint,
      email: email,
      dentist: dentist
    })
    let [originalImage, processedImage] = await Promise.all([
      downloader.download(solicitation.filepathOriginal),
      downloader.download(solicitation.filepathProcessed),
    ])
    mailHelpers.send({
      to: email,
      subject: 'Smile Processing Finished',
      html: emailBody,
      attachments: [
        {
          filename: 'original.jpg',
          type: 'image/jpeg',
          content: originalImage.toString('base64'),
          disposition: 'attachment',
        },
        {
          filename: 'after.jpg',
          type: 'image/png',
          content: processedImage.toString('base64'),
          disposition: 'attachment',
        },
      ]
    })
    .catch(error => {
      console.error("Error sending email via Sendgrid: ", error.message)
    })
    logger.debug(`SENDING DENTIST EMAIL TO: ${email}`)
    logger.debug(emailBody)
  }
})()
