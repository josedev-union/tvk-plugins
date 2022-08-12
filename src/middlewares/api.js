export const api = new (class {
  setId(apiId) {
    return (req, res, next) => {
      res.locals.dentApiId = apiId
      next()
    }
  }
})()
