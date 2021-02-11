import {User} from '../models/database/User'
import {mailHelpers} from './mailHelpers'
import {downloader} from '../models/storage/downloader'
import {logger} from '../instrumentation/logger'

export const dentistMailer = new (class {
  async notifyProcessingComplete(smileTask) {
    const dentist = await User.get(smileTask.userId)
    const email = dentist.email
    const emailBody = await mailHelpers.render('dentist_notification.hbs', {
      email: email,
      dentist: dentist
    })
    let [originalImage, processedImage] = await Promise.all([
      downloader.download(smileTask.filepathUploaded),
      downloader.download(smileTask.filepathResult),
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
