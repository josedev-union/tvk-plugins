import morgan from 'morgan'
import util from 'util'

import {api} from './api'

morgan.token('client_id', (req, res) => {
  const info = api.getInfo(res) || {}
  const security = info['security'] || {}
  return security['client-id'] || ''
})

morgan.token('params', (req, res) => {
  const parsedBody = res.locals.dentParsedBody || {}
  const data = parsedBody.data || {}
  const imgs = parsedBody.images || {}
  const dataTokens = Object.keys(data).map((key) => {
    let valstr = util.inspect(data[key])
    valstr = truncateEnd(valstr, 15)
    const keyTruncated = truncateEnd(key, 15)
    return `${keyTruncated}:${valstr}`
  })
  const imgTokens = Object.keys(imgs).map((key) => {
    const {size, mimetype, originalFilename, extension} = imgs[key]
    const sizeMb = (size / 1024.0 / 1024.0).toFixed(2)
    const filename = truncateMiddle(String(originalFilename), 20)
    const keyTruncated = truncateEnd(key, 20)
    return `${keyTruncated}:{${filename} ${mimetype} ${(extension || '')} ${sizeMb}mb}`
  })
  const dataDesc = truncateEnd(dataTokens.join(' '), 250, '(...)')
  const imgDesc = truncateEnd(imgTokens.join(' '), 100, '(...)')
  return `${dataDesc} ${imgDesc}`
})

morgan.token('ip', (req, res) => {
  return req.ip
})

function truncateEnd(str, maxSize, token='...') {
  if (str.length > maxSize) {
    str = str.slice(0, maxSize-token.length) + token
  }
  return str
}

function truncateMiddle(str, maxSize) {
  if (str.length > maxSize) {
    let initSize = Math.floor(maxSize/2.0)
    let endSize = maxSize - initSize
    initSize -= 1
    endSize -= 2
    str = str.slice(0, initSize) + '...' + str.slice(-endSize-1, -1)
  }
  return str
}

export const morganLogger = morgan(':date[iso] :method :url :status :response-time ms HTTP/:http-version :ip :client_id [:params]')
