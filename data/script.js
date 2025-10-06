/* script.js – Login/Register/Dashboard + WebSocket client
   Lokale Demo-Auth mit localStorage
   Läuft komplett im Browser (auch am Handy)
*/

(function(){
  // --- Utilities ---
  function $(id){ return document.getElementById(id); }
  function saveUsers(users){ localStorage.setItem('ludo_users', JSON.stringify(users)); }
  function loadUsers(){ return JSON.parse(localStorage.getItem('ludo_users')||'[]'); }

  // --- LOGIN ---
  window.login = function(){
    const u = $('username') ? $('username').value.trim() : "";
    const p = $('password') ? $('password').value : "";
    const log = $('log');
    if(!u || !p){ log.innerText = "Bitte alle Felder ausfüllen!"; return; }

    const users = loadUsers();
    const found = users.find(x=>x.username===u);
    if(found && found.password === p){
      sessionStorage.setItem('ludo_user', u);
      log.style.color = 'green';
      log.innerText = "✅ Erfolgreich angemeldet!";
      setTimeout(()=> location.href = "dashboard.html", 800);
    } else {
      log.style.color = 'red';
      log.innerText = "❌ Ungültiger Benutzername oder Passwort!";
    }
  };

  // --- REGISTER ---
  window.register = function(){
    const u = $('r_username') ? $('r_username').value.trim() : "";
    const p = $('r_password') ? $('r_password').value : "";
    const p2 = $('r_password2') ? $('r_password2').value : "";
    const log = $('rlog');

    if(!u||!p||!p2){ log.innerText="Bitte alle Felder ausfüllen!"; return; }
    if(p !== p2){ log.innerText = "❌ Passwörter stimmen nicht überein!"; return; }

    const users = loadUsers();
    if(users.find(x=>x.username===u)){ log.innerText = "❌ Benutzername bereits vergeben!"; return; }

    users.push({ username: u, password: p, stats: { total:0, won:0, lost:0 }});
    saveUsers(users);

    log.style.color = 'green';
    log.innerText = "✅ Registrierung erfolgreich! Weiterleitung...";
    setTimeout(()=> location.href='index.html', 1000);
  };

  // --- DASHBOARD ---
  let socket = null;
  function connectWS(){
    const host = location.hostname || "192.168.4.1";
    const url = `ws://${host}/ws`;
    try {
      socket = new WebSocket(url);
    } catch(e){
      console.warn("WS error",e);
      $('wsLog') && ($('wsLog').innerText = "WebSocket: Verbindung fehlgeschlagen");
      return;
    }

    if($('wsLog')) $('wsLog').innerText = "WebSocket: verbinde...";
    socket.onopen = () => { if($('wsLog')) $('wsLog').innerText = "WebSocket: verbunden"; };
    socket.onmessage = (ev) => {
      let data = ev.data;
      try {
        const j = JSON.parse(data);
        if($('wsLog')) $('wsLog').innerText = `Server: ${j.type} ${j.value||''}`;
        if(j.type === 'dice_result'){
          alert("🎲 Würfelergebnis: " + j.value);
        }
      } catch(e){ if($('wsLog')) $('wsLog').innerText = "Server: " + data; }
    };
    socket.onclose = ()=> { if($('wsLog')) $('wsLog').innerText = "WebSocket: getrennt"; };
    socket.onerror = ()=> { if($('wsLog')) $('wsLog').innerText = "WebSocket: Fehler"; };
  }

  window.sendWS = function(cmd){
    if(!socket || socket.readyState !== WebSocket.OPEN){
      alert("⚠️ Keine Verbindung zum ESP32.");
      return;
    }
    socket.send(cmd);
  };

  window.startGame = function(){
    sendWS('startGame');
    const u = sessionStorage.getItem('ludo_user');
    if(u){
      const users = loadUsers();
      const me = users.find(x=>x.username===u);
      if(me){ me.stats.total++; saveUsers(users); updateStatsDisplay(me.stats); }
    }
  };

  window.logout = function(){
    sessionStorage.removeItem('ludo_user');
    location.href = 'index.html';
  };

  // --- Stat-Anzeige ---
  function updateStatsDisplay(stats){
    if($('totalGames')) $('totalGames').innerText = stats.total || 0;
    if($('wonGames')) $('wonGames').innerText = stats.won || 0;
    if($('lostGames')) $('lostGames').innerText = stats.lost || 0;
  }

  // --- INIT ---
  if(location.pathname.endsWith('dashboard.html')){
    const user = sessionStorage.getItem('ludo_user');
    if(!user){ location.href='index.html'; }
    else {
      if($('userDisplay')) $('userDisplay').innerText = user;
      const users = loadUsers();
      const me = users.find(x=>x.username===user);
      if(me) updateStatsDisplay(me.stats || {});
      connectWS();
    }
  }
})();
