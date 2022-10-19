

export const validator = new (class {
  validateNumber(options) {
    const errors = []
    if (validator.#baseChecks({options, addTo: errors})) {
      return validator.#addErrors({errors, options})
    }
    if (validator.#checkType({options, type: 'number', addTo: errors})) {
      return validator.#addErrors({errors, options})
    }
    if (validator.#checkMinMax({options, addTo: errors})) {
      return validator.#addErrors({errors, options})
    }
    return []
  }

  validateChoices(options) {
    const errors = []
    if (validator.#baseChecks({options, addTo: errors})) {
      return validator.#addErrors({errors, options})
    }
    if (validator.#checkType({options, type: 'string', addTo: errors})) {
      return validator.#addErrors({errors, options})
    }
    if (validator.#checkChoices({options, addTo: errors})) {
      return validator.#addErrors({errors, options})
    }
    return []
  }

  #baseChecks({options, addTo: errors}) {
    if (validator.#checkCondition({options, addTo: errors})) {
      validator.#addErrors({errors, options})
      return true
    }
    if (validator.#checkPresence({options, addTo: errors})) {
      validator.#addErrors({errors, options})
      return true
    }
    return false
  }

  #checkCondition({options: {condition, value}, addTo: errors}) {
    if (!condition) return false
    return !condition()
  }

  #checkPresence({options: {optional, value, fieldName}, addTo: errors}) {
    if (optional || validator.#isPresent(value)) return false
    errors.push({message: `${fieldName} is not present`})
    return true
  }

  #checkType({options: {value}, type, fieldName, addTo: errors}) {
    if (typeof(value) === type) return false
    errors.push({message: `${fieldName} must be of type ${type} (received ${value})`})
    return true
  }

  #checkMinMax({options: {value, min, max, fieldName}, addTo: errors}) {
    const vmin = typeof(min) === 'undefined' ? Number.MIN_VALUE : min
    const vmax = typeof(max) === 'undefined' ? Number.MAX_VALUE : max
    if ((value-vmin) >= -0.0001 && (vmax-value) >= -0.0001) {
      return false
    }
    const hasMin = typeof(min) !== 'undefined'
    const hasMax = typeof(max) !== 'undefined'
    if (hasMin && hasMax) {
      errors.push({message: `${fieldName} must be between ${min} and ${max} (received ${value})`})
    } else if (hasMin) {
      errors.push({message: `${fieldName} must be greather than ${min} (received ${value})`})
    } else if (hasMax) {
      errors.push({message: `${fieldName} must be less than ${max} (received ${value})`})
    }
    return true
  }

  #checkChoices({options: {value, choices, fieldName}, addTo: errors}) {
    if (typeof(choices) === 'undefined') return false
    if (choices.includes(value)) return false
    errors.push({message: `${fieldName} must be one of the options: ${choices.join(', ')} (received ${value})`})
    return true
  }

  #addErrors({errors: newErrors, options: {addTo: allErrors}}) {
    if (typeof(allErrors) === 'undefined') return newErrors
    allErrors.push(...newErrors)
    return allErrors
  }

  #isPresent(value) {
    return typeof(value) !== 'undefined' && value !== null
  }
})()
