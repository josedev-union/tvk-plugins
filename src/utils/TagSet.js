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
      if (typeof(value) === 'undefined' && typeof(label) !== 'string') {
        let tags = undefined
        if (label instanceof TagSet) tags = label.tags
        else if (typeof(label) === 'object' && label !== null) tags = label
        if (tags) {
          Object.keys(tags).forEach((l) => this.add(l, tags[l]))
          return
        }
      }
      label = this.#normalizeLabel(label)
      value = this.#normalizeValue(value, label)
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
  }

  #normalizeValue(value, label) {
    const valType = typeof(value)
    if (['boolean', 'undefined'].includes(valType) || value === null) return String(value)
    if (valType !== 'string') throw new Error(`Invalid tag value: ${label}:${value} : Value should be string, boolean, undefined or null`)
    return value
  }
}
