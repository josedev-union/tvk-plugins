import {i18n} from '../../src/shared/i18n'
import {envShared} from '../../src/shared/envShared'
import {otp} from '../../src/shared/otp'
import 'whatwg-fetch'

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.processing-form form')
    const errorContainer = document.querySelector('.error')
    const errorMessageEl = errorContainer.querySelector('.error-message')
    const imagesContainer = document.querySelector('.simulation-images')
    const uploadFeedback = document.querySelector('.upload-feedback')

    form.addEventListener('submit', function(event) {
      if (form.secret.value) return
      const errorMsg = validate(form)
      if (errorMsg) {
        showError(errorMsg)
      } else {
        imagesContainer.classList.add('hidden')
        errorContainer.classList.add('hidden')
        uploadFeedback.classList.remove('hidden')
        form.btn.disabled = true
        submitWithSecret(form)
      }
      event.preventDefault()
    })

    function validate(form) {
      const file = form.photo.files[0]
      if (!file) return i18n('errors:upload:no-file')
      if (!file.name.match(/\.(jpe?g|png)$/)) return i18n('errors:upload:wrong-image-format')
      if (file.size > envShared.maxUploadSizeBytes) return i18n('errors:upload:image-size-limit')
      return null
    }

    function submitWithSecret(form) {
      fetch('epoch')
      .then(response => response.json())
      .then(data => {
        console.log("data", data)
        const epoch = data.epoch
        console.log("epoch", epoch)
        const token = otp.create(epoch, envShared.apiSecretToken)
        console.log("token", token)
        form.secret.value = token
        form.submit()
      })
    }

    function showError(msg) {
      errorContainer.classList.remove('hidden')
      imagesContainer.classList.add('hidden')
      errorMessageEl.textContent = msg
    }
  })
})()
