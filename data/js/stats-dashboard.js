(function (window) {
  'use strict';

  // Wendet eine Mutation auf einen User an und speichert die Liste
  function mutateUser(username, mutator) {
    var info = getUsersAndIndex(username);
    if (info.index < 0) {
      return null;
    }
    var result = mutator(info.user, info.users, info.index);
    saveUsers(info.users);
    return { user: info.user, users: info.users, index: info.index, result: result };
  }

  // Mutiert nur die Stats eines Users
  function mutateStats(username, updater) {
    var info = mutateUser(username, function (user) {
      return updater(user.stats);
    });
    return info ? info.user.stats : null;
  }

  // Holt die Stats eines Users
  function getUserStats(username) {
    var info = getUsersAndIndex(username);
    if (info.index < 0) {
      return null;
    }
    return info.user.stats;
  }

  // Schreibt Stats-Werte in die Dashboard-Anzeige
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
  // Zeigt temporäres Feedback auf dem Dashboard
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

  // Verbucht Sieg/Niederlage für den eingeloggten Nutzer
  function recordMatchResult(outcome) {
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
  }

  // Baut das Dashboard auf und verbindet WebSocket
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

  window.mutateUser = mutateUser;
  window.mutateStats = mutateStats;
  window.getUserStats = getUserStats;
  window.updateStatsDisplay = updateStatsDisplay;
  window.showDashFeedback = showDashFeedback;
  window.recordMatchResult = recordMatchResult;
  window.initDashboard = initDashboard;
})(window);
