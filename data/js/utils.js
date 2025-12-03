(function (window) {
  'use strict';

  // DOM Kurzhelper für document.getElementById
  function $(id) {
    return document.getElementById(id);
  }

  // Schreibt eine Statusmeldung in ein Ziel-Element
  function setFeedback(target, message, color) {
    if (!target) {
      return;
    }
    target.style.color = color || '#333';
    target.textContent = message || '';
  }

  // Lädt die gespeicherte Userliste roh aus localStorage
  function rawLoadUsers() {
    try {
      return JSON.parse(localStorage.getItem('ludo_users') || '[]');
    } catch (err) {
      console.warn('Failed to parse user list', err);
      return [];
    }
  }

  // Speichert die Userliste in localStorage
  function saveUsers(users) {
    localStorage.setItem('ludo_users', JSON.stringify(users));
  }

  // Stellt sicher, dass Stats-Objekte gültige numerische Werte haben
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

  // Liefert die Userliste und repariert ggf. defekte Stats
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

  // Liefert Userliste, Index und User-Objekt für einen Namen
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

  // Liefert den eingeloggten Nutzernamen aus der Session
  function getCurrentUser() {
    return sessionStorage.getItem('ludo_user');
  }

  // Setzt den eingeloggten Nutzernamen in der Session
  function setCurrentUser(username) {
    sessionStorage.setItem('ludo_user', username);
  }

  // Entfernt den eingeloggten Nutzernamen aus der Session
  function clearCurrentUser() {
    sessionStorage.removeItem('ludo_user');
  }

  // Liefert die Siegquote in Prozent
  function winRate(stats) {
    if (!stats || !stats.total) {
      return 0;
    }
    return (stats.won / stats.total) * 100;
  }

  // Farbliste für Lobby/Figuren
  var LOBBY_COLORS = [
    { value: 'blue', label: 'Blau' },
    { value: 'red', label: 'Rot' },
    { value: 'yellow', label: 'Gelb' },
    { value: 'green', label: 'Gruen' }
  ];

  // Liefert den Anzeigenamen einer Farbe
  function colorLabel(color) {
    var match = LOBBY_COLORS.find(function (entry) {
      return entry.value === color;
    });
    return match ? match.label : 'Unbekannt';
  }

  // Normalisiert eine Farbeingabe auf bekannte Werte
  function normalizeLobbyColor(value) {
    var color = (value || '').toLowerCase();
    var match = LOBBY_COLORS.some(function (entry) {
      return entry.value === color;
    });
    return match ? color : '';
  }

  // Erstellt eine leere Lobby-Struktur
  function emptyLobby() {
    return { players: [] };
  }

  // Lädt die Lobby aus sessionStorage
  function loadLobby() {
    try {
      var parsed = JSON.parse(sessionStorage.getItem('ludo_lobby') || 'null');
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

  // Speichert die Lobby in sessionStorage
  function saveLobby(lobby) {
    var payload = lobby && Array.isArray(lobby.players) ? lobby.players.slice(0, 4) : [];
    sessionStorage.setItem('ludo_lobby', JSON.stringify({ players: payload }));
  }

  // Entfernt die Lobby aus sessionStorage
  function clearLobby() {
    sessionStorage.removeItem('ludo_lobby');
  }

  // Erstellt eine Map aller bereits belegten Farben
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

  // Liefert die nächste freie Farbe oder leer, falls alle vergeben
  function nextFreeColor(lobby) {
    var used = usedColors(lobby);
    var available = LOBBY_COLORS.find(function (entry) {
      return !used[entry.value];
    });
    return available ? available.value : '';
  }

  // Prüft Lobby auf Mindestspieler und Farb-Eindeutigkeit
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

  // Sucht einen Spielerindex nach Name in der Lobby
  function findPlayerIndex(lobby, name) {
    var players = lobby && Array.isArray(lobby.players) ? lobby.players : [];
    return players.findIndex(function (p) {
      return p && p.name && p.name.toLowerCase() === name.toLowerCase();
    });
  }

  // Fügt den aktuellen User zur Lobby hinzu (oder erstellt sie neu)
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

  // Export ins globale Window
  window.$ = $;
  window.setFeedback = setFeedback;
  window.rawLoadUsers = rawLoadUsers;
  window.saveUsers = saveUsers;
  window.normalizeUserStats = normalizeUserStats;
  window.getUsers = getUsers;
  window.getUsersAndIndex = getUsersAndIndex;
  window.getCurrentUser = getCurrentUser;
  window.setCurrentUser = setCurrentUser;
  window.clearCurrentUser = clearCurrentUser;
  window.winRate = winRate;
  window.LOBBY_COLORS = LOBBY_COLORS;
  window.colorLabel = colorLabel;
  window.normalizeLobbyColor = normalizeLobbyColor;
  window.emptyLobby = emptyLobby;
  window.loadLobby = loadLobby;
  window.saveLobby = saveLobby;
  window.clearLobby = clearLobby;
  window.usedColors = usedColors;
  window.nextFreeColor = nextFreeColor;
  window.lobbyValidation = lobbyValidation;
  window.findPlayerIndex = findPlayerIndex;
  window.joinCurrentUserToLobby = joinCurrentUserToLobby;
  window.LOBBY_KEY = 'ludo_lobby';
  window.GAME_START_KEY = 'ludo_game_start';
})(window);
