(function (window) {
  'use strict';

  var batterySamples = [];

  // Aktualisiert Balkenfarbe, Prozent- und Spannungslabel
  function setBatteryUI(percent, millivolt) {
    var pct = Math.max(0, Math.min(100, Number(percent) || 0));
    var mv = Number(millivolt) || 0;
    var fill = $('batteryFill');
    if (fill) {
      fill.style.width = pct + '%';
      var fillColor = '#2e7d32';
      if (pct <= 30) {
        fillColor = '#c62828';
      } else if (pct <= 70) {
        fillColor = '#f9a825';
      }
      fill.style.background = fillColor;
    }
    var percentLabel = $('percent');
    if (percentLabel) {
      percentLabel.textContent = pct.toFixed(0);
    }
    var voltageLabel = $('voltage');
    if (voltageLabel) {
      voltageLabel.textContent = (mv / 1000).toFixed(2);
    }
  }

  // Zeichnet den Verlauf des Akku-Prozents in das Canvas
  function drawBatteryChart() {
    var canvas = $('batChart');
    if (!canvas) {
      return;
    }

    var targetWidth = canvas.clientWidth || canvas.width;
    var targetHeight = canvas.clientHeight || canvas.height;
    if (targetWidth && canvas.width !== targetWidth) {
      canvas.width = targetWidth;
    }
    if (targetHeight && canvas.height !== targetHeight) {
      canvas.height = targetHeight;
    }

    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (batterySamples.length < 2) {
      return;
    }

    var padding = 24;
    var xMin = batterySamples[0].time;
    var xMax = batterySamples[batterySamples.length - 1].time;
    if (xMax === xMin) {
      xMax += 1;
    }
    var yMin = 0;
    var yMax = 100;

    function mapX(time) {
      return padding + ((time - xMin) / (xMax - xMin)) * (canvas.width - 2 * padding);
    }

    function mapY(percent) {
      return canvas.height - padding - ((percent - yMin) / (yMax - yMin)) * (canvas.height - 2 * padding);
    }

    context.strokeStyle = '#888';
    context.beginPath();
    context.moveTo(padding, padding);
    context.lineTo(padding, canvas.height - padding);
    context.lineTo(canvas.width - padding, canvas.height - padding);
    context.stroke();

    context.beginPath();
    context.strokeStyle = '#186e0e';
    batterySamples.forEach(function (sample, index) {
      var x = mapX(sample.time);
      var y = mapY(sample.percent);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();
  }

  // Fügt einen neuen Akkupunkt hinzu und zeichnet erneut
  function pushBatterySample(percent) {
    var now = Date.now();
    batterySamples.push({ time: now, percent: Math.max(0, Math.min(100, Number(percent) || 0)) });
    if (batterySamples.length > 200) {
      batterySamples.shift();
    }
    drawBatteryChart();
  }

  // Reagiert auf eingehende Battery-Payloads vom WebSocket
  function handleBatteryPayload(message) {
    if (!message || message.type !== 'battery') {
      return;
    }
    setBatteryUI(message.percent, message.mv);
    pushBatterySample(message.percent);
  }

  registerWsHandler(handleBatteryPayload);

  // Initialisiert die Batterieseite und verbindet WebSocket
  function initBattery() {
    requireSession();
    connectWS('battery');
  }

  window.setBatteryUI = setBatteryUI;
  window.drawBatteryChart = drawBatteryChart;
  window.pushBatterySample = pushBatterySample;
  window.handleBatteryPayload = handleBatteryPayload;
  window.initBattery = initBattery;
})(window);
