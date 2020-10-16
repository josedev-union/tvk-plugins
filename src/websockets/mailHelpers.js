import mail from '@sendgrid/mail'
import hbslib from 'hbs'
import path from 'path'
import {env} from '../config/env'
const hbsinstance = hbslib.create()
const hbs = hbsinstance.__express
hbsinstance.localsAsTemplateData({})

const DEFAULT_FROM = 'support@tastytech.ca'

export const mailHelpers = new (class {
  send(args) {
    args.from = args.from || DEFAULT_FROM;
    if (!env.isProduction() && args.subject) {
      args.subject = `[${env.name}] ${args.subject}`
    }
    return mail.send(args)
  }

  async render(templatePath, locals = {}) {
    let mailPath = path.join('src/views/mail', templatePath)
    let opts = locals
    opts.layout = 'layout.hbs'
    opts.settings = {
      views: [
        path.join('src/views/mail')
      ]
    }
    return await new Promise((resolve, reject) => {
      hbs(mailPath, opts, (err, res) => {
        if (err === null) resolve(res)
        else reject(err)
      })
    })
  }
})()