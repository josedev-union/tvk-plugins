export class Enum {
    constructor(properties) {
        this._properties = properties
        properties.forEach(property => {
          this[property] = () => property
        })
    }
}
