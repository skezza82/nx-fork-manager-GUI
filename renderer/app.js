// NX Fork Manager GUI Application Logic
(function () {
  let appState = null;
  let activeTab = 'forks';
  let forkFilter = 'all';
  let searchQuery = '';
  let viewMode = 'cards';
  let isExecuting = false;
  let activeDocId = 'README.md';
  let currentGameForNote = null;

  // DOM Elements
  const el = {
    badgeForkCount: document.getElementById('badge-fork-count'),
    badgeGameCount: document.getElementById('badge-game-count'),
    apiIndicator: document.getElementById('api-indicator'),
    apiRateVal: document.getElementById('api-rate-val'),
    apiStatusCard: document.getElementById('api-status-card'),
    btnToggleTerminal: document.getElementById('btn-toggle-terminal'),
    logPing: document.getElementById('log-ping'),
    pageTitle: document.getElementById('page-title'),
    pageDesc: document.getElementById('page-desc'),
    globalSearch: document.getElementById('global-search'),
    searchClear: document.getElementById('search-clear'),
    btnSyncGuide: document.getElementById('btn-sync-guide'),
    btnCheckUpdates: document.getElementById('btn-check-updates'),
    btnUpdateAll: document.getElementById('btn-update-all'),
    btnOpenForksDir: document.getElementById('btn-open-forks-dir'),
    forkFilterPills: document.getElementById('fork-filter-pills'),
    forksGrid: document.getElementById('forks-grid'),
    forksTableContainer: document.getElementById('forks-table-container'),
    forksTableBody: document.getElementById('forks-table-body'),
    forksEmpty: document.getElementById('forks-empty'),
    viewCardsBtn: document.getElementById('view-cards-btn'),
    viewTableBtn: document.getElementById('view-table-btn'),
    countAll: document.getElementById('count-all'),
    countInstalled: document.getElementById('count-installed'),
    countCustom: document.getElementById('count-custom'),
    countPinned: document.getElementById('count-pinned'),
    gamesTableBody: document.getElementById('games-table-body'),
    gamesEmpty: document.getElementById('games-empty'),
    guideInfoText: document.getElementById('guide-info-text'),
    guideGpuTag: document.getElementById('guide-gpu-tag'),
    inputForkUrl: document.getElementById('input-fork-url'),
    btnSubmitAddFork: document.getElementById('btn-submit-add-fork'),
    addProgressBox: document.getElementById('add-progress-box'),
    addResultBox: document.getElementById('add-result-box'),
    customForksList: document.getElementById('custom-forks-list'),
    docsNavList: document.getElementById('docs-nav-list'),
    docActiveTitle: document.getElementById('doc-active-title'),
    docActiveBody: document.getElementById('doc-active-body'),
    btnOpenDocExternal: document.getElementById('btn-open-doc-external'),
    settingsForm: document.getElementById('settings-form'),
    settingGpu: document.getElementById('setting-gpu'),
    settingInstallDir: document.getElementById('setting-install-dir'),
    btnBrowseFolder: document.getElementById('btn-browse-folder'),
    btnOpenFolderExplorer: document.getElementById('btn-open-folder-explorer'),
    settingInterval: document.getElementById('setting-interval'),
    settingToken: document.getElementById('setting-token'),
    btnToggleTokenVis: document.getElementById('btn-toggle-token-vis'),
    btnTestToken: document.getElementById('btn-test-token'),
    tokenTestResult: document.getElementById('token-test-result'),
    terminalDrawer: document.getElementById('terminal-drawer'),
    terminalOutput: document.getElementById('terminal-output'),
    btnClearTerminal: document.getElementById('btn-clear-terminal'),
    btnCloseTerminal: document.getElementById('btn-close-terminal'),
    btnCancelAction: document.getElementById('btn-cancel-action'),
    modalNote: document.getElementById('modal-note'),
    modalNoteTitle: document.getElementById('modal-note-title'),
    selectNoteFork: document.getElementById('select-note-fork'),
    inputNoteText: document.getElementById('input-note-text'),
    checkNotePrefer: document.getElementById('check-note-prefer'),
    noteHistorySection: document.getElementById('note-history-section'),
    noteHistoryList: document.getElementById('note-history-list'),
    btnCloseModalNote: document.getElementById('btn-close-modal-note'),
    btnCancelNote: document.getElementById('btn-cancel-note'),
    btnSaveNote: document.getElementById('btn-save-note'),
    toastContainer: document.getElementById('toast-container'),
    linkUpstreamRepo: document.getElementById('link-upstream-repo'),
    linkGuideRepo: document.getElementById('link-guide-repo')
  };

  // Toast Notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  // Terminal logging
  function logToTerminal(text, isError = false) {
    const line = document.createElement('div');
    line.className = `term-line ${isError ? 'stderr' : 'stdout'}`;
    if (text.startsWith('> powershell')) line.className = 'term-line cmd';
    line.textContent = text;
    el.terminalOutput.appendChild(line);
    el.terminalOutput.scrollTop = el.terminalOutput.scrollHeight;

    // Pulse indicator
    el.logPing.classList.add('active');
    setTimeout(() => el.logPing.classList.remove('active'), 1500);
  }

  function openTerminal() {
    el.terminalDrawer.classList.add('open');
  }

  function closeTerminal() {
    el.terminalDrawer.classList.remove('open');
  }

  // Load and refresh state
  async function refreshState() {
    try {
      appState = await window.api.getAppState();
      renderAll();
    } catch (err) {
      showToast('Failed to load state: ' + err.message, 'error');
    }
  }

  // Check rate limit
  async function checkApiQuota(tokenOverride) {
    try {
      el.apiRateVal.textContent = 'Checking...';
      const res = await window.api.checkRateLimit(tokenOverride);
      if (res.success && res.rate) {
        const { limit, remaining, reset } = res.rate;
        el.apiRateVal.textContent = `${remaining} / ${limit}`;
        el.apiIndicator.className = 'status-indicator';
        if (remaining < 10) el.apiIndicator.classList.add('danger');
        else if (remaining < 25) el.apiIndicator.classList.add('warning');

        const resetDate = new Date(reset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        el.apiStatusCard.title = `GitHub API: ${remaining}/${limit} remaining. Resets at ${resetDate}. ${res.tokenUsed ? '(Using GITHUB_TOKEN)' : '(Unauthenticated IP limit)'}`;
        return res;
      } else {
        el.apiRateVal.textContent = 'Err / Limit';
        el.apiIndicator.className = 'status-indicator danger';
        el.apiStatusCard.title = res.error || 'Rate limit check failed';
        return res;
      }
    } catch (e) {
      el.apiRateVal.textContent = 'Offline';
      return { success: false, error: e.message };
    }
  }

  // Run PowerShell action with terminal UI integration
  async function executeAction(params, autoOpenTerminal = true) {
    if (isExecuting) {
      showToast('Another operation is already running!', 'error');
      return;
    }
    isExecuting = true;
    el.btnCancelAction.style.display = 'inline-flex';
    if (autoOpenTerminal) openTerminal();

    try {
      const res = await window.api.runPsAction(params);
      if (res.state) {
        appState = res.state;
        renderAll();
      } else {
        await refreshState();
      }

      if (res.success) {
        showToast(`Operation ${params.action} completed successfully`, 'success');
      } else {
        showToast(`Operation ${params.action} failed: ${res.error || 'Check logs'}`, 'error');
      }
      return res;
    } catch (err) {
      logToTerminal(`Execution error: ${err.message}`, true);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      isExecuting = false;
      el.btnCancelAction.style.display = 'none';
      checkApiQuota();
    }
  }

  // Tab switching
  function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });

    switch (tabId) {
      case 'forks':
        el.pageTitle.textContent = 'Forks Library';
        el.pageDesc.textContent = 'Manage, launch, and automatically update your Nintendo Switch emulator builds.';
        break;
      case 'games':
        el.pageTitle.textContent = 'Game Recommendations';
        el.pageDesc.textContent = 'Wichforks community best-fork matrix with automatic GPU compatibility and custom notes.';
        break;
      case 'add':
        el.pageTitle.textContent = 'Add Custom Fork';
        el.pageDesc.textContent = 'Import any GitHub release, Forgejo repository, or GitHub Actions workflow.';
        break;
      case 'docs':
        el.pageTitle.textContent = 'Wichforks Knowledge Base';
        el.pageDesc.textContent = 'Community benchmark reports, project performance notes, and fork comparison documentation.';
        loadDoc(activeDocId);
        break;
      case 'settings':
        el.pageTitle.textContent = 'Settings & Configuration';
        el.pageDesc.textContent = 'Hardware GPU profile, installation paths, GitHub access tokens, and check frequency.';
        populateSettings();
        break;
    }
  }

  // Render Forks Tab
  function renderForks() {
    if (!appState || !appState.forks) return;

    const stateObj = appState.state || {};
    const customIds = appState.customIds || [];
    const checks = appState.checks || {};

    let installedCount = 0;
    let customCount = customIds.length;
    let pinnedCount = 0;

    appState.forks.forEach(f => {
      const entry = stateObj[f.id];
      if (entry) {
        installedCount++;
        if (entry.pinned) pinnedCount++;
      }
    });

    el.badgeForkCount.textContent = appState.forks.length;
    el.countAll.textContent = appState.forks.length;
    el.countInstalled.textContent = installedCount;
    el.countCustom.textContent = customCount;
    el.countPinned.textContent = pinnedCount;

    // Filter
    const filtered = appState.forks.filter(f => {
      const entry = stateObj[f.id];
      const isCustom = customIds.includes(f.id);
      const isPinned = entry && entry.pinned;
      const isInstalled = Boolean(entry);

      if (forkFilter === 'installed' && !isInstalled) return false;
      if (forkFilter === 'custom' && !isCustom) return false;
      if (forkFilter === 'pinned' && !isPinned) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = f.name.toLowerCase().includes(q);
        const matchRepo = f.repo && f.repo.toLowerCase().includes(q);
        const matchId = f.id.toLowerCase().includes(q);
        if (!matchName && !matchRepo && !matchId) return false;
      }
      return true;
    });

    el.forksEmpty.style.display = filtered.length === 0 ? 'block' : 'none';

    // Render Cards
    el.forksGrid.innerHTML = '';
    filtered.forEach(f => {
      const entry = stateObj[f.id];
      const isInstalled = Boolean(entry);
      const isCustom = customIds.includes(f.id);
      const isPinned = entry && entry.pinned;
      const hasRollback = entry && entry.previous;
      const checkKey = `checked:${f.id}`;
      const lastCheckTime = checks[checkKey] ? new Date(checks[checkKey]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never';

      const card = document.createElement('div');
      card.className = `fork-card ${isInstalled ? 'installed' : ''}`;

      let sourceBadge = 'GitHub Release';
      if (f.source === 'actions') sourceBadge = 'GitHub Actions';
      if (f.source === 'forgejo') sourceBadge = `Forgejo (${f.host || 'eden'})`;

      card.innerHTML = `
        <div class="fork-card-header">
          <div class="fork-title-group">
            <div class="fork-name" title="${f.name}">${f.name}</div>
            <div class="fork-repo" title="Open repository on web">
              <span>${f.repo || f.id}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </div>
          </div>
          <div class="fork-badges">
            <span class="tag-badge source">${sourceBadge}</span>
            ${isCustom ? '<span class="tag-badge custom">Custom</span>' : ''}
            ${isPinned ? '<span class="tag-badge pinned">📌 Pinned</span>' : ''}
            ${hasRollback ? '<span class="tag-badge" title="Rollback to ' + entry.previous.tag + ' available">⏪ Prev</span>' : ''}
          </div>
        </div>

        <div class="fork-meta-grid">
          <div class="fork-meta-item">
            <span class="meta-lbl">Installed Tag</span>
            <span class="meta-val" style="color: ${isInstalled ? 'var(--neon-green)' : 'var(--text-muted)'}">
              ${isInstalled ? entry.tag : 'Not Installed'}
            </span>
          </div>
          <div class="fork-meta-item">
            <span class="meta-lbl">Last Checked</span>
            <span class="meta-val">${lastCheckTime}</span>
          </div>
          <div class="fork-meta-item">
            <span class="meta-lbl">Executable</span>
            <span class="meta-val">${(entry && entry.exe) || f.exe || 'auto-detect'}</span>
          </div>
          <div class="fork-meta-item">
            <span class="meta-lbl">Source / Date</span>
            <span class="meta-val">${(entry && entry.published) || (entry && entry.installed) || '-'}</span>
          </div>
        </div>

        <div class="fork-card-actions">
          <button class="btn btn-launch btn-action-launch" title="${isInstalled ? 'Launch emulator' : 'Download, install and launch'}">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>${isInstalled ? 'Launch' : 'Install & Launch'}</span>
          </button>

          <button class="btn btn-secondary btn-action-check" title="Check for newest releases without installing">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span>Check</span>
          </button>

          ${isInstalled ? `
            <button class="btn btn-secondary btn-action-pin" title="${isPinned ? 'Unpin to resume updates' : 'Pin to prevent automatic updates'}">
              <span>${isPinned ? 'Unpin' : 'Pin'}</span>
            </button>

            ${hasRollback ? `
              <button class="btn btn-secondary btn-action-rollback" title="Rollback to previous version: ${entry.previous.tag}">
                <span>Rollback</span>
              </button>
            ` : ''}

            <button class="btn btn-icon btn-action-folder" title="Open installation folder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            </button>
          ` : ''}

          ${isCustom ? `
            <button class="btn btn-danger btn-action-remove" title="Remove custom fork and delete files">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          ` : ''}
        </div>
      `;

      // Event Listeners on Card
      card.querySelector('.fork-repo').addEventListener('click', () => {
        let url = `https://github.com/${f.repo}`;
        if (f.source === 'forgejo') url = `https://${f.host}/${f.repo}`;
        window.api.openExternal(url);
      });

      card.querySelector('.btn-action-launch').addEventListener('click', () => {
        executeAction({ action: 'Open', fork: f.id });
      });

      card.querySelector('.btn-action-check').addEventListener('click', () => {
        executeAction({ action: 'Check', fork: f.id });
      });

      const pinBtn = card.querySelector('.btn-action-pin');
      if (pinBtn) {
        pinBtn.addEventListener('click', () => {
          executeAction({ action: isPinned ? 'Unpin' : 'Pin', fork: f.id });
        });
      }

      const rbBtn = card.querySelector('.btn-action-rollback');
      if (rbBtn) {
        rbBtn.addEventListener('click', () => {
          if (confirm(`Roll back ${f.name} to ${entry.previous.tag} and pin it?`)) {
            executeAction({ action: 'Rollback', fork: f.id });
          }
        });
      }

      const folderBtn = card.querySelector('.btn-action-folder');
      if (folderBtn) {
        folderBtn.addEventListener('click', () => {
          window.api.openExplorer(`${appState.installDir}\\${f.id}`);
        });
      }

      const removeBtn = card.querySelector('.btn-action-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          if (confirm(`Remove custom fork ${f.name} and delete its files?`)) {
            executeAction({ action: 'Remove', fork: f.id });
          }
        });
      }

      el.forksGrid.appendChild(card);
    });

    // Render Table View
    el.forksTableBody.innerHTML = '';
    filtered.forEach(f => {
      const entry = stateObj[f.id];
      const isInstalled = Boolean(entry);
      const isPinned = entry && entry.pinned;
      const isCustom = customIds.includes(f.id);
      const hasRollback = entry && entry.previous;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 700;">${f.name}</div>
          <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${f.repo || f.id}</div>
        </td>
        <td><span class="tag-badge source">${f.source}</span></td>
        <td>
          <span class="tag-badge ${isInstalled ? 'installed' : 'not-installed'}">
            ${isInstalled ? entry.tag : 'Not Installed'}
          </span>
          ${isPinned ? '<span class="tag-badge pinned">Pinned</span>' : ''}
        </td>
        <td>${hasRollback ? entry.previous.tag : '-'}</td>
        <td>${checks[`checked:${f.id}`] ? new Date(checks[`checked:${f.id}`]).toLocaleDateString() : '-'}</td>
        <td style="text-align: right;">
          <button class="btn btn-launch btn-sm tbl-launch">${isInstalled ? 'Launch' : 'Install'}</button>
          <button class="btn btn-secondary btn-sm tbl-check">Check</button>
          ${isInstalled ? `<button class="btn btn-secondary btn-sm tbl-folder">Folder</button>` : ''}
          ${isCustom ? `<button class="btn btn-danger btn-sm tbl-remove">Delete</button>` : ''}
        </td>
      `;

      tr.querySelector('.tbl-launch').addEventListener('click', () => executeAction({ action: 'Open', fork: f.id }));
      tr.querySelector('.tbl-check').addEventListener('click', () => executeAction({ action: 'Check', fork: f.id }));
      const fBtn = tr.querySelector('.tbl-folder');
      if (fBtn) fBtn.addEventListener('click', () => window.api.openExplorer(`${appState.installDir}\\${f.id}`));
      const rBtn = tr.querySelector('.tbl-remove');
      if (rBtn) rBtn.addEventListener('click', () => {
        if (confirm(`Remove custom fork ${f.name}?`)) executeAction({ action: 'Remove', fork: f.id });
      });

      el.forksTableBody.appendChild(tr);
    });
  }

  // Helper to find fork by recommendation label
  function resolveForkFromLabel(label) {
    if (!appState || !appState.forks || !label) return null;
    const clean = label.toLowerCase();
    for (const f of appState.forks) {
      if (clean.includes(f.id.toLowerCase())) return f;
      if (f.aliases) {
        for (const a of f.aliases) {
          if (clean.includes(a.toLowerCase())) return f;
        }
      }
      const firstWord = f.name.split(' ')[0].toLowerCase();
      if (clean.includes(firstWord)) return f;
    }
    return null;
  }

  // Render Games Tab
  function renderGames() {
    if (!appState) return;

    const games = appState.games || [];
    const notes = appState.notes || {};
    const stateObj = appState.state || {};
    const gpu = appState.config ? appState.config.gpu : '';

    el.badgeGameCount.textContent = games.length;
    el.guideGpuTag.textContent = gpu ? `GPU Filter: ${gpu}` : 'GPU Filter: None';

    if (appState.guideSource) {
      const date = new Date(appState.guideSource.date).toLocaleDateString();
      el.guideInfoText.textContent = `Wichforks commit ${appState.guideSource.sha.substring(0, 8)} (${date}). Your personal game notes automatically override recommendations.`;
    }

    const filtered = games.filter(g => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = g.name.toLowerCase().includes(q);
        const matchRec = g.recommended.toLowerCase().includes(q);
        const matchEv = g.evidence.toLowerCase().includes(q);
        const matchAlt = g.alternatives.toLowerCase().includes(q);
        if (!matchTitle && !matchRec && !matchEv && !matchAlt) return false;
      }
      return true;
    });

    el.gamesEmpty.style.display = filtered.length === 0 ? 'block' : 'none';
    el.gamesTableBody.innerHTML = '';

    filtered.forEach(g => {
      const userNote = notes[g.name];
      const hasPersonalOverride = userNote && userNote.fork;
      const matchedFork = resolveForkFromLabel(hasPersonalOverride ? userNote.fork : g.recommended);
      const isInstalled = matchedFork && stateObj[matchedFork.id];

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="game-title-cell">
            <span>${g.name}</span>
            ${hasPersonalOverride ? `<span class="game-note-tag">⭐ Preferred: ${matchedFork ? matchedFork.name : userNote.fork}</span>` : ''}
          </div>
        </td>
        <td>
          <div class="recommended-box">
            <span class="rec-fork-name">${matchedFork ? matchedFork.name : g.recommended}</span>
            <span class="rec-source">${hasPersonalOverride ? 'My Personal Override' : (g.recommended.includes('guide:') ? g.recommended : 'Guide recommendation')}</span>
          </div>
        </td>
        <td>
          <span class="tag-badge ${isInstalled ? 'installed' : 'not-installed'}">
            ${isInstalled ? stateObj[matchedFork.id].tag : (matchedFork ? 'Not installed' : '-')}
          </span>
        </td>
        <td style="color: var(--text-secondary); font-size: 12px;">${g.alternatives || '-'}</td>
        <td>
          <div class="evidence-cell">${g.evidence || '-'}</div>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            ${matchedFork ? `
              <button class="btn btn-launch btn-sm btn-game-launch" title="Launch recommended fork (${matchedFork.name})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span>Launch</span>
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm btn-game-note" title="Record test results and set preferred fork">
              <span>Note</span>
            </button>
          </div>
        </td>
      `;

      const launchBtn = tr.querySelector('.btn-game-launch');
      if (launchBtn && matchedFork) {
        launchBtn.addEventListener('click', () => {
          executeAction({ action: 'Open', fork: matchedFork.id });
        });
      }

      tr.querySelector('.btn-game-note').addEventListener('click', () => {
        openNoteModal(g.name);
      });

      el.gamesTableBody.appendChild(tr);
    });
  }

  // Open Game Note Modal
  function openNoteModal(gameName) {
    currentGameForNote = gameName;
    el.modalNoteTitle.textContent = `Test Results: ${gameName}`;
    el.inputNoteText.value = '';
    el.checkNotePrefer.checked = false;

    // Populate fork dropdown
    el.selectNoteFork.innerHTML = '';
    appState.forks.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      const isInst = appState.state && appState.state[f.id];
      opt.textContent = `${f.name} ${isInst ? `(${appState.state[f.id].tag})` : '(not installed)'}`;
      el.selectNoteFork.appendChild(opt);
    });

    const note = appState.notes ? appState.notes[gameName] : null;
    if (note) {
      if (note.fork) el.selectNoteFork.value = note.fork;
      if (note.history && note.history.length > 0) {
        el.noteHistorySection.style.display = 'block';
        el.noteHistoryList.innerHTML = '';
        note.history.forEach(h => {
          const item = document.createElement('div');
          item.className = 'history-item';
          item.style.fontSize = '12px';
          item.style.padding = '6px 0';
          item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
          item.innerHTML = `<span style="color:var(--text-muted);">${h.date}</span> <strong>${h.fork} (${h.tag})</strong>: <span>${h.note}</span>`;
          el.noteHistoryList.appendChild(item);
        });
      } else {
        el.noteHistorySection.style.display = 'none';
      }
    } else {
      el.noteHistorySection.style.display = 'none';
    }

    el.modalNote.style.display = 'flex';
  }

  function closeNoteModal() {
    el.modalNote.style.display = 'none';
    currentGameForNote = null;
  }

  // Save Game Note
  async function saveGameNote() {
    if (!currentGameForNote) return;
    const forkId = el.selectNoteFork.value;
    const text = el.inputNoteText.value.trim();
    const prefer = el.checkNotePrefer.checked;

    if (!text && !prefer) {
      showToast('Please enter some notes or select preferred override', 'error');
      return;
    }

    try {
      const res = await window.api.saveGameNote({
        game: currentGameForNote,
        forkId,
        text: text || 'Tested',
        prefer
      });
      if (res.success) {
        showToast('Game note saved successfully', 'success');
        appState = res.state;
        renderAll();
        closeNoteModal();
      }
    } catch (e) {
      showToast('Failed to save note: ' + e.message, 'error');
    }
  }

  // Render Custom Added Forks list in Add Tab
  function renderCustomForks() {
    if (!appState || !el.customForksList) return;
    const customIds = appState.customIds || [];
    el.customForksList.innerHTML = '';

    if (customIds.length === 0) {
      el.customForksList.innerHTML = '<div style="color:var(--text-muted); font-size:12.5px;">No custom forks added yet. Paste a link above to add one.</div>';
      return;
    }

    customIds.forEach(id => {
      const f = appState.forks.find(x => x.id === id);
      if (!f) return;
      const item = document.createElement('div');
      item.className = 'custom-fork-item';
      item.innerHTML = `
        <div>
          <div style="font-weight:700;">${f.name}</div>
          <div style="font-size:11.5px; color:var(--text-muted); font-family:var(--font-mono);">${f.repo} (rule: ${f.include || 'auto'})</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm cust-launch">Launch</button>
          <button class="btn btn-danger btn-sm cust-remove">Remove</button>
        </div>
      `;

      item.querySelector('.cust-launch').addEventListener('click', () => executeAction({ action: 'Open', fork: f.id }));
      item.querySelector('.cust-remove').addEventListener('click', () => {
        if (confirm(`Remove custom fork ${f.name} and delete its files?`)) {
          executeAction({ action: 'Remove', fork: f.id });
        }
      });

      el.customForksList.appendChild(item);
    });
  }

  // Handle Add Fork Submission
  async function handleAddFork() {
    const url = el.inputForkUrl.value.trim();
    if (!url) {
      showToast('Please paste a repository or workflow URL', 'error');
      return;
    }

    el.addProgressBox.style.display = 'flex';
    el.addResultBox.style.display = 'none';
    el.btnSubmitAddFork.disabled = true;

    try {
      const res = await executeAction({ action: 'Add', url });
      el.addProgressBox.style.display = 'none';
      el.btnSubmitAddFork.disabled = false;

      if (res && res.success) {
        el.inputForkUrl.value = '';
        el.addResultBox.className = 'add-result-box success';
        el.addResultBox.innerHTML = `
          <strong>Successfully added fork!</strong>
          <p>The manager verified the Windows build pattern and added it to your catalog.</p>
        `;
        el.addResultBox.style.display = 'block';
        showToast('Fork added successfully!', 'success');
      } else {
        el.addResultBox.className = 'add-result-box error';
        el.addResultBox.innerHTML = `<strong>Failed to add fork:</strong> ${res ? (res.error || 'Check logs in terminal') : 'Error'}`;
        el.addResultBox.style.display = 'block';
      }
    } catch (e) {
      el.addProgressBox.style.display = 'none';
      el.btnSubmitAddFork.disabled = false;
      el.addResultBox.className = 'add-result-box error';
      el.addResultBox.textContent = e.message;
      el.addResultBox.style.display = 'block';
    }
  }

  // Render Docs Tab
  function renderDocsNav() {
    if (!appState || !appState.availableDocs) return;
    el.docsNavList.innerHTML = '';
    appState.availableDocs.forEach(d => {
      const btn = document.createElement('button');
      btn.className = `docs-nav-btn ${d.id === activeDocId ? 'active' : ''}`;
      btn.textContent = d.name;
      btn.addEventListener('click', () => loadDoc(d.id));
      el.docsNavList.appendChild(btn);
    });
  }

  async function loadDoc(docId) {
    activeDocId = docId;
    renderDocsNav();
    el.docActiveTitle.textContent = docId.replace(/\.md$/, '').replace(/-/g, ' ');

    try {
      const res = await window.api.getDocContent(docId);
      if (res.success) {
        if (typeof marked !== 'undefined') {
          el.docActiveBody.innerHTML = marked.parse(res.content);
        } else {
          el.docActiveBody.textContent = res.content;
        }
      } else {
        el.docActiveBody.innerHTML = `<div style="color:var(--neon-red);">Document not found or guide not synced yet. Click "Sync Guide" to download documents.</div>`;
      }
    } catch (e) {
      el.docActiveBody.textContent = 'Error loading doc: ' + e.message;
    }
  }

  // Populate Settings Tab
  function populateSettings() {
    if (!appState || !appState.config) return;
    const cfg = appState.config;
    el.settingGpu.value = cfg.gpu || '';
    el.settingInstallDir.value = cfg.install_dir || 'forks';
    el.settingInterval.value = cfg.check_interval_minutes || 60;
    el.settingToken.value = cfg.github_token || '';
  }

  // Save Settings
  async function handleSaveSettings(e) {
    e.preventDefault();
    const gpu = el.settingGpu.value;
    const install_dir = el.settingInstallDir.value.trim() || 'forks';
    const check_interval_minutes = parseInt(el.settingInterval.value, 10) || 60;
    const github_token = el.settingToken.value.trim();

    try {
      const res = await window.api.saveConfig({
        gpu,
        install_dir,
        check_interval_minutes,
        github_token
      });

      if (res.success) {
        showToast('Settings saved successfully', 'success');
        await refreshState();
        checkApiQuota(github_token);
      }
    } catch (err) {
      showToast('Failed to save settings: ' + err.message, 'error');
    }
  }

  // Render everything
  function renderAll() {
    renderForks();
    renderGames();
    renderCustomForks();
    renderDocsNav();
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // View toggle
    el.viewCardsBtn.addEventListener('click', () => {
      viewMode = 'cards';
      el.viewCardsBtn.classList.add('active');
      el.viewTableBtn.classList.remove('active');
      el.forksGrid.style.display = 'grid';
      el.forksTableContainer.style.display = 'none';
    });

    el.viewTableBtn.addEventListener('click', () => {
      viewMode = 'table';
      el.viewTableBtn.classList.add('active');
      el.viewCardsBtn.classList.remove('active');
      el.forksGrid.style.display = 'none';
      el.forksTableContainer.style.display = 'block';
    });

    // Fork Filter Pills
    el.forkFilterPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      forkFilter = pill.dataset.filter;
      renderForks();
    });

    // Search
    el.globalSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      el.searchClear.style.display = searchQuery ? 'block' : 'none';
      renderForks();
      renderGames();
    });

    el.searchClear.addEventListener('click', () => {
      el.globalSearch.value = '';
      searchQuery = '';
      el.searchClear.style.display = 'none';
      renderForks();
      renderGames();
    });

    // Header Quick Actions
    el.btnSyncGuide.addEventListener('click', () => executeAction({ action: 'Sync' }));
    el.btnCheckUpdates.addEventListener('click', () => executeAction({ action: 'Check' }));
    el.btnUpdateAll.addEventListener('click', () => executeAction({ action: 'Update' }));
    el.btnOpenForksDir.addEventListener('click', () => {
      if (appState && appState.installDir) {
        window.api.openExplorer(appState.installDir);
      }
    });

    // Add Fork Button
    el.btnSubmitAddFork.addEventListener('click', handleAddFork);

    // Terminal Drawer Controls
    el.btnToggleTerminal.addEventListener('click', () => {
      el.terminalDrawer.classList.toggle('open');
    });
    el.btnCloseTerminal.addEventListener('click', closeTerminal);
    el.btnClearTerminal.addEventListener('click', () => {
      el.terminalOutput.innerHTML = '<div class="term-line term-dim">Terminal cleared.</div>';
    });
    el.btnCancelAction.addEventListener('click', async () => {
      await window.api.cancelActiveAction();
      logToTerminal('Cancellation requested by user.', true);
    });

    // Modal Game Note
    el.btnCloseModalNote.addEventListener('click', closeNoteModal);
    el.btnCancelNote.addEventListener('click', closeNoteModal);
    el.btnSaveNote.addEventListener('click', saveGameNote);

    // Settings
    el.settingsForm.addEventListener('submit', handleSaveSettings);
    el.btnBrowseFolder.addEventListener('click', async () => {
      const folder = await window.api.selectFolderDialog();
      if (folder) el.settingInstallDir.value = folder;
    });
    el.btnOpenFolderExplorer.addEventListener('click', () => {
      window.api.openExplorer(el.settingInstallDir.value);
    });

    el.btnToggleTokenVis.addEventListener('click', () => {
      if (el.settingToken.type === 'password') {
        el.settingToken.type = 'text';
        el.btnToggleTokenVis.textContent = 'Hide';
      } else {
        el.settingToken.type = 'password';
        el.btnToggleTokenVis.textContent = 'Show';
      }
    });

    el.btnTestToken.addEventListener('click', async () => {
      const token = el.settingToken.value.trim();
      el.tokenTestResult.style.display = 'block';
      el.tokenTestResult.textContent = 'Validating token with GitHub API...';
      el.tokenTestResult.className = 'token-test-result';

      const res = await window.api.checkRateLimit(token);
      if (res.success && res.rate) {
        el.tokenTestResult.className = 'token-test-result success';
        el.tokenTestResult.innerHTML = `<strong>Token valid!</strong> Rate limit is ${res.rate.limit} requests/hr (${res.rate.remaining} remaining).`;
      } else {
        el.tokenTestResult.className = 'token-test-result error';
        el.tokenTestResult.innerHTML = `<strong>Validation failed:</strong> ${res.error || 'Invalid credentials'}`;
      }
    });

    el.apiStatusCard.addEventListener('click', () => checkApiQuota());

    // External link handlers
    el.linkUpstreamRepo.addEventListener('click', (e) => {
      e.preventDefault();
      window.api.openExternal('https://github.com/Schroederr/nx-fork-manager');
    });
    el.linkGuideRepo.addEventListener('click', (e) => {
      e.preventDefault();
      window.api.openExternal('https://github.com/riyadhHDA/wichforks');
    });
    el.btnOpenDocExternal.addEventListener('click', () => {
      window.api.openExternal(`https://github.com/riyadhHDA/wichforks/blob/main/${activeDocId}`);
    });

    // Real-time PowerShell log stream listener
    window.api.onLog(({ text, isError }) => {
      logToTerminal(text, isError);
    });
  }

  // Initialize App
  async function init() {
    setupEventListeners();
    await refreshState();
    checkApiQuota();
  }

  init();
})();
