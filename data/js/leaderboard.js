(function (window) {
  'use strict';

  // Baut eine sortierte Leaderboard-Liste aus allen Usern
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

  // Rendert die Statistik-Tabelle und Zusammenfassung
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

  // Initialisiert die Stats-Seite und verbindet WebSocket
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

  window.computeLeaderboard = computeLeaderboard;
  window.renderStatsTable = renderStatsTable;
  window.initStats = initStats;
})(window);
