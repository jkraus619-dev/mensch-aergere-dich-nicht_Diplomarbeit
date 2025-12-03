(function (window) {
  'use strict';

  // Führt den Login durch und wechselt aufs Dashboard
  function login() {
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
  }

  // Registriert einen neuen Benutzer und leitet zur Anmeldung
  function register() {
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
  }

  // Loggt den Benutzer aus und leert alle Sitzungsspeicher
  function logout() {
    clearAllSession();
    location.href = 'index.html';
  }

  window.login = login;
  window.register = register;
  window.logout = logout;
})(window);
