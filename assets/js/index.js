import {i18n} from '../../src/shared/i18n'
import {envShared} from '../../src/shared/envShared'

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.processing-form form')
    const errorContainer = document.querySelector('.error')
    const errorMessageEl = errorContainer.querySelector('.error-message')
    const imagesContainer = document.querySelector('.simulation-images')
    const uploadFeedback = document.querySelector('.upload-feedback')

    form.addEventListener('submit', function(event) {
      const errorMsg = validate(form)
      if (errorMsg) {
        showError(errorMsg)
        event.preventDefault()
      } else {
        imagesContainer.classList.add('hidden')
        errorContainer.classList.add('hidden')
        uploadFeedback.classList.remove('hidden')
        form.submit.disabled = true
      }
    })

    function validate(form) {
      const file = form.photo.files[0]
      if (!file) return i18n('errors:upload:no-file')
      if (!file.name.match(/\.(jpe?g|png)$/)) return i18n('errors:upload:wrong-image-format')
      if (file.size > envShared.maxUploadSizeBytes) return i18n('errors:upload:image-size-limit')
      return null
    }

    function showError(msg) {
      errorContainer.classList.remove('hidden')
      imagesContainer.classList.add('hidden')
      errorMessageEl.textContent = msg
    }
  })
})()
