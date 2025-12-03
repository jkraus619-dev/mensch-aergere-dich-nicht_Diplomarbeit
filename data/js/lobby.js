(function (window) {
  'use strict';

  // Baut die Lobby-Liste samt Farbdropdowns
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
      empty.textContent = 'Noch keine Spieler beigetreten. Im Dashboard auf "Spiel beitreten" klicken.';
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

  // Entfernt einen Spieler aus der Lobby
  function removeLobbyPlayer(index) {
    var lobby = loadLobby();
    if (index < 0 || index >= lobby.players.length) {
      return;
    }
    lobby.players.splice(index, 1);
    saveLobby(lobby);
    renderLobby();
  }

  // Ändert die Farbe eines Spielers in der Lobby
  function changeLobbyColor(index, color) {
    var lobby = loadLobby();
    if (index < 0 || index >= lobby.players.length) {
      return;
    }
    lobby.players[index].color = normalizeLobbyColor(color);
    saveLobby(lobby);
    renderLobby();
  }

  // Erzeugt eine frische Lobby mit aktuellem User und öffnet Pregame
  function createLobbyAndOpen() {
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
  }

  // Tritt einer vorhandenen Lobby bei und öffnet Pregame
  function joinLobbyFromDashboard() {
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
  }

  // Startet das Spiel, prüft Farben und leitet weiter
  function launchGame() {
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
  }

  // Initialisiert die Pregame-Seite und hält Lobby aktuell
  function initPregame() {
    var username = requireSession();
    if (!username) {
      return;
    }
    joinCurrentUserToLobby();
    renderLobby();
    connectWS('pregame');
  }

  window.renderLobby = renderLobby;
  window.removeLobbyPlayer = removeLobbyPlayer;
  window.changeLobbyColor = changeLobbyColor;
  window.createLobbyAndOpen = createLobbyAndOpen;
  window.joinLobbyFromDashboard = joinLobbyFromDashboard;
  window.launchGame = launchGame;
  window.initPregame = initPregame;
})(window);
