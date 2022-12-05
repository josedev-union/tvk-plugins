import path from 'path'

export function parseObjects(entriesListStr, objectKeysOrder) {
  const entries = parseList(entriesListStr)
  if (!entries) return []
  return entries.map((entry) => {
    const parts = entry.split(/\s*[;]\s*/)
    const obj = {}
    parts.forEach((value, inx) => {
      const key = objectKeysOrder[inx]
      obj[key] = value
    })
    return obj
  })
}

export function parseGoogleProjects(entriesListStr) {
  const parsedEntries = parseObjects(entriesListStr, ['projectKey', 'projectId', 'credentialPath'])
  if (!parsedEntries) return {}
  const googleProjectsEntries = parsedEntries.map((entry) => {
    if (!entry.projectId) projectId = 'dentrino-local'
    if (entry.credentialPath) {
      entry.credentialCfg = require(path.join('../../', entry.credentialPath))
    }
    return [entry.projectKey, entry]
  })

  return Object.fromEntries(googleProjectsEntries)
}

export function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

const FALSE_STRINGS = ['', 'false', 'undefined', 'null', '0', 'no', '-1']
export function parseBool(val) {
  if (!val) return false
  val = String(val).trim().toLowerCase()
  if (!val || FALSE_STRINGS.includes(val)) return false
  return true
}

export function parseList(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  return val.split(/\s*[|]\s*/g)
}

export function toFilepathRegex(str) {
  if (typeof(str) !== 'string') return str
  str = str.replaceAll(/,/g, '|').replaceAll(/\s/g, '')
  return new RegExp(`^(.*\\.)?(?<ext>${str})$`, 'i')
}
