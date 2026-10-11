/* Beta key gate (SHA-512). The game scripts are only loaded after a valid key is entered.
   Note: this is a client-side check. It keeps casual visitors out, but it is not real security. */
(function () {
  'use strict';
  var OK = '354bbe3198ff2a0434032f84e8b5fd3d00eddaf73acba3e1536cf976b8509ee13aae7f71add7c9f74c55be6345ec2a466d179a7c0c3580a5a6e280e9bd67919e', STORE = 'gut-beta-key';
  var msg = document.getElementById('gateMsg'), input = document.getElementById('gateKey'), btn = document.getElementById('gateBtn'), tries = 0;
  function sha512(text) {
    if (!(window.crypto && crypto.subtle)) return Promise.reject(new Error('nocrypto'));
    return crypto.subtle.digest('SHA-512', new TextEncoder().encode('gut-beta:' + text)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); });
  }
  function load(files, done) { var f = files.shift(); if (!f) return done(); var s = document.createElement('script'); s.src = f; s.onload = function () { load(files, done); }; s.onerror = function () { msg.textContent = 'Could not load ' + f + '.'; }; document.body.appendChild(s); }
  function start() { document.body.classList.remove('locked'); document.getElementById('gate').hidden = true; load(['core.js', 'app.js'], function () {}); }
  function fail(e) { msg.textContent = e && e.message === 'nocrypto' ? 'This page must be opened over https (or localhost) so the key can be checked.' : 'That key is not valid.'; }
  var saved = null; try { saved = localStorage.getItem(STORE); } catch (e) {}
  if (saved === OK) return start();
  document.getElementById('gate').hidden = false; input.focus();
  function submit() {
    btn.disabled = true;
    sha512(input.value.trim()).then(function (h) {
      if (h === OK) { try { localStorage.setItem(STORE, OK); } catch (e) {} start(); return; }
      tries++; msg.textContent = 'That key is not valid.'; input.value = ''; setTimeout(function () { btn.disabled = false; input.focus(); }, Math.min(5000, 800 * tries));
    }, function (e) { fail(e); btn.disabled = false; });
  }
  btn.onclick = submit;
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
})();
