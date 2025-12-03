/* script.js - Login/Register/Dashboard helpers for ESP32 web UI */

(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function rawLoadUsers() {
    try {
      return JSON.parse(localStorage.getItem('ludo_users') || '[]');
    } catch (err) {
      console.warn('Failed to parse user list', err);
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem('ludo_users', JSON.stringify(users));
  }

  function normalizeUserStats(user) {
    if (!user || typeof user !== 'object') {
      return false;
    }
    var dirty = false;
    if (!user.stats || typeof user.stats !== 'object') {
      user.stats = { total: 0, won: 0, lost: 0 };
      return true;
    }
    var stats = user.stats;
    ['total', 'won', 'lost'].forEach(function (key) {
      var value = Number(stats[key]);
      if (!Number.isFinite(value) || value < 0) {
        value = 0;
      }
      if (stats[key] !== value) {
        stats[key] = value;
        dirty = true;
      }
    });
    return dirty;
  }

  function getUsers() {
    var users = rawLoadUsers();
    if (!Array.isArray(users)) {
      users = [];
    }
    var dirty = false;
    users.forEach(function (user) {
      if (normalizeUserStats(user)) {
        dirty = true;
      }
    });
    if (dirty) {
      saveUsers(users);
    }
    return users;
  }

  function getUsersAndIndex(username) {
    var users = getUsers();
    var index = users.findIndex(function (entry) {
      return entry && entry.username === username;
    });
    return {
      users: users,
      index: index,
      user: index >= 0 ? users[index] : null
    };
  }

  function getCurrentUser() {
    return sessionStorage.getItem('ludo_user');
  }

  function setCurrentUser(username) {
    sessionStorage.setItem('ludo_user', username);
  }

  function clearCurrentUser() {
    sessionStorage.removeItem('ludo_user');
  }

  function setFeedback(target, message, color) {
    if (!target) {
      return;
    }
    target.style.color = color || '#333';
    target.textContent = message || '';
  }

  var LOBBY_KEY = 'ludo_lobby';
  var LOBBY_COLORS = [
    { value: 'blue', label: 'Blau' },
    { value: 'red', label: 'Rot' },
    { value: 'yellow', label: 'Gelb' },
    { value: 'green', label: 'Gruen' }
  ];
  var GAME_START_KEY = 'ludo_game_start';

  function normalizeLobbyColor(value) {
    var color = (value || '').toLowerCase();
    var match = LOBBY_COLORS.some(function (entry) {
      return entry.value === color;
    });
    return match ? color : '';
  }

  function emptyLobby() {
    return { players: [] };
  }

  function loadLobby() {
    try {
      var parsed = JSON.parse(sessionStorage.getItem(LOBBY_KEY) || 'null');
      if (!parsed || !Array.isArray(parsed.players)) {
        return emptyLobby();
      }
      var players = parsed.players.slice(0, 4).map(function (entry) {
        var name = entry && entry.name ? String(entry.name).trim() : '';
        var color = normalizeLobbyColor(entry && entry.color);
        if (!name) {
          return null;
        }
        return { name: name, color: color };
      }).filter(Boolean);
      return { players: players };
    } catch (err) {
      console.warn('Lobby parse failed', err);
      return emptyLobby();
    }
  }

  function saveLobby(lobby) {
    var payload = lobby && Array.isArray(lobby.players) ? lobby.players.slice(0, 4) : [];
    sessionStorage.setItem(LOBBY_KEY, JSON.stringify({ players: payload }));
  }

  function clearLobby() {
    sessionStorage.removeItem(LOBBY_KEY);
  }

  function usedColors(lobby) {
    var players = lobby && Array.isArray(lobby.players) ? lobby.players : [];
    var map = {};
    players.forEach(function (p) {
      if (p && p.color) {
        map[p.color] = true;
      }
    });
    return map;
  }

  function nextFreeColor(lobby) {
    var used = usedColors(lobby);
    var available = LOBBY_COLORS.find(function (entry) {
      return !used[entry.value];
    });
    return available ? available.value : '';
  }

  function lobbyValidation(lobby) {
    var players = lobby && Array.isArray(lobby.players) ? lobby.players : [];
    if (players.length < 2) {
      return { ok: false, message: 'Mindestens 2 Spieler anlegen.' };
    }
    var seenColors = {};
    for (var i = 0; i < players.length; i += 1) {
      var player = players[i];
      if (!player || !player.name) {
        return { ok: false, message: 'Spielernamen duerfen nicht leer sein.' };
      }
      if (!player.color) {
        return { ok: false, message: 'Jeder Spieler braucht eine Farbe.' };
      }
      if (seenColors[player.color]) {
        return { ok: false, message: 'Alle Farben muessen verschieden sein.' };
      }
      seenColors[player.color] = true;
    }
    return { ok: true, message: 'Bereit zum Start.' };
  }

  function findPlayerIndex(lobby, name) {
    var players = lobby && Array.isArray(lobby.players) ? lobby.players : [];
    return players.findIndex(function (p) {
      return p && p.name && p.name.toLowerCase() === name.toLowerCase();
    });
  }

  function joinCurrentUserToLobby(options) {
    var username = getCurrentUser();
    if (!username) {
      return { ok: false, message: 'Bitte zuerst anmelden.', lobby: emptyLobby() };
    }
    var lobby = (options && options.reset) ? emptyLobby() : loadLobby();
    var existingIndex = findPlayerIndex(lobby, username);
    if (existingIndex >= 0) {
      return { ok: true, lobby: lobby, joined: false };
    }
    if (lobby.players.length >= 4) {
      return { ok: false, message: 'Lobby ist voll (max. 4 Spieler).', lobby: lobby };
    }
    var color = nextFreeColor(lobby);
    lobby.players.push({ name: username, color: color });
    saveLobby(lobby);
    return { ok: true, lobby: lobby, joined: true };
  }

  window.login = function () {
    var usernameInput = $('username');
    var passwordInput = $('password');
    var log = $('log');
    var username = usernameInput ? usernameInput.value.trim() : '';
    var password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
      setFeedback(log, 'Bitte alle Felder ausfuellen.', '#b32121');
      return;
    }

    var info = getUsersAndIndex(username);
    if (info.user && info.user.password === password) {
      setCurrentUser(username);
      setFeedback(log, 'Erfolgreich angemeldet.', '#186e0e');
      setTimeout(function () {
        location.href = 'dashboard.html';
      }, 500);
    } else {
      setFeedback(log, 'Benutzername oder Passwort falsch.', '#b32121');
    }
  };

  window.register = function () {
    var username = $('r_username') ? $('r_username').value.trim() : '';
    var password = $('r_password') ? $('r_password').value : '';
    var passwordRepeat = $('r_password2') ? $('r_password2').value : '';
    var log = $('rlog');

    if (!username || !password || !passwordRepeat) {
      setFeedback(log, 'Bitte alle Felder ausfuellen.', '#b32121');
      return;
    }
    if (password !== passwordRepeat) {
      setFeedback(log, 'Passwoerter stimmen nicht ueberein.', '#b32121');
      return;
    }
    if (password.length < 4) {
      setFeedback(log, 'Passwort muss mindestens 4 Zeichen haben.', '#b32121');
      return;
    }

    var users = getUsers();
    var exists = users.some(function (entry) {
      return entry && entry.username === username;
    });
    if (exists) {
      setFeedback(log, 'Benutzername bereits vergeben.', '#b32121');
      return;
    }

    users.push({
      username: username,
      password: password,
      stats: { total: 0, won: 0, lost: 0 }
    });
    saveUsers(users);

    setFeedback(log, 'Registrierung erfolgreich. Weiterleitung zur Anmeldung.', '#186e0e');
    setTimeout(function () {
      location.href = 'index.html';
    }, 700);
  };

  window.logout = function () {
    clearCurrentUser();
    clearLobby();
    localStorage.removeItem(GAME_START_KEY);
    location.href = 'index.html';
  };

  function requireSession() {
    var username = getCurrentUser();
    if (!username) {
      location.href = 'index.html';
      return null;
    }
    return username;
  }

  function mutateUser(username, mutator) {
    var info = getUsersAndIndex(username);
    if (info.index < 0) {
      return null;
    }
    var result = mutator(info.user, info.users, info.index);
    saveUsers(info.users);
    return { user: info.user, users: info.users, index: info.index, result: result };
  }

  function mutateStats(username, updater) {
    var info = mutateUser(username, function (user) {
      return updater(user.stats);
    });
    return info ? info.user.stats : null;
  }

  function getUserStats(username) {
    var info = getUsersAndIndex(username);
    if (info.index < 0) {
      return null;
    }
    return info.user.stats;
  }

  function winRate(stats) {
    if (!stats || !stats.total) {
      return 0;
    }
    return (stats.won / stats.total) * 100;
  }

  function updateStatsDisplay(stats) {
    var data = stats || { total: 0, won: 0, lost: 0 };
    if ($('totalGames')) {
      $('totalGames').textContent = String(data.total);
    }
    if ($('wonGames')) {
      $('wonGames').textContent = String(data.won);
    }
    if ($('lostGames')) {
      $('lostGames').textContent = String(data.lost);
    }
    if ($('winRate')) {
      var rate = winRate(data);
      $('winRate').textContent = (rate ? rate.toFixed(1) : '0.0') + '%';
    }
  }

  var dashMessageTimer = null;
  function showDashFeedback(message, color) {
    var feedback = $('dashFeedback');
    if (!feedback) {
      return;
    }
    if (dashMessageTimer) {
      clearTimeout(dashMessageTimer);
      dashMessageTimer = null;
    }
    setFeedback(feedback, message, color);
    if (message) {
      dashMessageTimer = setTimeout(function () {
        setFeedback(feedback, '');
        dashMessageTimer = null;
      }, 3000);
    }
  }

  window.createLobbyAndOpen = function () {
    var current = getCurrentUser();
    if (!current) {
      location.href = 'index.html';
      return;
    }
    clearLobby();
    localStorage.removeItem(GAME_START_KEY);
    var result = joinCurrentUserToLobby({ reset: true });
    if (!result.ok) {
      showDashFeedback(result.message || 'Lobby konnte nicht erstellt werden.', '#b32121');
      return;
    }
    showDashFeedback('Neue Lobby erstellt.', '#186e0e');
    location.href = 'pregame.html';
  };

  window.joinLobbyFromDashboard = function () {
    if (!getCurrentUser()) {
      location.href = 'index.html';
      return;
    }
    var result = joinCurrentUserToLobby();
    if (!result.ok) {
      showDashFeedback(result.message || 'Lobby beitreten fehlgeschlagen.', '#b32121');
      return;
    }
    showDashFeedback(result.joined ? 'Lobby beigetreten.' : 'Bereits in der Lobby.', '#186e0e');
    location.href = 'pregame.html';
  };

  window.startGame = function () {
    if (sendWS('startGame')) {
      showDashFeedback('Spielstart an ESP32 gesendet.', '#186e0e');
    } else {
      showDashFeedback('Keine Verbindung zum ESP32.', '#b32121');
    }
  };

  window.recordMatchResult = function (outcome) {
    var current = getCurrentUser();
    if (!current) {
      location.href = 'index.html';
      return;
    }
    if (outcome !== 'win' && outcome !== 'loss') {
      showDashFeedback('Unbekannter Spielausgang.', '#b32121');
      return;
    }
    var stats = mutateStats(current, function (data) {
      data.total += 1;
      if (outcome === 'win') {
        data.won += 1;
      } else {
        data.lost += 1;
      }
    });
    if (!stats) {
      showDashFeedback('Benutzer nicht gefunden.', '#b32121');
      return;
    }
    updateStatsDisplay(stats);
    if (outcome === 'win') {
      showDashFeedback('Sieg erfasst.', '#186e0e');
    } else if (outcome === 'loss') {
      showDashFeedback('Niederlage erfasst.', '#186e0e');
    }
  };

  function resetStats(username) {
    return mutateStats(username, function (data) {
      data.total = 0;
      data.won = 0;
      data.lost = 0;
    });
  }

  function computeLeaderboard(users) {
    return users
      .filter(function (entry) {
        return entry && typeof entry.username === 'string' && entry.username.length;
      })
      .map(function (entry) {
        var stats = entry.stats || { total: 0, won: 0, lost: 0 };
        return {
          username: entry.username,
          stats: {
            total: stats.total,
            won: stats.won,
            lost: stats.lost
          },
          rate: winRate(stats)
        };
      })
      .sort(function (a, b) {
        if (b.rate !== a.rate) {
          return b.rate - a.rate;
        }
        if (b.stats.won !== a.stats.won) {
          return b.stats.won - a.stats.won;
        }
        if (b.stats.total !== a.stats.total) {
          return b.stats.total - a.stats.total;
        }
        return a.username.localeCompare(b.username);
      });
  }

  function renderProfileStats(stats) {
    var data = stats || { total: 0, won: 0, lost: 0 };
    if ($('profileTotal')) {
      $('profileTotal').textContent = String(data.total);
    }
    if ($('profileWon')) {
      $('profileWon').textContent = String(data.won);
    }
    if ($('profileLost')) {
      $('profileLost').textContent = String(data.lost);
    }
    if ($('profileWinRate')) {
      var rate = winRate(data);
      $('profileWinRate').textContent = rate ? rate.toFixed(1) : '0.0';
    }
  }

  function renderStatsTable(username) {
    var users = getUsers();
    var table = $('statsTable');
    var tbody = table ? table.querySelector('tbody') : null;
    var emptyState = $('emptyState');

    if (!users.length) {
      if (emptyState) {
        emptyState.hidden = false;
      }
      if (table) {
        table.style.display = 'none';
      }
      setFeedback($('summaryPlayers'), '0');
      setFeedback($('summaryGames'), '0');
      setFeedback($('summaryLeader'), 'Keine Daten');
      setFeedback($('summaryRank'), '-');
      setFeedback($('tableTotalGames'), '0');
      setFeedback($('tableTotalWins'), '0');
      setFeedback($('tableTotalLosses'), '0');
      return;
    }

    if (emptyState) {
      emptyState.hidden = true;
    }
    if (table) {
      table.style.display = '';
    }

    var leaderboard = computeLeaderboard(users);
    var totals = { total: 0, won: 0, lost: 0 };

    if (tbody) {
      tbody.textContent = '';
      leaderboard.forEach(function (entry, idx) {
        totals.total += entry.stats.total;
        totals.won += entry.stats.won;
        totals.lost += entry.stats.lost;

        var tr = document.createElement('tr');
        if (entry.username === username) {
          tr.classList.add('is-current');
        }
        var rateText = entry.stats.total ? entry.rate.toFixed(1) + '%' : '0.0%';
        tr.innerHTML =
          '<td>' + (idx + 1) + '</td>' +
          '<td>' + entry.username + '</td>' +
          '<td>' + entry.stats.total + '</td>' +
          '<td>' + entry.stats.won + '</td>' +
          '<td>' + entry.stats.lost + '</td>' +
          '<td>' + rateText + '</td>';
        tbody.appendChild(tr);
      });
    }

    setFeedback($('summaryPlayers'), String(users.length));
    setFeedback($('summaryGames'), String(totals.total));
    var leader = leaderboard.find(function (entry) {
      return entry.stats.total > 0;
    });
    if (leader) {
      var text = leader.username + ' (' + leader.rate.toFixed(1) + '%)';
      setFeedback($('summaryLeader'), text);
    } else {
      setFeedback($('summaryLeader'), 'Noch keine Spiele');
    }
    var rankIndex = leaderboard.findIndex(function (entry) {
      return entry.username === username;
    });
    if (rankIndex >= 0) {
      setFeedback($('summaryRank'), '#' + (rankIndex + 1));
    } else {
      setFeedback($('summaryRank'), 'Keine Platzierung');
    }
    setFeedback($('tableTotalGames'), String(totals.total));
    setFeedback($('tableTotalWins'), String(totals.won));
    setFeedback($('tableTotalLosses'), String(totals.lost));
  }

  var socket = null;
  var currentWsContext = '';
  var wsHandlers = [];

  function registerWsHandler(handler) {
    if (typeof handler === 'function') {
      wsHandlers.push(handler);
    }
  }

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

  window.sendWS = function (cmd) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      if ($('wsLog')) {
        $('wsLog').innerText = 'WebSocket: nicht verbunden';
      }
      alert('Keine Verbindung zum ESP32.');
      return false;
    }
    socket.send(cmd);
    return true;
  };

  var batterySamples = [];

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

  function pushBatterySample(percent) {
    var now = Date.now();
    batterySamples.push({ time: now, percent: Math.max(0, Math.min(100, Number(percent) || 0)) });
    if (batterySamples.length > 200) {
      batterySamples.shift();
    }
    drawBatteryChart();
  }

  function handleBatteryPayload(message) {
    if (!message || message.type !== 'battery') {
      return;
    }
    setBatteryUI(message.percent, message.mv);
    pushBatterySample(message.percent);
  }

  registerWsHandler(handleBatteryPayload);

  function colorLabel(color) {
    var match = LOBBY_COLORS.find(function (entry) {
      return entry.value === color;
    });
    return match ? match.label : 'Unbekannt';
  }

  function renderLobby() {
    var lobby = loadLobby();
    var list = $('playerList');
    var feedback = $('pregameFeedback');
    var startBtn = $('pregameStartBtn');
    if (!list) {
      return;
    }
    list.textContent = '';
    var used = usedColors(lobby);

    if (!lobby.players.length) {
      var empty = document.createElement('p');
      empty.className = 'empty-state small';
      empty.textContent = 'Noch keine Spieler beigetreten. Im Dashboard auf \"Spiel beitreten\" klicken.';
      list.appendChild(empty);
    }

    lobby.players.forEach(function (player, idx) {
      var row = document.createElement('div');
      row.className = 'lobby-row';

      var name = document.createElement('div');
      name.className = 'lobby-name';
      name.textContent = player.name;
      row.appendChild(name);

      var selectWrap = document.createElement('div');
      selectWrap.className = 'lobby-color';
      var select = document.createElement('select');
      select.setAttribute('data-player-index', String(idx));
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Farbe waehlen';
      select.appendChild(placeholder);
      LOBBY_COLORS.forEach(function (choice) {
        var option = document.createElement('option');
        option.value = choice.value;
        option.textContent = choice.label;
        if (player.color === choice.value) {
          option.selected = true;
        }
        if (used[choice.value] && player.color !== choice.value) {
          option.disabled = true;
        }
        select.appendChild(option);
      });
      select.addEventListener('change', function (event) {
        changeLobbyColor(idx, event.target.value);
      });
      selectWrap.appendChild(select);
      row.appendChild(selectWrap);

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-ghost';
      removeBtn.textContent = 'Entfernen';
      removeBtn.addEventListener('click', function () {
        removeLobbyPlayer(idx);
      });
      row.appendChild(removeBtn);

      list.appendChild(row);
    });

    var validation = lobbyValidation(lobby);
    if (startBtn) {
      startBtn.disabled = !validation.ok;
    }
    setFeedback(feedback, validation.message || '', validation.ok ? '#186e0e' : '#b32121');
  }

  window.removeLobbyPlayer = function (index) {
    var lobby = loadLobby();
    if (index < 0 || index >= lobby.players.length) {
      return;
    }
    lobby.players.splice(index, 1);
    saveLobby(lobby);
    renderLobby();
  };

  function changeLobbyColor(index, color) {
    var lobby = loadLobby();
    if (index < 0 || index >= lobby.players.length) {
      return;
    }
    lobby.players[index].color = normalizeLobbyColor(color);
    saveLobby(lobby);
    renderLobby();
  }

  window.launchGame = function () {
    var lobby = loadLobby();
    var feedback = $('pregameFeedback');
    var validation = lobbyValidation(lobby);
    if (!validation.ok) {
      setFeedback(feedback, validation.message, '#b32121');
      return;
    }
    saveLobby(lobby);
    setFeedback(feedback, 'Spiel wird gestartet...', '#186e0e');
    try {
      sendWS(JSON.stringify({ type: 'startGame', players: lobby.players }));
    } catch (err) {
      console.warn('StartGame senden fehlgeschlagen', err);
    }
    try {
      localStorage.setItem(GAME_START_KEY, String(Date.now()));
    } catch (errStore) {
      console.warn('Konnte Spielstart-Flag nicht speichern', errStore);
    }
    setTimeout(function () {
      location.href = 'game.html';
    }, 250);
  };

  function renderGamePlayers() {
    var lobby = loadLobby();
    var list = $('gamePlayers');
    var select = $('piecePlayer');
    if (list) {
      list.textContent = '';
      if (!lobby.players.length) {
        var empty = document.createElement('p');
        empty.className = 'empty-state small';
        empty.textContent = 'Keine Spielerliste gefunden. Erstelle zuerst eine Runde.';
        list.appendChild(empty);
      } else {
        lobby.players.forEach(function (player) {
          var item = document.createElement('li');
          item.className = 'game-player';

          var name = document.createElement('span');
          name.className = 'game-player-name';
          name.textContent = player.name;

          var color = document.createElement('span');
          color.className = 'color-pill color-' + (player.color || 'none');
          color.textContent = player.color ? colorLabel(player.color) : 'Keine Farbe';

          item.appendChild(name);
          item.appendChild(color);
          list.appendChild(item);
        });
      }
    }
    if (select) {
      select.textContent = '';
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Spieler waehlen';
      select.appendChild(placeholder);
      lobby.players.forEach(function (player) {
        var option = document.createElement('option');
        option.value = player.name;
        option.textContent = player.name + ' (' + (player.color ? colorLabel(player.color) : 'keine Farbe') + ')';
        select.appendChild(option);
      });
    }
  }

  function getPieceSelection() {
    var playerSelect = $('piecePlayer');
    var figureSelect = $('pieceNumber');
    var feedback = $('gameFeedback');
    var playerName = playerSelect ? playerSelect.value : '';
    var figure = figureSelect ? Number(figureSelect.value) : NaN;
    if (!playerName) {
      setFeedback(feedback, 'Bitte Spieler waehlen.', '#b32121');
      return null;
    }
    if (!Number.isFinite(figure) || figure < 1 || figure > 4) {
      setFeedback(feedback, 'Figur zwischen 1 und 4 auswaehlen.', '#b32121');
      return null;
    }
    return { player: playerName, figure: figure, feedback: feedback };
  }

  window.rollDiceButton = function () {
    var feedback = $('gameFeedback');
    if (sendWS('roll')) {
      setFeedback(feedback, 'Wuerfelanfrage gesendet.', '#186e0e');
    }
  };

  window.blinkPiece = function () {
    var selection = getPieceSelection();
    if (!selection) {
      return;
    }
    var cmd = 'select:' + selection.player + ':' + selection.figure;
    if (sendWS(cmd)) {
      setFeedback(selection.feedback, 'Figur wird markiert.', '#186e0e');
    }
  };

  window.confirmSelection = function () {
    var selection = getPieceSelection();
    if (!selection) {
      return;
    }
    var cmd = 'confirm:' + selection.player + ':' + selection.figure;
    if (sendWS(cmd)) {
      setFeedback(selection.feedback, 'Zug bestaetigt.', '#186e0e');
    }
  };

  function handleDicePayload(message) {
    if (!message || message.type !== 'dice_result') {
      return;
    }
    var output = $('diceResult');
    if (output) {
      output.textContent = typeof message.value !== 'undefined' ? String(message.value) : '-';
    }
  }

  registerWsHandler(handleDicePayload);

  function listenForGameStart() {
    window.addEventListener('storage', function (event) {
      if (event.key === GAME_START_KEY && event.newValue && getCurrentUser()) {
        location.href = 'game.html';
      }
    });
  }

  function getPageName() {
    var path = (location.pathname || '').split('?')[0].split('#')[0];
    var segments = path.split('/');
    var last = segments.pop() || '';
    if (!last) {
      return 'index.html';
    }
    return last.toLowerCase();
  }

  function initDashboard() {
    var username = requireSession();
    if (!username) {
      return;
    }
    if ($('userDisplay')) {
      $('userDisplay').textContent = username;
    }
    var stats = getUserStats(username) || { total: 0, won: 0, lost: 0 };
    updateStatsDisplay(stats);
    window.addEventListener('storage', function (event) {
      if (event.key === 'ludo_users') {
        var updated = getUserStats(username) || { total: 0, won: 0, lost: 0 };
        updateStatsDisplay(updated);
      }
    });
    connectWS('dashboard');
  }

  function initBattery() {
    requireSession();
    connectWS('battery');
  }

  function initProfile() {
    var username = requireSession();
    if (!username) {
      return;
    }
    var info = getUsersAndIndex(username);
    if (info.index < 0) {
      clearCurrentUser();
      location.href = 'index.html';
      return;
    }
    if ($('profileName')) {
      $('profileName').textContent = username;
    }
    renderProfileStats(info.user.stats);

    var pwForm = $('passwordForm');
    var pwFeedback = $('pwFeedback');
    if (pwForm) {
      pwForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var currentPw = $('currentPassword') ? $('currentPassword').value : '';
        var newPw = $('newPassword') ? $('newPassword').value : '';
        var confirmPw = $('confirmPassword') ? $('confirmPassword').value : '';

        if (!currentPw || !newPw || !confirmPw) {
          setFeedback(pwFeedback, 'Bitte alle Felder ausfuellen.', '#b32121');
          return;
        }
        var lookup = getUsersAndIndex(username);
        if (lookup.index < 0) {
          setFeedback(pwFeedback, 'Benutzer nicht gefunden.', '#b32121');
          return;
        }
        var user = lookup.user;
        if (user.password !== currentPw) {
          setFeedback(pwFeedback, 'Aktuelles Passwort stimmt nicht.', '#b32121');
          return;
        }
        if (newPw.length < 4) {
          setFeedback(pwFeedback, 'Neues Passwort muss mindestens 4 Zeichen haben.', '#b32121');
          return;
        }
        if (newPw !== confirmPw) {
          setFeedback(pwFeedback, 'Bestaetigung stimmt nicht.', '#b32121');
          return;
        }
        user.password = newPw;
        saveUsers(lookup.users);
        if ($('currentPassword')) {
          $('currentPassword').value = '';
        }
        if ($('newPassword')) {
          $('newPassword').value = '';
        }
        if ($('confirmPassword')) {
          $('confirmPassword').value = '';
        }
        setFeedback(pwFeedback, 'Passwort aktualisiert.', '#186e0e');
      });
    }

    var resetButton = $('resetStatsBtn');
    var resetFeedback = $('resetFeedback');
    if (resetButton) {
      resetButton.addEventListener('click', function () {
        if (!window.confirm('Statistik wirklich zuruecksetzen?')) {
          return;
        }
        var stats = resetStats(username) || { total: 0, won: 0, lost: 0 };
        renderProfileStats(stats);
        setFeedback(resetFeedback, 'Statistik zurueckgesetzt.', '#186e0e');
        setTimeout(function () {
          setFeedback(resetFeedback, '');
        }, 2500);
      });
    }

    window.addEventListener('storage', function (event) {
      if (event.key === 'ludo_users') {
        var updated = getUserStats(username) || { total: 0, won: 0, lost: 0 };
        renderProfileStats(updated);
      }
    });

    connectWS('profile');
  }

  function initStats() {
    var username = requireSession();
    if (!username) {
      return;
    }
    renderStatsTable(username);
    connectWS('stats');

    window.addEventListener('storage', function (event) {
      if (event.key === 'ludo_users') {
        renderStatsTable(username);
      }
    });
  }

  function initPregame() {
    var username = requireSession();
    if (!username) {
      return;
    }
    joinCurrentUserToLobby();
    renderLobby();
    connectWS('pregame');
  }

  function initGame() {
    var username = requireSession();
    if (!username) {
      return;
    }
    renderGamePlayers();
    window.addEventListener('storage', function (event) {
      if (event.key === LOBBY_KEY) {
        renderGamePlayers();
      }
    });
    connectWS('game');
  }

  function initIndexLike() {
    clearCurrentUser();
    clearLobby();
    localStorage.removeItem(GAME_START_KEY);
  }

  document.addEventListener('DOMContentLoaded', function () {
    listenForGameStart();
    var page = getPageName();
    if (page === 'index.html' || page === 'register.html' || page === '') {
      initIndexLike();
    } else if (page === 'dashboard.html') {
      initDashboard();
    } else if (page === 'battery.html') {
      initBattery();
    } else if (page === 'profile.html') {
      initProfile();
    } else if (page === 'stats.html') {
      initStats();
    } else if (page === 'pregame.html') {
      initPregame();
    } else if (page === 'game.html') {
      initGame();
    }
  });

})();
