import ImageProcessingSolicitation from '../models/image_processing_solicitation'
import DentistAccessPoint from '../models/dentist_access_point'

export async function onProcessingComplete(bucket, solicitationId) {
  const solicitation = await ImageProcessingSolicitation.get(solicitationId)
  const accessPoint = await DentistAccessPoint.get(solicitation.accessPointId)
  const email = await accessPoint.email()
  console.log(solicitation)
  console.log(accessPoint)
  console.log(`===========>  SEND EMAIL TO: ${email}`)
}
