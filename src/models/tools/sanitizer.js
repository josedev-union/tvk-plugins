export const sanitizer = new (class {
    onlyKeys(obj, allowedKeys) {
        var sanitized = {}
        Object.keys(obj).forEach(key => {
          if (allowedKeys.includes(key)) {
            sanitized[key] = obj[key]
          }
        })
        return sanitized
    }
})()
