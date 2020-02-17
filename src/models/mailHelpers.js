import mail from '@sendgrid/mail'
import hbslib from 'hbs'
import path from 'path'
import fs from 'fs'
const hbsinstance = hbslib.create()
const hbs = hbsinstance.__express
hbsinstance.localsAsTemplateData({})
//hbs.localsAsTemplateData({})
//hbsinstance.__localsAsData = true
//hbs.__localsAsData = true

const DEFAULT_FROM = 'support@tastytech.ca'
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const APP_ENV = process.env.NODE_ENV || 'development'
const IS_PRODUCTION = APP_ENV === 'production'
  
mail.setApiKey(SENDGRID_API_KEY)
exports.send = (args) => {
  args.from = args.from || DEFAULT_FROM;
  if (!IS_PRODUCTION && args.subject) {
    args.subject = `[${APP_ENV}] ${args.subject}`
  }
  return mail.send(args)
}

exports.render = async (templatePath, locals = {}) => {
  let mailPath = path.join('src/views/mail', templatePath)
  let opts = locals
  opts.layout = 'layout.hbs'
  opts.settings = {
    views: [
      path.join(__dirname, '../views/mail')
    ]
  }
  return await new Promise((resolve, reject) => {
    hbs(mailPath, opts, (err, res) => {
      if (err === null) resolve(res)
      else reject(err)
    })
  })
}
