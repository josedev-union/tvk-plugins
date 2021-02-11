import {dentistMailer} from '../mailers/dentistMailer'

export const wsCallbacks = new (class {
  onProcessingComplete(smileTask) {
    return Promise.all([
      dentistMailer.notifyProcessingComplete(smileTask),
    ])
  }
})()
