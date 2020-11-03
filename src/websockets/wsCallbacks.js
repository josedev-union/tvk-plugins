import {dentistMailer} from '../mailers/dentistMailer'

export const wsCallbacks = new (class {
  async onProcessingComplete(solicitation) {
    return dentistMailer.notifyProcessingComplete(solicitation)
  }
})()
