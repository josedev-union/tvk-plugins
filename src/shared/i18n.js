import i18n from "roddeh-i18n"

i18n.translator.add({
  values: {
    'errors:simulations-limit': 'You have reached the limit of simulations, try again in 24 hours.',
    'errors:unknown-processing-error': 'An error has ocurred, try again later.',
    'errors:image-polling-timeout': 'Could not find the image on server.',
    'errors:upload:image-size-limit': 'Image exceeded the 5mb size limit',
    'errors:upload:wrong-image-format': 'File must be an image',
    'errors:upload:generic': 'Error on upload, try again later',
    'progress:polling-fallback': 'Trying to download image. (Retries: %{count}/%{max})',
    'progress:stages:uploading': 'Uploading',
    'progress:stages:pre-processing': 'Waiting processing start',
    'progress:stages:processing-step': 'Processing %{number}/%{maxNumber}',
    'form:user:name': 'Full Name',
    'form:user:email': 'Email',
    'form:user:telephone-number': 'Telephone Number',
    'form:user:image': 'Image',
    'form:submit': 'Start Simulation',
  }
})

export {i18n as i18n}
