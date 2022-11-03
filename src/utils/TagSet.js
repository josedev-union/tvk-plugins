import {logger} from '../instrumentation/logger'
import {env} from '../config/env'

export class TagSet {
  constructor(tags={}) {
    this.tags = {}
    this.add(tags)
  }

  add(label, value) {
    const originalLabel = label
    const originalValue = value
    try {
      if (typeof(value) === 'undefined') {
        const tags = (label instanceof TagSet) ? label.tags : label
        Object.keys(tags).forEach((l) => this.add(l, tags[l]))
        return
      }
      label = this.#normalizeLabel(label)
      value = this.#normalizeValue(value)
      if (!label) throw new Error(`Invalid tag label: ${originalLabel}`)
      this.tags[label] = value
    } catch(err) {
      logger.error(`(ignored on production) Couldn't Add tag pair ${originalLabel}:${originalValue}`)
      if (!env.isProduction()) {
        throw err
      } else {
        logger.error(err)
      }
    }
  }

  labels() { return Object.keys(this.tags) }
  values() { return Object.values(this.tags) }

  #normalizeLabel(str) {
    if (typeof(str) !== 'string') return null
    str = str.trim()
    str = str.replace(/[_\s]/g, '-')
    str = str.replace(/[^a-zA-Z0-9.:-]/g, '')
    str = str.replace(/^([A-Z][A-Z]+)/g, (m,g1) => `${g1.toLowerCase()}`)
    str = str.replace(/(?!^)-*([A-Z]+)/g, (m,g1) => `-${g1.toLowerCase()}`)
    return str.toLowerCase()

    // console.log(normalizeLabel('Hugo Roque de Figueiredo 99'))
    // console.log(normalizeLabel('HUGO ROQUE DE FIGUEIREDO'))
    // console.log(normalizeLabel('hugo_roque_100_de_figueiredo'))
    // console.log(normalizeLabel('HugoRoqueDeFigueiredo'))
    // console.log(normalizeLabel('Hugo-Roque-De-Figueiredo'))
    // console.log(normalizeLabel('HUGO-ROQUE-DE-FIGUEIREDO'))
    // console.log(normalizeLabel('hugo:roque.de*+-&figueiredo'))
  }

  #normalizeValue(value) {
    const valType = typeof(value)
    if (['boolean', 'undefined'].includes(valType) || value === null) return String(value)
    if (valType !== 'string') throw new Error('Tag value ${value} should be string, boolean, undefined or null')
    return value
  }
}
