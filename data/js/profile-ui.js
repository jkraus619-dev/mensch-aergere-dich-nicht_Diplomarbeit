(function (window) {
  'use strict';

  // Schreibt Statistikwerte ins Profil-Dashboard
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

  // Richtet die Profilseite ein (Passwortwechsel, Reset, Live-Updates)
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
        var stats = mutateStats(username, function (data) {
          data.total = 0;
          data.won = 0;
          data.lost = 0;
        }) || { total: 0, won: 0, lost: 0 };
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

  window.renderProfileStats = renderProfileStats;
  window.initProfile = initProfile;
})(window);
