export function parseFirebaseProjects(entriesListStr) {
  const entries = parseList(entriesListStr)
  if (!entries) return []
  return entries.map((entry) => {
    let [name, projectId, databaseURL, serviceAccountCredentialPath] = entry.split(/\s*[|]\s*/)
    if (!databaseURL) databaseURL = 'localhost:8080'
    if (!projectId) projectId = 'dentrino-local-us'
    const config = { databaseURL, projectId }
    if (serviceAccountCredentialPath) {
      const serviceAccount = require(serviceAccountCredentialPath)
      const credential = cert(serviceAccount)
      Object.assign(config, { credential })
    }
    return {name, config}
  })
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
  return val.split(/\s*[,]\s*/g)
}

export function toFilepathRegex(str) {
  if (typeof(str) !== 'string') return str
  str = str.replaceAll(/,/g, '|').replaceAll(/\s/g, '')
  return new RegExp(`^(.*\\.)?(?<ext>${str})$`, 'i')
}
