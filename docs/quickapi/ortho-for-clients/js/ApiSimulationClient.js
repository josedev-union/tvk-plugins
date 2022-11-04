"use strict";

window.Dentrino = window.Dentrino || {}
Dentrino.SimulationApiClient = (function() {
  var ORTHO_SIMULATION_PATH = '/public-api/simulations/ortho';

  var M = function(config) {
    this.host = config.host;
    this.clientId = config.clientId;
    this.clientExposedSecret = config.clientExposedSecret;
  };

  M.prototype.simulate = function(params) {
    var me = this;
    var photo = params.photo;
    var recaptchaToken = params.recaptchaToken;
    return sendSimulationRequest({
      host: me.host,
      credentials: {
        recaptchaToken: recaptchaToken,
        clientId: me.clientId,
        clientExposedSecret: me.clientExposedSecret
      },
      params: {
        imgPhoto: photo
      }
    });
  };

  function sendSimulationRequest(simulation) {
    var data = new FormData();
    var params = simulation.params;
    var credentials = simulation.credentials;
    var host = simulation.host;
    Object.entries(params).forEach(function(entry) {
      var fieldname = entry[0];
      var fieldval = entry[1];
      if (fieldval.constructor === Object) {
        fieldval = JSON.stringify(fieldval);
      }
      if (fieldval instanceof File) {
        data.append(fieldname, fieldval, fieldval.name);
      } else {
        data.append(fieldname, fieldval);
      }
    });

    return generateSignature(data, credentials)
    .then(function(signature) {
      return axios({
        method: 'POST',
        url: host + ORTHO_SIMULATION_PATH,
        responseType: 'json',
        headers: {
          'Authorization': 'Bearer ' + signature,
          'Accept': 'application/json'
        },
        data: data
      });
    });
  };

  function generateSignature(paramsFormData, credentials) {
    var paramsHashed = Promise.all(
      Array.from(paramsFormData.entries()).map((entry) => {
        var key = entry[0];
        var val = entry[1];

        if (val instanceof File) {
          val = fileAsBinary(val).then((val) => CryptoJS.enc.Latin1.parse(val))
        }

        return Promise.resolve(val).then(function(val) {
          var hashed = CryptoJS.MD5(val).toString();
          return [key, hashed];
        });
      })
    );

    return paramsHashed.then(function(paramsHashedEntries) {
      var paramsHashed = Object.fromEntries(paramsHashedEntries)
      var claims = {
        'clientId': credentials.clientId,
        'recaptchaToken': credentials.recaptchaToken,
        'paramsHashed': paramsHashed
      };
      var claimsJson = JSON.stringify(claims);
      var claimsSigned = CryptoJS.HmacSHA256(claimsJson, credentials.clientExposedSecret).toString();
      var claimsBase64 = btoa(claimsJson);
      return claimsBase64 + ':' + claimsSigned;
    });
  }

  function fileAsBinary(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function() {
        resolve(reader.result);
      };
      reader.readAsBinaryString(file);
    });
  }

  return M;
}());
