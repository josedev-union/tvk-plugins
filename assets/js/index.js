import jQuery from '../vendor/js/jquery-3.6.0.min.js'
import '../vendor/js/twentytwenty/jquery.twentytwenty.js'

import {i18n} from '../../src/shared/i18n'
import {envShared} from '../../src/shared/envShared'
import {otp} from '../../src/shared/otp'
import 'whatwg-fetch'

(function($) {
  $(function() {
    const $beforeImage = $('.before-image')
    const $afterImage = $('.after-image')
    const $beforeImageDownload = $('.before-image-download')
    const $afterImageDownload = $('.after-image-download')

    const $htmlbody = $('body,html')
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
    const $errorNotification = $('#error-notification')

    if ($beforeImage.length > 0) {
      prepareDownloadButton($beforeImage, $beforeImageDownload)
      prepareDownloadButton($afterImage, $afterImageDownload)
    }

    (function() {
      let errorMessage = $errorMessage.text().trim()
      if (errorMessage) {
        errorAppear(errorMessage)
      }
    })()

    $("#container1").twentytwenty({
      no_overlay: true,
    })

    $imagesContainer.twentytwenty({
      no_overlay: true,
    })

    $photo.on('change', (event) => {
      $errorContainer.addClass('hidden')
      showLoading()
      const errorMsg = validate()
      if (errorMsg) {
        showErrorDelayed(errorMsg)
        return
      }
      window.grecaptcha.execute(
        envShared.instSimRecaptchaClientKey,
        {action: 'simulate'},
      ).then((token) => {
        submit({recaptchaToken: token})
      }).catch(() => showErrorDelayed(i18n('errors:unknown-processing-error')))
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

    function showErrorDelayed(msg) {
      showLoading()
      $errorContainer.addClass('hidden')
      $noSimulationContainer.removeClass('hidden')
      $noSimulationContainer.addClass('is-hidden-mobile')
      $simulationContainer.addClass('hidden')
      setTimeout(() => {
        errorAppear(msg)
      }, 350)
    }

    let hideTimeout
    function errorAppear(msg) {
      hideLoading()
      $errorContainer.removeClass('hidden')
      $noSimulationContainer.addClass('is-hidden-mobile')
      $errorMessage.text(msg)
      $errorNotification.find('span').text(msg)
      $errorNotification.fadeIn()
      $errorNotification.removeClass('hidden')
      clearTimeout(hideTimeout)
      hideTimeout = setTimeout(() => $errorNotification.fadeOut(), 2500)
      //imagesContainer.classList.add('hidden')
    }

    function showLoading() {
      $uploadFeedback.removeClass('hidden')
      lockScrollOnTop()
    }

    function hideLoading() {
      $uploadFeedback.addClass('hidden')
      unlockScroll()
    }

    function lockScrollOnTop() {
      $htmlbody.addClass('stop-scrolling')
      window.scrollTo(0, 0)
      $htmlbody.bind('touchmove.lockscroll', function(e){e.preventDefault()})
      $htmlbody.bind('scroll.lockscroll', function(e){e.preventDefault()})
    }

    function unlockScroll() {
      $htmlbody.removeClass('stop-scrolling')
      $htmlbody.unbind('touchmove.lockscroll')
      $htmlbody.unbind('scroll.lockscroll')
    }

    function prepareDownloadButton($img, $download) {
      const dataUrl = $img.attr('src')
      const $link = $download.find('.download-link')
      const $placeholder = $download.find('.loading-placeholder')
      $link.attr('href', dataUrl)
      $link.removeClass('hidden')
      $placeholder.remove()
    }
  })
})(jQuery)
