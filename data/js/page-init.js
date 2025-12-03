(function (window) {
  'use strict';

  // Liefert den Dateinamen der aktuellen Seite
  function getPageName() {
    var path = (location.pathname || '').split('?')[0].split('#')[0];
    var segments = path.split('/');
    var last = segments.pop() || '';
    if (!last) {
      return 'index.html';
    }
    return last.toLowerCase();
  }

  // Reagiert auf einen Spielstart in einem anderen Tab und öffnet game.html
  function listenForGameStart() {
    window.addEventListener('storage', function (event) {
      if (event.key === GAME_START_KEY && event.newValue && getCurrentUser()) {
        location.href = 'game.html';
      }
    });
  }

  // Setzt Session-Daten zurück und bereinigt Lobby (für Login/Logout)
  function initIndexLike() {
    clearAllSession();
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

  window.getPageName = getPageName;
})(window);
