import i18n from "roddeh-i18n"

i18n.translator.add({
  values: {
    'errors:simulations-hourly-limit': 'You have reached your simulations hourly limit, try again in 1 hour.',
    'errors:simulations-minutely-limit': 'You are sending too much simulations in sequence, please wait 1 minute before trying again.',
    'errors:simulations-daily-limit': 'You have reached your simulations daily limit, try again tomorrow.',
    'errors:no-face': "We couldn't process this photo, please try again with another one.",
    'errors:simulation-error': "An error happened with the simulation, please try again with another photo.",
    'errors:unknown-processing-error': 'An error has ocurred, try again later.',
    'errors:timeout': 'Our servers are busy, please try again in a few minutes.',
    'errors:upload:image-size-limit': 'Photo exceeds the %{maxSize}mb size limit',
    'errors:upload:wrong-image-format': 'Photo must be an jpg or png image',
    'errors:upload:no-file': 'Photo is mandatory',
    'errors:invalid-recaptcha': 'Invalid recaptcha',

    'errors:simulations-limit': 'You have reached the limit of simulations, try again in 24 hours.',
    'errors:upload:generic': 'Error on upload, try again later',
    'progress:polling-fallback': 'Trying to download image. (Retries: %{count}/%{max})',
    'progress:stages:uploading': 'Uploading',
    'progress:stages:pre-processing': 'Waiting processing start',
    'progress:stages:processing-step': 'Processing %{number}/%{maxNumber}',
    'form:user:name': 'Full Name',
    'form:user:email': 'Email',
    'form:user:telephone-number': 'Telephone Number',
    'form:user:image': 'Photo',
    'form:label:error': 'Error',
    'form:submit': 'Start Simulation',
  }
})

export {i18n as i18n}
