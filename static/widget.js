/**
 * MediaNetPay Widget v1.0
 * Embeds the hosted checkout in a modal overlay.
 *
 * Usage:
 *   <script src="https://api.medianetpay.ec/static/widget.js"></script>
 *   <button onclick="MediaNetPay.open({ token: 'abc123', onSuccess: fn })">
 *     Pagar
 *   </button>
 *
 * The token must be pre-created server-side via POST /v1/links
 * using the merchant's secret key (sk_). Never expose sk_ in frontend code.
 *
 * Options:
 *   token      {string}   Required. Payment link token.
 *   onSuccess  {function} Called with transaction object on successful payment.
 *   onError    {function} Called with error string on failure.
 *   onClose    {function} Called when modal is closed without completing payment.
 *   _apiBase   {string}   Override API base URL (for testing). Default: auto-detect.
 */
(function (window) {
  'use strict';

  var _overlay = null;
  var _handler = null;

  function _apiBase() {
    // Auto-detect: use the same origin as the script tag, or fallback to production
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('widget.js') !== -1) {
        var url = new URL(src);
        return url.origin;
      }
    }
    return 'https://api.medianetpay.ec';
  }

  function _close() {
    if (_overlay && _overlay.parentNode) {
      _overlay.parentNode.removeChild(_overlay);
      _overlay = null;
    }
    if (_handler) {
      window.removeEventListener('message', _handler);
      _handler = null;
    }
  }

  function _open(options) {
    options = options || {};
    var token = options.token;
    var onSuccess = options.onSuccess;
    var onError = options.onError;
    var onClose = options.onClose;
    var base = options._apiBase || _apiBase();

    if (!token) {
      console.error('[MediaNetPay] token es requerido.');
      return;
    }

    // Prevent duplicate overlays
    if (_overlay) { _close(); }

    var checkoutUrl = base + '/pay/' + token + '?mode=embed';

    // Overlay backdrop
    _overlay = document.createElement('div');
    _overlay.id = 'medianetpay-overlay';
    _overlay.style.cssText = [
      'position:fixed', 'top:0', 'left:0',
      'width:100%', 'height:100%',
      'background:rgba(15,23,42,0.6)',
      'backdrop-filter:blur(3px)',
      '-webkit-backdrop-filter:blur(3px)',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'animation:mnp-fade .2s ease',
    ].join(';');

    // Inject keyframe animation once
    if (!document.getElementById('mnp-style')) {
      var style = document.createElement('style');
      style.id = 'mnp-style';
      style.textContent = '@keyframes mnp-fade{from{opacity:0}to{opacity:1}}@keyframes mnp-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
      document.head.appendChild(style);
    }

    // iframe
    var iframe = document.createElement('iframe');
    iframe.src = checkoutUrl;
    iframe.title = 'Pago con MediaNetPay';
    iframe.setAttribute('allow', 'payment');
    iframe.style.cssText = [
      'width:min(460px,100vw)',
      'max-height:min(700px,100vh)',
      'height:700px',
      'border:none',
      'border-radius:20px',
      'box-shadow:0 24px 64px rgba(0,0,0,0.35)',
      'animation:mnp-up .25s ease',
    ].join(';');

    _overlay.appendChild(iframe);
    document.body.appendChild(_overlay);

    // postMessage listener
    _handler = function (e) {
      if (!e.data || !e.data.type) return;
      switch (e.data.type) {
        case 'MEDIANETPAY_SUCCESS':
          _close();
          if (onSuccess) onSuccess(e.data.transaction);
          break;
        case 'MEDIANETPAY_CLOSE':
          _close();
          if (onClose) onClose();
          break;
        case 'MEDIANETPAY_ERROR':
          if (onError) onError(e.data.error);
          break;
      }
    };
    window.addEventListener('message', _handler);

    // Close on backdrop click (not on iframe click)
    _overlay.addEventListener('click', function (e) {
      if (e.target === _overlay) {
        _close();
        if (onClose) onClose();
      }
    });
  }

  window.MediaNetPay = {
    open: _open,
    close: _close,
  };

})(window);
