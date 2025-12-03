(function (window) {
  'use strict';

  // Rendert Spieler- und Farbliste für die Spielseite
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

  // Liest die aktuelle Auswahl für Figur und Spieler
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

  // Fordert einen Würfelwurf an
  function rollDiceButton() {
    var feedback = $('gameFeedback');
    if (sendWS('roll')) {
      setFeedback(feedback, 'Wuerfelanfrage gesendet.', '#186e0e');
    }
  }

  // Lässt eine Figur auf dem Brett blinken
  function blinkPiece() {
    var selection = getPieceSelection();
    if (!selection) {
      return;
    }
    var cmd = 'select:' + selection.player + ':' + selection.figure;
    if (sendWS(cmd)) {
      setFeedback(selection.feedback, 'Figur wird markiert.', '#186e0e');
    }
  }

  // Bestätigt die Figurenauswahl für den Zug
  function confirmSelection() {
    var selection = getPieceSelection();
    if (!selection) {
      return;
    }
    var cmd = 'confirm:' + selection.player + ':' + selection.figure;
    if (sendWS(cmd)) {
      setFeedback(selection.feedback, 'Zug bestaetigt.', '#186e0e');
    }
  }

  // Zeigt eingehende Würfelergebnisse an
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

  // Initialisiert die Spielseite und lädt Lobby-Spieler
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

  window.renderGamePlayers = renderGamePlayers;
  window.getPieceSelection = getPieceSelection;
  window.rollDiceButton = rollDiceButton;
  window.blinkPiece = blinkPiece;
  window.confirmSelection = confirmSelection;
  window.handleDicePayload = handleDicePayload;
  window.initGame = initGame;
})(window);
