"use strict";

window.Dentrino = window.Dentrino || {}
Dentrino.Recaptcha = (function() {
  var M = function(params) {
    this.key = params.key
    this.ready = false
    this.setupPromise = null
  }

  M.prototype.load = function() {
    var me = this;
    if (me.setupPromise) return me.setupPromise;
    me.setupPromise = new Promise(function(resolve, reject) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://www.google.com/recaptcha/api.js?render=' + me.key;
      script.onload = function() {
        grecaptcha.ready(function() {
          me.ready = true;
          resolve();
        });
      }
      document.body.appendChild(script);
    });
  };

  M.prototype.execute = function() {
    var me = this;
    if (!me.setupPromise) {
      return Promise.reject(new Error('You must setup recaptcha before executing it'));
    }
    return new Promise(function(resolve, reject) {
      me.setupPromise.then(function() {
        grecaptcha.execute(me.key, {action: 'submit'}).then(resolve).catch(reject);
      });
    });
  };

  return M;
}());
