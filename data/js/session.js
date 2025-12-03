(function (window) {
  'use strict';

  // Prüft, ob ein Benutzer eingeloggt ist, sonst Redirect zur Anmeldung
  function requireSession() {
    var username = getCurrentUser();
    if (!username) {
      location.href = 'index.html';
      return null;
    }
    return username;
  }

  // Leert Session- und Lobby-Daten vollständig
  function clearAllSession() {
    clearCurrentUser();
    clearLobby();
    localStorage.removeItem(GAME_START_KEY);
  }

  window.requireSession = requireSession;
  window.clearAllSession = clearAllSession;
})(window);
