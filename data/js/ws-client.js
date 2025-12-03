(function (window) {
  'use strict';

  var socket = null;
  var currentWsContext = '';
  var wsHandlers = [];

  // Registriert einen Callback, der alle eingehenden JSON-Payloads erhält
  function registerWsHandler(handler) {
    if (typeof handler === 'function') {
      wsHandlers.push(handler);
    }
  }

  // Baut die WebSocket-Verbindung auf und bindet Standard-Handler
  function connectWS(context) {
    currentWsContext = context || '';
    var host = location.hostname || '192.168.4.1';
    var url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + host + '/ws';

    try {
      socket = new WebSocket(url);
    } catch (error) {
      console.warn('WebSocket creation failed', error);
      if ($('wsLog')) {
        $('wsLog').innerText = 'WebSocket: Verbindung fehlgeschlagen';
      }
      return;
    }

    if ($('wsLog')) {
      $('wsLog').innerText = 'WebSocket: verbinde...';
    }

    socket.onopen = function () {
      if ($('wsLog')) {
        $('wsLog').innerText = 'WebSocket: verbunden';
      }
      if (currentWsContext === 'battery') {
        try {
          sendWS('battery?');
        } catch (err) {
          console.warn('Battery request failed', err);
        }
      }
    };

    socket.onclose = function () {
      if ($('wsLog')) {
        $('wsLog').innerText = 'WebSocket: getrennt';
      }
    };

    socket.onerror = function () {
      if ($('wsLog')) {
        $('wsLog').innerText = 'WebSocket: Fehler';
      }
    };

    socket.onmessage = function (event) {
      var text = event.data;
      try {
        var payload = JSON.parse(event.data);
        if (payload && payload.type === 'dice_result') {
          alert('Wuerfelergebnis: ' + payload.value);
        }
        wsHandlers.forEach(function (handler) {
          handler(payload);
        });
        if ($('wsLog')) {
          var value = typeof payload.value !== 'undefined' ? ' ' + payload.value : '';
          $('wsLog').innerText = 'Server: ' + (payload.type || '-') + value;
        }
      } catch (parseError) {
        if ($('wsLog')) {
          $('wsLog').innerText = 'Server: ' + text;
        }
      }
    };
  }

  // Sendet einen WebSocket-Textbefehl, falls verbunden
  function sendWS(cmd) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      if ($('wsLog')) {
        $('wsLog').innerText = 'WebSocket: nicht verbunden';
      }
      alert('Keine Verbindung zum ESP32.');
      return false;
    }
    socket.send(cmd);
    return true;
  }

  window.registerWsHandler = registerWsHandler;
  window.connectWS = connectWS;
  window.sendWS = sendWS;
})(window);
