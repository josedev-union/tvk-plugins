import mail from '@sendgrid/mail'
import hbslib from 'hbs'
import path from 'path'
import fs from 'fs'
import * as env from './env'
const hbsinstance = hbslib.create()
const hbs = hbsinstance.__express
hbsinstance.localsAsTemplateData({})

const DEFAULT_FROM = 'support@tastytech.ca'
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
  
mail.setApiKey(SENDGRID_API_KEY)
export function send(args) {
  args.from = args.from || DEFAULT_FROM;
  if (!env.isProduction() && args.subject) {
    args.subject = `[${env.name}] ${args.subject}`
  }
  return mail.send(args)
}

export async function render(templatePath, locals = {}) {
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
