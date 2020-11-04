import {dentistMailer} from '../mailers/dentistMailer'
import {patientMailer} from '../mailers/patientMailer'

export const wsCallbacks = new (class {
  onProcessingComplete(solicitation) {
    return Promise.all([
      dentistMailer.notifyProcessingComplete(solicitation),
      patientMailer.notifyProcessingComplete(solicitation),
    ])
  }
})()
