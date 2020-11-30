import {ImageProcessingSolicitation} from '../models/database/ImageProcessingSolicitation'
import {DentistAccessPoint} from '../models/database/DentistAccessPoint'
import {mailHelpers} from './mailHelpers'
import {downloader} from '../models/storage/downloader'
import {logger} from '../instrumentation/logger'

export const patientMailer = new (class {
  async notifyProcessingComplete(solicitation) {
    const accessPoint = await DentistAccessPoint.get(solicitation.accessPointId)
    const dentist = await accessPoint.cacheableUser()
    const emailBody = await mailHelpers.render('patient_notification.hbs', {
      patient: solicitation.requester.info,
      dentist: dentist
    })
    let [originalImage, processedImage] = await Promise.all([
      downloader.download(solicitation.filepathOriginal),
      downloader.download(solicitation.filepathProcessed),
    ])
    mailHelpers.send({
      to: solicitation.requester.info.email,
      subject: 'Your smile is ready',
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
    logger.debug(`SENDING PATIENT EMAIL TO: ${solicitation.requester.info.email}`)
    logger.debug(emailBody)
  }
})()
