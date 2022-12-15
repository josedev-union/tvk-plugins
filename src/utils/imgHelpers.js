import FileType from 'file-type'
import imageSize from 'image-size'
imageSize.disableFS(true)
imageSize.disableTypes(['tiff', 'ico', 'gif', 'psd', 'svg', 'tga', 'icns'])

const EXIF_ROTATING_ORIENTATIONS = [3, 5, 6, 7, 8]

export const imgHelpers = new (class {
  getDimensions(imgBuffer) {
    const dimensions = imgHelpers.#safeImageSize(imgBuffer)
    if (!dimensions) return
    let {width, height, orientation} = dimensions
    const isExifRotated = EXIF_ROTATING_ORIENTATIONS.includes(dimensions.orientation)
    if (isExifRotated) {
      width = dimensions.height
      height = dimensions.width
    }

    return {width, height}
  }

  async getExtension(imgBuffer) {
    if (!imgBuffer) return
    const {ext: extension} = (await FileType.fromBuffer(imgBuffer)) || {}
    return extension
  }

  #safeImageSize(imgBuffer) {
    if (!imgBuffer) return
    try {
      return imageSize(imgBuffer)
    } catch (err) {
      if (err instanceof TypeError) {
        return undefined
      } else {
        throw err
      }
    }
  }
})()
