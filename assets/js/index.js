import jQuery from '../vendor/js/jquery-3.6.0.min.js'
import '../vendor/js/twentytwenty/jquery.twentytwenty.js'

import {i18n} from '../../src/shared/i18n'
import {envShared} from '../../src/shared/envShared'
import {otp} from '../../src/shared/otp'
import 'whatwg-fetch'

(function($) {
  $(function() {
    $("#container1").twentytwenty({
      no_overlay: true,
    })

    const $form = $('form.upload-form')
    const $photo = $form.find('[name="photo"]')
    const $secret = $form.find('[name="secret"]')
    const $recaptchaToken = $form.find('[name="recaptchaToken"]')
    const $errorContainer = $('.error')
    const $errorMessage = $errorContainer.find('.error-message')
    const $noSimulationContainer = $('.no-simulation-container')
    const $simulationContainer = $('.simulation-container')
    const $imagesContainer = $simulationContainer.find('.simulation-images')
    const $uploadFeedback = $('.upload-feedback')

    $imagesContainer.twentytwenty({
      no_overlay: true,
    })

    $photo.on('change', (event) => {
      $errorContainer.addClass('hidden')
      $uploadFeedback.removeClass('hidden')
      const errorMsg = validate()
      if (errorMsg) {
        showError(errorMsg)
        return
      }
      window.grecaptcha.execute(
        envShared.instSimRecaptchaClientKey,
        {action: 'simulate'},
      ).then((token) => {
        submit({recaptchaToken: token})
      }).catch(() => showError(i18n('errors:unknown-processing-error')))
    })

    function submit({recaptchaToken=null}) {
      fetch('epoch')
      .then(response => response.json())
      .then(data => {
        const epoch = data.epoch
        const token = otp.create(epoch, envShared.instSimSecretToken)
        $secret.val(token)
        $recaptchaToken.val(recaptchaToken)

        $form.submit()
      })
    }

    function validate() {
      const file = $photo.prop('files')[0]
      if (!file) return i18n('errors:upload:no-file')
      if (!file.name.match(/\.(jpe?g|png)$/)) return i18n('errors:upload:wrong-image-format')
      if (file.size > envShared.maxUploadSizeBytes) return i18n('errors:upload:image-size-limit', {maxSize: envShared.maxUploadSizeMb})
      return null
    }

    function showError(msg) {
      $errorContainer.addClass('hidden')
      $uploadFeedback.removeClass('hidden')
      $noSimulationContainer.removeClass('hidden')
      $simulationContainer.addClass('hidden')
      setTimeout(() => {
        $errorContainer.removeClass('hidden')
        $uploadFeedback.addClass('hidden')
        $errorMessage.text(msg)
        //imagesContainer.classList.add('hidden')
      }, 350)
    }
  })
})(jQuery)
