"use strict";

window.Dentrino = window.Dentrino || {}
Dentrino.UI = (function() {
  var M = function() {
  }

  M.prototype.setup = function() {
    this.form = document.getElementById('upload-form')
    this.imgResult = document.getElementById('img-result')
    this.imgBefore = document.getElementById('img-before')
    this.imgsContainer = document.getElementById('imgs-container')
    this.resErrorMsg = document.getElementById('response-error-message')
    this.debugRecaptchaToken = document.getElementById('id-token')
    this.debugResponseStatus = document.getElementById('response-status')
    this.debugResponseJSON = document.getElementById('response-json')
    this.allLoadings = document.querySelectorAll('.loading')
    this.recaptchaLoading = document.querySelector('.recaptcha-token .loading')
    this.photoField = this.form['imgPhoto']
    this.dataFields = {
      captureType: this.form['captureType'],
      feedbackScore: this.form['feedbackScore'],
      externalCustomerId: this.form['externalCustomerId'],
    }
    this.allDebug = [
      this.debugRecaptchaToken,
      this.debugResponseStatus,
      this.debugResponseJSON
    ];

    var me = this;
    setInterval(function() {
      var fullTxt = "Loading...";
      me.allLoadings.forEach(function(el) {
        var txt = el.textContent;
        var dotsSize = txt.length - (fullTxt.length - 3);
        dotsSize = (dotsSize + 1) % 4
        el.textContent = fullTxt.slice(0, (fullTxt.length - 3) + dotsSize)
      });
    }, 350.0)
  };

  M.prototype.showRecaptchaToken = function(token) {
    this.debugRecaptchaToken.textContent = token;
    this.recaptchaLoading.remove('show')
  };

  M.prototype.onPhotoSubmit = function(callback) {
    var me = this;
    this.form.addEventListener('submit', function(event) {
      event.preventDefault()
      var photoField = me.photoField;
      var data = {}
      Object.entries(me.dataFields).forEach(function(entry) {
        var fieldname = entry[0]
        var field = entry[1]
        var value = field.value
        if (value && value !== '') {
          if (fieldname.toLowerCase().includes('score')) {
            value = parseFloat(value)
          }
          data[fieldname] = value
        }
      })
      callback({imgPhoto: photoField.files[0], data: data});
      return false
    });
  };

  M.prototype.setAllLoading = function() {
    this.resErrorMsg.classList.remove('show')
    this.allLoadings.forEach(function(el) {
      el.classList.add('show');
    });
    this.allDebug.forEach(function(el) {
      el.textContent = '';
    });
    this.imgsContainer.classList.remove('show');
  };

  M.prototype.showResultImages = function(urls) {
    this.imgResult.src = urls.resultUrl;
    this.imgBefore.src = urls.beforeUrl;
    this.imgsContainer.classList.add('show');
  };

  M.prototype.showResponseDebug = function(info) {
    this.debugResponseStatus.textContent = info.status;
    this.debugResponseJSON.textContent = info.json;
  };

  M.prototype.showErrorResultMessage = function(msg) {
    this.resErrorMsg.textContent = msg;
    this.resErrorMsg.classList.add('show');
  };

  M.prototype.resetFields = function() {
    this.photoField.value = '';
    Object.values(this.dataFields).forEach(function (field) {
      field.value = '';
    })
  };

  M.prototype.hideLoading = function() {
    this.allLoadings.forEach(function(el) {
      el.classList.remove('show');
    });
  };

  return M;
}());
