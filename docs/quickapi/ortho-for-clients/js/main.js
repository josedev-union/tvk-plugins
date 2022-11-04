"use strict";

(function() {
  // Constants
  var API_HOST = 'https://api.e91efc7.dentrino.ai';
  var CLIENT_ID = 'ODMzNDQwMDMzNzU4OFdLIztKNFJd_testext_front';
  var CLIENT_EXPOSED_SECRET = '2dba220dc7b1ffbbf96104bd4cdce7fabf2ec00af8083ccbb8fa51ba12c2924e';
  var RECAPTCHA_KEY = '6LchqJohAAAAAFDSqgRsIeICsXduWJtRkF4bw7Hk';


  // Initialize Modules
  var client = new Dentrino.SimulationApiClient({
    host: API_HOST,
    clientId: CLIENT_ID,
    clientExposedSecret: CLIENT_EXPOSED_SECRET
  });
  var recaptcha = new Dentrino.Recaptcha({
    key: RECAPTCHA_KEY
  });
  var ui = new Dentrino.UI();


  // Setup
  recaptcha.load();
  document.addEventListener("DOMContentLoaded", onPageReady);


  // Functions
  function onPageReady() {
    ui.setup();
    ui.onPhotoSubmit(doSimulation);
  }

  function doSimulation(photoFile) {
    ui.setAllLoading();

    recaptcha.execute()
    .then(function(recaptchaToken) {
      ui.showRecaptchaToken(recaptchaToken);

      return client.simulate({
        photo: photoFile,
        recaptchaToken: recaptchaToken
      });
    })
    .then(onSuccessResponse)
    .catch(onSimulationError)
    .finally(function() {
      ui.resetPhotoField();
      ui.hideLoading();
    });
  }

  function onSuccessResponse(response) {
    console.log("SUCCESS", response);
    if (response.status === 200) {
      ui.showResultImages({
        beforeUrl: response.data.beforeUrl,
        resultUrl: response.data.resultUrl
      });
    }

    ui.showResponseDebug({
      status: response.status,
      json: JSON.stringify(response.data, null, '  ')
    });
  }

  function onSimulationError(err) {
    console.log("ERROR", err)
    var msg = ""
    var data = null
    var res = err.response

    if (res.status) {
      var resMsg = res
      if (resMsg.data) resMsg = resMsg.data;
      if (resMsg.error) resMsg = resMsg.error;
      if (resMsg.message) resMsg = resMsg.message;
      msg += String(res.status) + " " + res.statusText + " - " + resMsg;
      data = res.data;
    } else {
      msg += err.code + " " + err.message
    }

    ui.showErrorResultMessage("Error: " + msg);
    ui.showResponseDebug({
      status: msg,
      json: JSON.stringify(data, null, '  ')
    });
  }
})()
