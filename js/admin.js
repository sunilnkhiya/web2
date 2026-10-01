// ============================================================
// A7 SATTA - Admin Panel Logic
// Database-First, ID-Driven State Management
// ============================================================

// Auth check using Firebase Authentication session with ID token claim verification
function checkAuth(callback) {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.warn('[ADMIN AUTH] Firebase Auth SDK unavailable. Access denied.');
        window.location.href = 'login.html';
        return false;
    }
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('[ADMIN AUTH] Authenticated user email:', user.email);
            console.log('[ADMIN AUTH] Authenticated user UID:', user.uid);
            user.getIdTokenResult(true)
                .then(function(tokenResult) {
                    console.log('[FIREBASE AUTH DEBUG] Force-refreshed ID token result.');
                    console.log('[FIREBASE AUTH DEBUG] currentUser.email =', user.email);
                    console.log('[FIREBASE AUTH DEBUG] tokenResult.claims.admin =', tokenResult.claims.admin);
                    console.log('[FIREBASE AUTH DEBUG] Project ID = web2-ec085');
                    if (tokenResult.claims && tokenResult.claims.admin === true) {
                        console.log('[FIREBASE AUTH DEBUG] SUCCESS: Admin custom claim { admin: true } verified!');
                    } else {
                        console.warn('[FIREBASE AUTH DEBUG] WARNING: Custom claim { admin: true } missing for ' + user.email + '! Database write rules will reject writes until claim is set.');
                    }
                    if (typeof callback === 'function') callback(user, tokenResult);
                })
                .catch(function(err) {
                    console.error('[FIREBASE AUTH DEBUG] Error fetching token result:', err);
                    if (typeof callback === 'function') callback(user, null);
                });
        } else {
            console.warn('[ADMIN AUTH] User is not authenticated. Redirecting to login.');
            window.location.href = 'login.html';
        }
    });
}

function logout() {
    console.log('[ADMIN AUTH] Logging out via Firebase signOut().');
    sessionStorage.clear();
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut()
            .then(function() {
                console.log('[ADMIN AUTH] Firebase signOut successful.');
                window.location.href = 'login.html';
            })
            .catch(function(err) {
                console.error('[ADMIN AUTH] SignOut error:', err);
                window.location.href = 'login.html';
            });
    } else {
        window.location.href = 'login.html';
    }
}

// Toast notification
function showToast(message, type) {
    type = type || 'success';
    let toast = document.getElementById('admin-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'admin-toast';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast-notification ' + type + ' show';
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
}

// Helper: Safely disable element to prevent double action
function setElementLoading(el, isLoading, loadingText) {
    if (!el) return;
    if (isLoading) {
        el.dataset.originalText = el.textContent || el.value || '';
        el.disabled = true;
        el.style.opacity = '0.6';
        el.style.cursor = 'not-allowed';
        if (loadingText) {
            if (el.tagName === 'INPUT') el.value = loadingText;
            else el.textContent = loadingText;
        }
    } else {
        el.disabled = false;
        el.style.opacity = '1.0';
        el.style.cursor = 'pointer';
        if (el.dataset.originalText) {
            if (el.tagName === 'INPUT') el.value = el.dataset.originalText;
            else el.textContent = el.dataset.originalText;
        }
    }
}

// ============================================================
// Settings Security Gate (Protected by Firebase Auth)
// ============================================================

function verifySettingsPasskey() {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        sessionStorage.setItem('a7_settings_unlocked', 'true');
        showToast('Settings Unlocked!', 'success');
        updateSettingsGateState();
    } else {
        showToast('Authentication required!', 'error');
    }
}

function updateSettingsGateState() {
    var lockScreen = document.getElementById('settings-lock-screen');
    var unlockedContent = document.getElementById('settings-unlocked-content');
    if (!lockScreen || !unlockedContent) return;

    var isAuthenticated = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
    if (isAuthenticated) {
        lockScreen.style.display = 'none';
        unlockedContent.style.display = 'block';
    } else {
        lockScreen.style.display = 'block';
        unlockedContent.style.display = 'none';
    }
}

// ============================================================
// Tab System
// ============================================================

function switchTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    
    var tabBtn = document.querySelector('[data-tab="' + tabName + '"]');
    var tabContent = document.getElementById('tab-' + tabName);
    if (tabBtn) tabBtn.classList.add('active');
    if (tabContent) tabContent.classList.add('active');

    if (tabName === 'settings') {
        updateSettingsGateState();
    }
}

// ============================================================
// Inline Cell Editing (Database-First)
// ============================================================

function makeEditable(cell, saveCallback) {
    if (cell.classList.contains('editing')) return;
    
    var currentValue = cell.textContent.trim();
    cell.classList.add('editing');
    
    var input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    let isSaving = false;

    function save() {
        if (isSaving) return;
        var newValue = input.value.trim();
        if (newValue === currentValue) {
            cell.classList.remove('editing');
            cell.textContent = currentValue;
            return;
        }

        isSaving = true;
        input.disabled = true;
        cell.classList.remove('editing');
        cell.textContent = newValue;

        console.log('[RESULT UPDATE] Inline save initiated...');

        if (saveCallback) {
            Promise.resolve(saveCallback(newValue))
                .then(function() {
                    console.log('[RESULT UPDATE] Inline save SUCCESS');
                    cell.classList.add('flash-green');
                    setTimeout(function() { cell.classList.remove('flash-green'); }, 500);
                    showToast('Saved to Database!');
                })
                .catch(function(err) {
                    console.error('[RESULT UPDATE] Inline save FAILED', err);
                    cell.textContent = currentValue; // Revert UI
                    showToast('Failed to save to database!', 'error');
                });
        }
    }

    function cancel() {
        if (isSaving) return;
        cell.classList.remove('editing');
        cell.textContent = currentValue;
    }

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });

    input.addEventListener('blur', function() {
        setTimeout(save, 100);
    });
}

// ============================================================
// Render Primary Games Table (ID-Based Operations)
// ============================================================

function renderAdminPrimaryTable() {
    var container = document.getElementById('admin-primary-table');
    if (!container) return;
    var games = getData('games_primary') || [];

    var html = '<table class="admin-table"><thead><tr>';
    html += '<th>#</th><th>Game Name</th><th>Slug</th><th>Time</th><th>Yesterday</th><th>Today</th><th>Actions</th>';
    html += '</tr></thead><tbody>';

    games.forEach(function(game, i) {
        html += '<tr data-id="' + game.id + '">';
        html += '<td>' + (i + 1) + '</td>';
        html += '<td class="editable-cell" onclick="editPrimaryCell(\'' + game.id + '\',\'name\',this)">' + game.name + '</td>';
        html += '<td class="editable-cell" onclick="editPrimaryCell(\'' + game.id + '\',\'slug\',this)">' + game.slug + '</td>';
        html += '<td class="editable-cell" onclick="editPrimaryCell(\'' + game.id + '\',\'time\',this)">' + game.time + '</td>';
        html += '<td class="editable-cell" onclick="editPrimaryCell(\'' + game.id + '\',\'yesterday\',this)">' + (game.yesterday || '--') + '</td>';
        html += '<td class="editable-cell" onclick="editPrimaryCell(\'' + game.id + '\',\'today\',this)">' + (game.today || '--') + '</td>';
        html += '<td class="row-actions"><button type="button" class="btn-admin btn-danger" onclick="deletePrimaryRow(\'' + game.id + '\', this)">✕ Delete</button></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    html += '<div class="mt-10"><button type="button" class="btn-admin btn-success" onclick="addPrimaryRow(this)">+ Add Game</button></div>';
    container.innerHTML = html;
}

function editPrimaryCell(gameId, field, cell) {
    makeEditable(cell, function(newValue) {
        const list = getData('games_primary') || [];
        const updatedList = list.map(g => g.id === gameId ? Object.assign({}, g, { [field]: newValue }) : g);
        console.log('[RESULT UPDATE] Updating Primary Game ID:', gameId, 'Field:', field);
        return pushToFirebase('games_primary', updatedList)
            .then(function() {
                setData('games_primary', updatedList);
            });
    });
}

function addPrimaryRow(btnEl) {
    setElementLoading(btnEl, true, 'Adding...');
    const newId = generateUniqueId('gm_p');
    const newGame = { id: newId, name: "NEW GAME", slug: "new-game", time: "00:00 PM", yesterday: "--", today: "" };
    const list = getData('games_primary') || [];
    const updatedList = [...list, newGame];

    console.log('[RESULT CREATE] Creating Primary Game ID:', newId);
    pushToFirebase('games_primary', updatedList)
        .then(function() {
            setData('games_primary', updatedList);
            renderAdminPrimaryTable();
            showToast('New game added to database!');
            console.log('[RESULT CREATE] Success for Primary Game ID:', newId);
        })
        .catch(function(err) {
            console.error('[RESULT CREATE] Failed to add game:', err);
            showToast('Database error! Could not add game.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

function deletePrimaryRow(gameId, btnEl) {
    if (!confirm('Are you sure you want to delete this game record?')) return;
    setElementLoading(btnEl, true, 'Deleting...');

    const list = getData('games_primary') || [];
    const updatedList = list.filter(g => g.id !== gameId);

    console.log('[RESULT DELETE] Deleting Primary Game ID:', gameId);
    pushToFirebase('games_primary', updatedList)
        .then(function() {
            setData('games_primary', updatedList);
            renderAdminPrimaryTable();
            showToast('Game deleted from database!', 'error');
            console.log('[RESULT DELETE] Success for Primary Game ID:', gameId);
        })
        .catch(function(err) {
            console.error('[RESULT DELETE] Failed to delete game ID:', gameId, err);
            showToast('Database error! Deletion failed.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

// ============================================================
// Render Secondary Games Table (ID-Based Operations)
// ============================================================

function renderAdminSecondaryTable() {
    var container = document.getElementById('admin-secondary-table');
    if (!container) return;
    var games = getData('games_secondary') || [];

    var html = '<table class="admin-table"><thead><tr>';
    html += '<th>#</th><th>Game Name</th><th>Slug</th><th>Time</th><th>Yesterday</th><th>Today</th><th>Actions</th>';
    html += '</tr></thead><tbody>';

    games.forEach(function(game, i) {
        html += '<tr data-id="' + game.id + '">';
        html += '<td>' + (i + 1) + '</td>';
        html += '<td class="editable-cell" onclick="editSecondaryCell(\'' + game.id + '\',\'name\',this)">' + game.name + '</td>';
        html += '<td class="editable-cell" onclick="editSecondaryCell(\'' + game.id + '\',\'slug\',this)">' + game.slug + '</td>';
        html += '<td class="editable-cell" onclick="editSecondaryCell(\'' + game.id + '\',\'time\',this)">' + game.time + '</td>';
        html += '<td class="editable-cell" onclick="editSecondaryCell(\'' + game.id + '\',\'yesterday\',this)">' + (game.yesterday || '--') + '</td>';
        html += '<td class="editable-cell" onclick="editSecondaryCell(\'' + game.id + '\',\'today\',this)">' + (game.today || '--') + '</td>';
        html += '<td class="row-actions"><button type="button" class="btn-admin btn-danger" onclick="deleteSecondaryRow(\'' + game.id + '\', this)">✕ Delete</button></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    html += '<div class="mt-10"><button type="button" class="btn-admin btn-success" onclick="addSecondaryRow(this)">+ Add Game</button></div>';
    container.innerHTML = html;
}

function editSecondaryCell(gameId, field, cell) {
    makeEditable(cell, function(newValue) {
        const list = getData('games_secondary') || [];
        const updatedList = list.map(g => g.id === gameId ? Object.assign({}, g, { [field]: newValue }) : g);
        console.log('[RESULT UPDATE] Updating Secondary Game ID:', gameId, 'Field:', field);
        return pushToFirebase('games_secondary', updatedList)
            .then(function() {
                setData('games_secondary', updatedList);
            });
    });
}

function addSecondaryRow(btnEl) {
    setElementLoading(btnEl, true, 'Adding...');
    const newId = generateUniqueId('gm_s');
    const newGame = { id: newId, name: "NEW GAME", slug: "new-game", time: "00:00 PM", yesterday: "--", today: "" };
    const list = getData('games_secondary') || [];
    const updatedList = [...list, newGame];

    console.log('[RESULT CREATE] Creating Secondary Game ID:', newId);
    pushToFirebase('games_secondary', updatedList)
        .then(function() {
            setData('games_secondary', updatedList);
            renderAdminSecondaryTable();
            showToast('New secondary game added to database!');
            console.log('[RESULT CREATE] Success for Secondary Game ID:', newId);
        })
        .catch(function(err) {
            console.error('[RESULT CREATE] Failed to add secondary game:', err);
            showToast('Database error! Could not add game.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

function deleteSecondaryRow(gameId, btnEl) {
    if (!confirm('Are you sure you want to delete this game record?')) return;
    setElementLoading(btnEl, true, 'Deleting...');

    const list = getData('games_secondary') || [];
    const updatedList = list.filter(g => g.id !== gameId);

    console.log('[RESULT DELETE] Deleting Secondary Game ID:', gameId);
    pushToFirebase('games_secondary', updatedList)
        .then(function() {
            setData('games_secondary', updatedList);
            renderAdminSecondaryTable();
            showToast('Secondary game deleted from database!', 'error');
            console.log('[RESULT DELETE] Success for Secondary Game ID:', gameId);
        })
        .catch(function(err) {
            console.error('[RESULT DELETE] Failed to delete secondary game ID:', gameId, err);
            showToast('Database error! Deletion failed.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

// ============================================================
// Featured Result
// ============================================================

function renderAdminFeatured() {
    var container = document.getElementById('admin-featured');
    if (!container) return;
    var featured = getData('featured') || DEFAULT_FEATURED;

    var html = '<table class="admin-table"><thead><tr>';
    html += '<th>Game Name</th><th>Slug</th><th>Time</th><th>Previous Result</th><th>Current Result</th>';
    html += '</tr></thead><tbody><tr>';
    html += '<td class="editable-cell" onclick="editFeaturedField(\'name\',this)">' + featured.name + '</td>';
    html += '<td class="editable-cell" onclick="editFeaturedField(\'slug\',this)">' + featured.slug + '</td>';
    html += '<td class="editable-cell" onclick="editFeaturedField(\'time\',this)">' + featured.time + '</td>';
    html += '<td class="editable-cell" onclick="editFeaturedField(\'previous\',this)">' + featured.previous + '</td>';
    html += '<td class="editable-cell" onclick="editFeaturedField(\'current\',this)">' + featured.current + '</td>';
    html += '</tr></tbody></table>';
    container.innerHTML = html;
}

function editFeaturedField(field, cell) {
    makeEditable(cell, function(newValue) {
        var featured = getData('featured') || DEFAULT_FEATURED;
        var updated = Object.assign({}, featured, { [field]: newValue });
        console.log('[RESULT UPDATE] Updating Featured Result Field:', field);
        return pushToFirebase('featured', updated)
            .then(function() {
                setData('featured', updated);
            });
    });
}

// ============================================================
// Chart Tables (ID-Based Operations)
// ============================================================

function getChartKeys(chartIndex) {
    var maps = [
        { header: 'chart1_headers', data: 'chart1_data', prefix: 'c1' },
        { header: 'chart2_headers', data: 'chart2_data', prefix: 'c2' },
        { header: 'chart3_headers', data: 'chart3_data', prefix: 'c3' },
        { header: 'fullchart_headers', data: 'fullchart_data', prefix: 'fc' },
        { header: 'prev_fullchart_headers', data: 'prev_fullchart_data', prefix: 'pfc' }
    ];
    return maps[chartIndex];
}

function getChartContainerId(chartIndex) {
    var ids = ['admin-chart1', 'admin-chart2', 'admin-chart3', 'admin-fullchart', 'admin-prev-fullchart'];
    return ids[chartIndex];
}

function renderAdminChart(containerId, headerKey, dataKey, chartIndex) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var headers = getData(headerKey) || [];
    var data = getData(dataKey) || [];

    var colCount = headers.length;

    var html = '<div class="table-scroll"><table class="admin-table chart-editor-table" id="chart-table-' + chartIndex + '">';

    // === HEADER ROW ===
    html += '<thead><tr>';
    html += '<th class="chart-select-col"><input type="checkbox" class="chart-select-all" id="sel-all-' + chartIndex + '" onchange="toggleSelectAllChartRows(' + chartIndex + ',this)" title="Select all rows"></th>';
    html += '<th class="chart-date-col">दिनांक</th>';
    headers.forEach(function(h, hi) {
        html += '<th style="min-width:90px;position:relative;">';
        html += '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">';
        html += '<span class="editable-cell chart-header-cell" onclick="editChartHeader(' + chartIndex + ',' + hi + ',this)" title="Click to rename">' + h + '</span>';
        html += '<button type="button" class="btn-admin btn-danger btn-xs col-del-btn" onclick="deleteChartColumn(' + chartIndex + ',' + hi + ', this)" title="Delete column ✕" style="padding:1px 7px;font-size:10px;margin-top:2px;">✕ Col</button>';
        html += '</div></th>';
    });
    html += '<th class="row-actions-col">Row Actions</th>';
    html += '</tr></thead>';

    // === DATA ROWS ===
    html += '<tbody>';
    data.forEach(function(row, ri) {
        var rowId = row.id || ('row_' + ri);
        html += '<tr class="chart-row" data-id="' + rowId + '" data-row="' + ri + '">';
        html += '<td class="chart-select-cell"><input type="checkbox" class="chart-row-check" data-chart="' + chartIndex + '" data-id="' + rowId + '" data-row="' + ri + '" onchange="onChartRowCheckChange(' + chartIndex + ')"></td>';
        html += '<td class="editable-cell forfirtcolor chart-date-cell" onclick="editChartDate(' + chartIndex + ',\'' + rowId + '\',this)" title="Click to edit date">' + row.date + '</td>';
        for (var vi = 0; vi < colCount; vi++) {
            var val = (row.values && row.values[vi] !== undefined) ? row.values[vi] : '-';
            html += '<td class="editable-cell chart-value-cell" onclick="editChartValue(' + chartIndex + ',\'' + rowId + '\',' + vi + ',this)" title="Click to edit">' + val + '</td>';
        }
        html += '<td class="row-actions"><button type="button" class="btn-admin btn-danger btn-xs" onclick="deleteChartRow(' + chartIndex + ',\'' + rowId + '\', this)" title="Delete row">✕ Row</button></td>';
        html += '</tr>';
    });
    html += '</tbody>';

    // === FOOTER ===
    html += '<tfoot><tr>';
    html += '<td colspan="' + (colCount + 3) + '" style="text-align:left;padding:8px 6px;background:#f8fafc;">';
    html += '<button type="button" class="btn-admin btn-success" onclick="addChartRow(' + chartIndex + ', this)" style="margin-right:8px;">＋ Add Row</button>';
    html += '<button type="button" class="btn-admin btn-info" onclick="addChartColumnInline(' + chartIndex + ', this)" style="margin-right:8px;">＋ Add Column</button>';
    html += '<button type="button" class="btn-admin btn-danger chart-bulk-del-btn" id="bulk-del-' + chartIndex + '" onclick="deleteSelectedChartRows(' + chartIndex + ', this)" style="display:none;">🗑 Delete Selected</button>';
    html += '</td></tr></tfoot>';

    html += '</table></div>';
    container.innerHTML = html;
}

function toggleSelectAllChartRows(chartIndex, masterCb) {
    var checks = document.querySelectorAll('.chart-row-check[data-chart="' + chartIndex + '"]');
    checks.forEach(function(cb) {
        cb.checked = masterCb.checked;
        var row = cb.closest('tr');
        if (row) row.classList.toggle('chart-row-selected', masterCb.checked);
    });
    onChartRowCheckChange(chartIndex);
}

function onChartRowCheckChange(chartIndex) {
    var checks = document.querySelectorAll('.chart-row-check[data-chart="' + chartIndex + '"]');
    var selected = 0;
    checks.forEach(function(cb) {
        var row = cb.closest('tr');
        if (cb.checked) {
            selected++;
            if (row) row.classList.add('chart-row-selected');
        } else {
            if (row) row.classList.remove('chart-row-selected');
        }
    });
    var bulkBtn = document.getElementById('bulk-del-' + chartIndex);
    if (bulkBtn) {
        bulkBtn.style.display = selected > 0 ? 'inline-block' : 'none';
        bulkBtn.textContent = '🗑 Delete Selected (' + selected + ')';
    }
    var selAll = document.getElementById('sel-all-' + chartIndex);
    if (selAll) {
        selAll.checked = selected === checks.length && checks.length > 0;
        selAll.indeterminate = selected > 0 && selected < checks.length;
    }
}

function deleteSelectedChartRows(chartIndex, btnEl) {
    var checks = document.querySelectorAll('.chart-row-check[data-chart="' + chartIndex + '"]:checked');
    if (checks.length === 0) return;
    if (!confirm('Delete ' + checks.length + ' selected row(s)?')) return;

    setElementLoading(btnEl, true, 'Deleting...');
    var keys = getChartKeys(chartIndex);
    var data = getData(keys.data) || [];

    var selectedIds = new Set();
    checks.forEach(cb => selectedIds.add(cb.getAttribute('data-id')));

    var updatedList = data.filter(row => !selectedIds.has(row.id));

    console.log('[RESULT DELETE] Bulk deleting chart rows from:', keys.data);
    pushToFirebase(keys.data, updatedList)
        .then(function() {
            setData(keys.data, updatedList);
            renderAdminChart(getChartContainerId(chartIndex), keys.header, keys.data, chartIndex);
            showToast(checks.length + ' row(s) deleted from database!', 'error');
            console.log('[RESULT DELETE] Success for bulk delete in chart index:', chartIndex);
        })
        .catch(function(err) {
            console.error('[RESULT DELETE] Bulk delete failed:', err);
            showToast('Database error! Bulk deletion failed.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

function editChartHeader(chartIndex, headerIndex, cell) {
    var keys = getChartKeys(chartIndex);
    makeEditable(cell, function(newValue) {
        var headers = getData(keys.header) || [];
        headers[headerIndex] = newValue;
        console.log('[RESULT UPDATE] Updating chart header index:', headerIndex, 'New Value:', newValue);
        return pushToFirebase(keys.header, headers)
            .then(function() {
                setData(keys.header, headers);
            });
    });
}

function editChartDate(chartIndex, rowId, cell) {
    var keys = getChartKeys(chartIndex);
    makeEditable(cell, function(newValue) {
        var data = getData(keys.data) || [];
        var updated = data.map(r => r.id === rowId ? Object.assign({}, r, { date: newValue }) : r);
        console.log('[RESULT UPDATE] Updating chart row date ID:', rowId, 'New Date:', newValue);
        return pushToFirebase(keys.data, updated)
            .then(function() {
                setData(keys.data, updated);
            });
    });
}

function editChartValue(chartIndex, rowId, valueIndex, cell) {
    var keys = getChartKeys(chartIndex);
    makeEditable(cell, function(newValue) {
        var data = getData(keys.data) || [];
        var updated = data.map(r => {
            if (r.id === rowId) {
                var vals = [...(r.values || [])];
                vals[valueIndex] = newValue;
                return Object.assign({}, r, { values: vals });
            }
            return r;
        });
        console.log('[RESULT UPDATE] Updating chart row value ID:', rowId, 'Index:', valueIndex, 'Value:', newValue);
        return pushToFirebase(keys.data, updated)
            .then(function() {
                setData(keys.data, updated);
            });
    });
}

function addChartRow(chartIndex, btnEl) {
    setElementLoading(btnEl, true, 'Adding...');
    var keys = getChartKeys(chartIndex);
    var headers = getData(keys.header) || [];
    var data = getData(keys.data) || [];
    var emptyValues = headers.map(function() { return '-'; });
    var newId = generateUniqueId(keys.prefix + '_r');
    var updated = [...data, { id: newId, date: 'NEW', values: emptyValues }];

    console.log('[RESULT CREATE] Adding chart row ID:', newId, 'to:', keys.data);
    pushToFirebase(keys.data, updated)
        .then(function() {
            setData(keys.data, updated);
            renderAdminChart(getChartContainerId(chartIndex), keys.header, keys.data, chartIndex);
            showToast('New chart row added to database!');
            console.log('[RESULT CREATE] Success for chart row ID:', newId);
        })
        .catch(function(err) {
            console.error('[RESULT CREATE] Add chart row failed:', err);
            showToast('Database error! Failed to add row.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

function deleteChartRow(chartIndex, rowId, btnEl) {
    if (!confirm('Are you sure you want to delete this chart row?')) return;
    setElementLoading(btnEl, true, 'Deleting...');

    var keys = getChartKeys(chartIndex);
    var data = getData(keys.data) || [];
    var updated = data.filter(r => r.id !== rowId);

    console.log('[RESULT DELETE] Deleting chart row ID:', rowId, 'from:', keys.data);
    pushToFirebase(keys.data, updated)
        .then(function() {
            setData(keys.data, updated);
            renderAdminChart(getChartContainerId(chartIndex), keys.header, keys.data, chartIndex);
            showToast('Chart row deleted from database!', 'error');
            console.log('[RESULT DELETE] Success for chart row ID:', rowId);
        })
        .catch(function(err) {
            console.error('[RESULT DELETE] Delete chart row failed:', err);
            showToast('Database error! Deletion failed.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

function addChartColumnInline(chartIndex, btnEl) {
    var name = prompt('Enter new column (game) name:');
    if (!name || !name.trim()) return;

    setElementLoading(btnEl, true, 'Adding Col...');
    var keys = getChartKeys(chartIndex);
    var headers = [...(getData(keys.header) || [])];
    var data = [...(getData(keys.data) || [])];

    headers.push(name.trim());
    var updatedData = data.map(row => {
        var vals = [...(row.values || [])];
        vals.push('-');
        return Object.assign({}, row, { values: vals });
    });

    console.log('[RESULT CREATE] Adding column:', name.trim(), 'to chart:', chartIndex);
    Promise.all([
        pushToFirebase(keys.header, headers),
        pushToFirebase(keys.data, updatedData)
    ])
    .then(function() {
        setData(keys.header, headers);
        setData(keys.data, updatedData);
        renderAdminChart(getChartContainerId(chartIndex), keys.header, keys.data, chartIndex);
        showToast('Column "' + name.trim() + '" added to database!');
        console.log('[RESULT CREATE] Column added successfully');
    })
    .catch(function(err) {
        console.error('[RESULT CREATE] Failed to add column:', err);
        showToast('Database error! Failed to add column.', 'error');
    })
    .finally(function() {
        setElementLoading(btnEl, false);
    });
}

function deleteChartColumn(chartIndex, colIndex, btnEl) {
    var keys = getChartKeys(chartIndex);
    var headers = getData(keys.header) || [];
    var colName = headers[colIndex] || ('Column ' + (colIndex + 1));
    if (!confirm('Delete column "' + colName + '"? This will remove all values in this column.')) return;

    setElementLoading(btnEl, true, 'Deleting Col...');
    var updatedHeaders = headers.filter((_, idx) => idx !== colIndex);
    var data = getData(keys.data) || [];

    var updatedData = data.map(row => {
        var vals = (row.values || []).filter((_, idx) => idx !== colIndex);
        return Object.assign({}, row, { values: vals });
    });

    console.log('[RESULT DELETE] Deleting column index:', colIndex, 'Name:', colName);
    Promise.all([
        pushToFirebase(keys.header, updatedHeaders),
        pushToFirebase(keys.data, updatedData)
    ])
    .then(function() {
        setData(keys.header, updatedHeaders);
        setData(keys.data, updatedData);
        renderAdminChart(getChartContainerId(chartIndex), keys.header, keys.data, chartIndex);
        showToast('Column "' + colName + '" deleted from database!', 'error');
        console.log('[RESULT DELETE] Column deleted successfully');
    })
    .catch(function(err) {
        console.error('[RESULT DELETE] Failed to delete column:', err);
        showToast('Database error! Failed to delete column.', 'error');
    })
    .finally(function() {
        setElementLoading(btnEl, false);
    });
}

// --- Top Game Display Names Editor ---

function renderAdminTopGameNames() {
    var container = document.getElementById('admin-top-game-names');
    if (!container) return;

    var primary = getData('games_primary') || [];
    var html = '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:20px;">';
    html += '<p style="color:#64748b;font-size:13px;margin-bottom:15px;">Update the displayed title for each game in the top homepage table. Result numbers, timings, and internal IDs remain 100% unchanged.</p>';

    html += '<div class="table-scroll"><table class="admin-table">';
    html += '<thead><tr><th style="width:50px;">#</th><th style="width:140px;">Internal ID</th><th>Displayed Game Name (दृश्य नाम)</th><th style="width:120px;">Scheduled Time</th></tr></thead>';
    html += '<tbody>';

    primary.forEach(function(g, idx) {
        html += '<tr>';
        html += '<td>' + (idx + 1) + '</td>';
        html += '<td style="color:#64748b;font-family:monospace;font-size:12px;">' + (g.id || g.slug || '-') + '</td>';
        html += '<td><input class="admin-input" id="top-game-name-' + idx + '" value="' + (g.name || '') + '" placeholder="Enter Game Display Name"></td>';
        html += '<td style="color:#64748b;font-size:12px;">' + (g.time || '-') + '</td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div style="margin-top:20px;text-align:right;">';
    html += '<button type="button" class="btn-admin" onclick="saveAdminTopGameNames(this)" style="padding:12px 35px;font-size:15px;font-weight:900;">💾 Save & Update Top Game Names</button>';
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;
}

function saveAdminTopGameNames(btnEl) {
    var primary = getData('games_primary') || [];
    var updatedPrimary = primary.map(function(g, idx) {
        var inputEl = document.getElementById('top-game-name-' + idx);
        var newName = inputEl ? inputEl.value.trim() : g.name;
        return Object.assign({}, g, { name: newName || g.name });
    });

    setElementLoading(btnEl, true, 'Saving...');

    pushToFirebase('games_primary', updatedPrimary)
        .then(function() {
            setData('games_primary', updatedPrimary);
            showToast('Top Game Names updated successfully!');
            renderAdminTopGameNames();
            renderAdminPrimaryResults();
        })
        .catch(function(err) {
            console.error('[TOP GAME NAMES] Save failed:', err);
            showToast('Database error! Update failed.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

// --- Marquee Editor ---

function renderAdminMarquee() {
    var container = document.getElementById('admin-marquee');
    if (!container) return;
    var marquee = getData('marquee');

    var html = '<textarea class="admin-textarea" id="marquee-input">' + (marquee || '') + '</textarea>';
    html += '<div class="mt-10"><button type="button" class="btn-admin" onclick="saveMarquee(this)">💾 Save Marquee</button></div>';
    container.innerHTML = html;
}

function saveMarquee(btnEl) {
    var val = document.getElementById('marquee-input').value;
    setElementLoading(btnEl, true, 'Saving...');
    console.log('[RESULT UPDATE] Saving Marquee text...');
    pushToFirebase('marquee', val)
        .then(function() {
            setData('marquee', val);
            showToast('Marquee saved to database!');
        })
        .catch(function(err) {
            console.error('[RESULT UPDATE] Marquee save failed:', err);
            showToast('Database error! Could not save marquee.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

// --- Hindi Text Editor ---

function renderAdminHindiText() {
    var container = document.getElementById('admin-hindi');
    if (!container) return;
    var text = getData('hindi_text');

    var html = '<input class="admin-input" id="hindi-input" value="' + (text || '') + '">';
    html += '<div class="mt-10"><button type="button" class="btn-admin" onclick="saveHindiText(this)">💾 Save</button></div>';
    container.innerHTML = html;
}

function saveHindiText(btnEl) {
    var val = document.getElementById('hindi-input').value;
    setElementLoading(btnEl, true, 'Saving...');
    console.log('[RESULT UPDATE] Saving Hindi announcement text...');
    pushToFirebase('hindi_text', val)
        .then(function() {
            setData('hindi_text', val);
            showToast('Hindi text saved to database!');
        })
        .catch(function(err) {
            console.error('[RESULT UPDATE] Hindi text save failed:', err);
            showToast('Database error! Could not save hindi text.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

// --- Ad Content Editor (Easy Schedule Form & Raw HTML Dual Mode) ---

var currentAdEditorTab = 'easy';

function switchAdEditorTab(mode) {
    currentAdEditorTab = mode;
    renderAdminAdContent();
}

function renderAdminAdContent() {
    var container = document.getElementById('admin-ad');
    if (!container) return;

    var schedule = getData('ad_schedule') || (typeof DEFAULT_AD_SCHEDULE !== 'undefined' ? DEFAULT_AD_SCHEDULE : {});
    var rawContent = getData('ad_content') || '';

    var html = '<div style="margin-bottom:15px;display:flex;gap:10px;">';
    html += '<button type="button" class="btn-admin ' + (currentAdEditorTab === 'easy' ? 'btn-success' : 'btn-info') + '" onclick="switchAdEditorTab(\'easy\')" style="padding:10px 20px;font-size:13px;font-weight:700;">📋 Easy Schedule Editor (Name & Time)</button>';
    html += '<button type="button" class="btn-admin ' + (currentAdEditorTab === 'raw' ? 'btn-success' : 'btn-info') + '" onclick="switchAdEditorTab(\'raw\')" style="padding:10px 20px;font-size:13px;font-weight:700;">💻 Raw HTML Editor</button>';
    html += '</div>';

    if (currentAdEditorTab === 'easy') {
        html += '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:20px;">';
        
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">';
        html += '<div><label style="color:#0f172a;font-weight:700;margin-bottom:5px;display:block;">Top Header Line</label>';
        html += '<input class="admin-input" id="ad-top-header" value="' + (schedule.topHeader || '') + '" placeholder="e.g. --सीधे सट्टा कंपनी का No 1 खाईवाल--"></div>';
        html += '<div><label style="color:#0f172a;font-weight:700;margin-bottom:5px;display:block;">Khaiwal Subtitle / Name</label>';
        html += '<input class="admin-input" id="ad-khaiwal-name" value="' + (schedule.khaiwalName || '') + '" placeholder="e.g. KHAIWAL NAME"></div>';
        html += '</div>';

        html += '<div style="margin-bottom:20px;">';
        html += '<div style="display:flex;justify-space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:10px;">';
        html += '<label style="color:#0f172a;font-weight:900;font-size:15px;margin:0;">⏰ Game Timings Schedule List</label>';
        html += '<div><button type="button" class="btn-admin btn-info" onclick="syncAdScheduleFromPrimaryGames(this)">🔄 Import Games from Primary Results Table</button> ';
        html += '<button type="button" class="btn-admin btn-success" onclick="addAdScheduleRow()">➕ Add Timing Row</button></div>';
        html += '</div>';

        html += '<div class="table-scroll"><table class="admin-table">';
        html += '<thead><tr><th style="width:50px;">#</th><th style="width:60px;">Icon</th><th>Game Name (गेम का नाम)</th><th>Scheduled Time (समय)</th><th style="width:80px;">Action</th></tr></thead>';
        html += '<tbody>';

        var items = schedule.items || [];
        if (items.length === 0) {
            html += '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:20px;">No timing rows added yet. Click "+ Add Timing Row" above.</td></tr>';
        } else {
            items.forEach(function(item, idx) {
                html += '<tr>';
                html += '<td>' + (idx + 1) + '</td>';
                html += '<td style="font-size:22px;">⏰</td>';
                html += '<td><input class="admin-input" id="ad-item-name-' + idx + '" value="' + (item.name || '') + '" placeholder="e.g. कानपुर डे"></td>';
                html += '<td><input class="admin-input" id="ad-item-time-' + idx + '" value="' + (item.time || '') + '" placeholder="e.g. 12:30 Pm"></td>';
                html += '<td><button type="button" class="btn-admin btn-danger" onclick="deleteAdScheduleRow(' + idx + ')">❌</button></td>';
                html += '</tr>';
            });
        }
        html += '</tbody></table></div>';
        html += '</div>';

        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">';
        html += '<div><label style="color:#0f172a;font-weight:700;margin-bottom:5px;display:block;">Jodi Rate (जोड़ी रेट)</label>';
        html += '<input class="admin-input" id="ad-jodi-rate" value="' + (schedule.jodiRate || '') + '" placeholder="e.g. जोड़ी रेट 10-------960"></div>';
        html += '<div><label style="color:#0f172a;font-weight:700;margin-bottom:5px;display:block;">Haruf Rate (हरूफ रेट)</label>';
        html += '<input class="admin-input" id="ad-haruf-rate" value="' + (schedule.harufRate || '') + '" placeholder="e.g. हरूफ रेट 100-----960"></div>';
        html += '</div>';

        html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:15px;">';
        html += '<div><label style="color:#0f172a;font-weight:700;margin-bottom:5px;display:block;">WhatsApp Button Text</label>';
        html += '<input class="admin-input" id="ad-link-text" value="' + (schedule.linkText || '') + '" placeholder="e.g. Game play करने के लिये नीचे लिंक पर क्लिक करे"></div>';
        html += '<div><label style="color:#0f172a;font-weight:700;margin-bottom:5px;display:block;">WhatsApp Mobile Number</label>';
        html += '<input class="admin-input" id="ad-whatsapp-phone" value="' + (schedule.whatsappPhone || '917027405875') + '" placeholder="e.g. 917027405875"></div>';
        html += '<div><label style="color:#0f172a;font-weight:700;margin-bottom:5px;display:block;">WhatsApp Redirect Link</label>';
        html += '<input class="admin-input" id="ad-whatsapp-url" value="' + (schedule.whatsappUrl || 'https://wa.me/message/WTOZYC4GBMWNC1') + '" placeholder="https://wa.me/message/WTOZYC4GBMWNC1"></div>';
        html += '</div>';

        html += '<div style="margin-top:20px;text-align:right;">';
        html += '<button type="button" class="btn-admin" onclick="saveAdScheduleForm(this)" style="padding:12px 35px;font-size:15px;font-weight:900;">💾 Save & Update Homepage Advertisement</button>';
        html += '</div>';

        html += '</div>';
    } else {
        html += '<textarea class="admin-textarea" id="ad-input" style="min-height:350px;">' + (rawContent || '') + '</textarea>';
        html += '<div class="mt-10"><button type="button" class="btn-admin" onclick="saveAdContent(this)" style="padding:10px 25px;font-size:14px;">💾 Save Raw HTML</button></div>';
        html += '<p style="color:#64748b;font-size:12px;margin-top:5px;">Advanced Mode: Supports custom HTML tags</p>';
    }

    container.innerHTML = html;
}

function addAdScheduleRow() {
    var schedule = getData('ad_schedule') || (typeof DEFAULT_AD_SCHEDULE !== 'undefined' ? DEFAULT_AD_SCHEDULE : { items: [] });
    if (!schedule.items) schedule.items = [];
    schedule.items.push({ id: generateUniqueId('ad'), name: '', time: '' });
    setData('ad_schedule', schedule);
    renderAdminAdContent();
}

function deleteAdScheduleRow(index) {
    var schedule = getData('ad_schedule') || { items: [] };
    if (schedule.items && schedule.items[index] !== undefined) {
        schedule.items.splice(index, 1);
        setData('ad_schedule', schedule);
        renderAdminAdContent();
    }
}

function syncAdScheduleFromPrimaryGames(btnEl) {
    var primary = getData('games_primary') || [];
    var schedule = getData('ad_schedule') || { items: [] };
    schedule.items = primary.map(function(g) {
        return { id: generateUniqueId('ad'), name: g.name, time: g.time };
    });

    setElementLoading(btnEl, true, 'Importing...');
    var compiledHtml = (typeof compileAdContentFromSchedule === 'function') ? compileAdContentFromSchedule(schedule) : '';

    Promise.all([
        pushToFirebase('ad_schedule', schedule),
        pushToFirebase('ad_content', compiledHtml)
    ])
    .then(function() {
        setData('ad_schedule', schedule);
        setData('ad_content', compiledHtml);
        renderAdminAdContent();
        showToast('Imported ' + primary.length + ' games into advertisement schedule!');
    })
    .catch(function(err) {
        console.error('[RESULT UPDATE] Sync ad schedule failed:', err);
        showToast('Database error! Import failed.', 'error');
    })
    .finally(function() {
        setElementLoading(btnEl, false);
    });
}

function saveAdScheduleForm(btnEl) {
    setElementLoading(btnEl, true, 'Saving...');
    var schedule = getData('ad_schedule') || {};
    schedule.topHeader = document.getElementById('ad-top-header').value.trim();
    schedule.khaiwalName = document.getElementById('ad-khaiwal-name').value.trim();
    schedule.jodiRate = document.getElementById('ad-jodi-rate').value.trim();
    schedule.harufRate = document.getElementById('ad-haruf-rate').value.trim();
    schedule.linkText = document.getElementById('ad-link-text').value.trim();
    schedule.whatsappPhone = document.getElementById('ad-whatsapp-phone').value.trim();
    if (document.getElementById('ad-whatsapp-url')) {
        schedule.whatsappUrl = document.getElementById('ad-whatsapp-url').value.trim();
    }

    var items = [];
    var i = 0;
    while (document.getElementById('ad-item-name-' + i)) {
        var nameVal = document.getElementById('ad-item-name-' + i).value.trim();
        var timeVal = document.getElementById('ad-item-time-' + i).value.trim();
        if (nameVal !== '') {
            items.push({ id: generateUniqueId('ad'), name: nameVal, time: timeVal });
        }
        i++;
    }
    schedule.items = items;

    var compiledHtml = (typeof compileAdContentFromSchedule === 'function')
        ? compileAdContentFromSchedule(schedule)
        : '';

    console.log('[RESULT UPDATE] Saving Advertisement schedule to database...');
    Promise.all([
        pushToFirebase('ad_schedule', schedule),
        pushToFirebase('ad_content', compiledHtml)
    ])
    .then(function() {
        setData('ad_schedule', schedule);
        setData('ad_content', compiledHtml);
        showToast('Advertisement schedule saved to database!');
    })
    .catch(function(err) {
        console.error('[RESULT UPDATE] Ad schedule save failed:', err);
        showToast('Database error! Failed to save ad schedule.', 'error');
    })
    .finally(function() {
        setElementLoading(btnEl, false);
    });
}

function saveAdContent(btnEl) {
    var val = document.getElementById('ad-input').value;
    setElementLoading(btnEl, true, 'Saving...');
    console.log('[RESULT UPDATE] Saving Raw HTML advertisement...');
    pushToFirebase('ad_content', val)
        .then(function() {
            setData('ad_content', val);
            showToast('Advertisement raw HTML saved to database!');
        })
        .catch(function(err) {
            console.error('[RESULT UPDATE] Save raw ad HTML failed:', err);
            showToast('Database error! Failed to save HTML.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

// --- Disclaimer Editor ---

function renderAdminDisclaimer() {
    var container = document.getElementById('admin-disclaimer');
    if (!container) return;
    var text = getData('disclaimer');

    var html = '<textarea class="admin-textarea" id="disclaimer-input">' + (text || '') + '</textarea>';
    html += '<div class="mt-10"><button type="button" class="btn-admin" onclick="saveDisclaimer(this)">💾 Save Disclaimer</button></div>';
    container.innerHTML = html;
}

function saveDisclaimer(btnEl) {
    var val = document.getElementById('disclaimer-input').value;
    setElementLoading(btnEl, true, 'Saving...');
    console.log('[RESULT UPDATE] Saving Disclaimer...');
    pushToFirebase('disclaimer', val)
        .then(function() {
            setData('disclaimer', val);
            showToast('Disclaimer saved to database!');
        })
        .catch(function(err) {
            console.error('[RESULT UPDATE] Disclaimer save failed:', err);
            showToast('Database error! Failed to save disclaimer.', 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

// --- Credentials Editor ---

// --- Credentials Status Box ---

function renderAdminCredentials() {
    var container = document.getElementById('admin-credentials');
    if (!container) return;
    var user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;

    if (!user) {
        container.innerHTML = '<div style="max-width:500px;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;color:#f87171;">No active Firebase Auth session detected.</div>';
        return;
    }

    user.getIdTokenResult(true)
        .then(function(tokenResult) {
            var isAdminClaim = tokenResult.claims && tokenResult.claims.admin === true;
            var html = '<div style="max-width:600px;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;color:#fff;">';
            html += '<h4 style="color:#ffd800;margin-top:0;font-weight:800;">🔐 Firebase Authentication & Admin Claim Verification</h4>';
            html += '<p style="margin:6px 0;"><strong>Active Admin Email:</strong> <span style="color:#4ade80;">' + user.email + '</span></p>';
            html += '<p style="margin:6px 0;"><strong>UID:</strong> <code style="color:#94a3b8;">' + user.uid + '</code></p>';
            html += '<p style="margin:6px 0;"><strong>Firebase Project ID:</strong> <span style="color:#60a5fa;">web2-ec085</span></p>';
            html += '<p style="margin:6px 0;"><strong>tokenResult.claims.admin:</strong> <span style="font-weight:bold;color:' + (isAdminClaim ? '#4ade80' : '#f87171') + ';">' + (isAdminClaim ? 'true (VERIFIED)' : 'undefined / false (MISSING)') + '</span></p>';

            if (!isAdminClaim) {
                html += '<div style="margin-top:12px;background:#451a03;border:1px solid #9a3412;border-radius:8px;padding:12px;font-size:12px;color:#ffedd5;">';
                html += '⚠️ <strong>Action Required:</strong> The <code>{ admin: true }</code> custom claim is missing for <strong>' + user.email + '</strong>.<br>';
                html += 'Run this command in your project terminal:<br>';
                html += '<code style="background:#27272a;padding:3px 8px;border-radius:4px;display:inline-block;margin-top:5px;color:#fde047;">node scripts/set-admin-claim.js ' + user.email + '</code><br>';
                html += 'Then click <strong>Refresh Auth Token</strong> below.';
                html += '</div>';
            }

            html += '<div style="margin-top:15px;display:flex;gap:10px;">';
            html += '<button type="button" class="btn-admin btn-info" onclick="refreshAdminToken(this)">🔄 Force-Refresh Auth Token</button>';
            html += '<button type="button" class="btn-admin btn-danger" onclick="logout()">Sign Out</button>';
            html += '</div>';
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(function(err) {
            console.error('[ADMIN AUTH] getIdTokenResult error:', err);
            container.innerHTML = '<div style="color:#f87171;">Error verifying token claims: ' + err.message + '</div>';
        });
}

function refreshAdminToken(btnEl) {
    var user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (!user) {
        showToast('No active user logged in!', 'error');
        return;
    }
    setElementLoading(btnEl, true, 'Refreshing...');
    user.getIdTokenResult(true)
        .then(function(tokenResult) {
            console.log('[FIREBASE AUTH DEBUG] Token force-refreshed.');
            console.log('[FIREBASE AUTH DEBUG] currentUser.email =', user.email);
            console.log('[FIREBASE AUTH DEBUG] tokenResult.claims.admin =', tokenResult.claims.admin);
            if (tokenResult.claims && tokenResult.claims.admin === true) {
                showToast('Success! Custom claim { admin: true } is active.', 'success');
            } else {
                showToast('Warning: { admin: true } claim is missing for ' + user.email, 'error');
            }
            renderAdminCredentials();
        })
        .catch(function(err) {
            console.error('[FIREBASE AUTH DEBUG] Refresh error:', err);
            showToast('Token refresh failed: ' + err.message, 'error');
        })
        .finally(function() {
            setElementLoading(btnEl, false);
        });
}

// --- Firebase Config Editor ---

function renderAdminFirebase() {
    var container = document.getElementById('admin-firebase');
    if (!container) return;
    var config = typeof getFirebaseConfig === 'function' ? getFirebaseConfig() : {};

    var html = '<div style="max-width:600px;">';
    html += '<label style="color:#0f172a;font-weight:700;margin-bottom:5px;display:block;">API Key</label>';
    html += '<input class="admin-input" id="fb-api-key" value="' + (config.apiKey || '') + '" placeholder="AIzaSy..." style="margin-bottom:10px;">';
    html += '<label style="color:#0f172a;font-weight:700;margin-bottom:5px;display:block;">Database URL</label>';
    html += '<input class="admin-input" id="fb-db-url" value="' + (config.databaseURL || '') + '" placeholder="https://your-new-app-rtdb.firebaseio.com" style="margin-bottom:10px;">';
    html += '<label style="color:#0f172a;font-weight:700;margin-bottom:5px;display:block;">Project ID</label>';
    html += '<input class="admin-input" id="fb-project-id" value="' + (config.projectId || '') + '" placeholder="your-new-project-id" style="margin-bottom:15px;">';
    html += '<button type="button" class="btn-admin" onclick="saveFirebaseConfigHandler(this)">🔥 Save & Connect Firebase Database</button>';
    html += '<div style="margin-top:20px;padding-top:15px;border-top:1px dashed #cbd5e1;">';
    html += '<h4 style="color:#0f172a;font-weight:800;margin-top:0;">🚀 One-Time Database Initialization</h4>';
    html += '<p style="color:#64748b;font-size:13px;margin-bottom:10px;">Safely populates empty Firebase Realtime Database (web2-ec085) with Web1 default website data. Existing database keys are NEVER overwritten.</p>';
    html += '<button type="button" class="btn-admin btn-info" onclick="initWeb1FirebaseDatabase(this)">⚡ Initialize Empty Database Keys</button>';
    html += '</div>';
    html += '</div>';
    container.innerHTML = html;
}

function saveFirebaseConfigHandler(btnEl) {
    var apiKey = document.getElementById('fb-api-key').value.trim();
    var databaseURL = document.getElementById('fb-db-url').value.trim();
    var projectId = document.getElementById('fb-project-id').value.trim();

    if (projectId.includes('old') || databaseURL.includes('old')) {
        showToast('Error: Cannot use old website database URL or project ID!', 'error');
        return;
    }

    setElementLoading(btnEl, true, 'Connecting...');
    var config = {
        apiKey: apiKey,
        databaseURL: databaseURL,
        projectId: projectId,
        authDomain: projectId ? projectId + '.firebaseapp.com' : '',
        storageBucket: projectId ? projectId + '.appspot.com' : ''
    };

    console.log('[FIREBASE CONFIG] Updating Firebase Connection Config:', config.databaseURL);
    if (typeof saveFirebaseConfig === 'function') {
        saveFirebaseConfig(config);
    } else {
        setData('firebase_config', config);
    }
    showToast('New Firebase credentials saved and connected!');
    setElementLoading(btnEl, false);
}

function initWeb1FirebaseDatabase(btnEl) {
    var user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (!user) {
        showToast('Error: Admin login required to initialize database!', 'error');
        return;
    }

    if (!firebaseDb) {
        var ok = initFirebaseSync();
        if (!ok || !firebaseDb) {
            showToast('Error: Database connection failed.', 'error');
            return;
        }
    }

    setElementLoading(btnEl, true, 'Checking Database...');

    var defaultDataMap = {
        games_primary: typeof DEFAULT_GAMES_PRIMARY !== 'undefined' ? DEFAULT_GAMES_PRIMARY : [],
        games_secondary: typeof DEFAULT_GAMES_SECONDARY !== 'undefined' ? DEFAULT_GAMES_SECONDARY : [],
        featured: typeof DEFAULT_FEATURED !== 'undefined' ? DEFAULT_FEATURED : {},
        chart1_headers: typeof DEFAULT_CHART1_HEADERS !== 'undefined' ? DEFAULT_CHART1_HEADERS : [],
        chart1_data: typeof DEFAULT_CHART1_DATA !== 'undefined' ? DEFAULT_CHART1_DATA : [],
        chart2_headers: typeof DEFAULT_CHART2_HEADERS !== 'undefined' ? DEFAULT_CHART2_HEADERS : [],
        chart2_data: typeof DEFAULT_CHART2_DATA !== 'undefined' ? DEFAULT_CHART2_DATA : [],
        chart3_headers: typeof DEFAULT_CHART3_HEADERS !== 'undefined' ? DEFAULT_CHART3_HEADERS : [],
        chart3_data: typeof DEFAULT_CHART3_DATA !== 'undefined' ? DEFAULT_CHART3_DATA : [],
        fullchart_headers: typeof DEFAULT_FULLCHART_HEADERS !== 'undefined' ? DEFAULT_FULLCHART_HEADERS : [],
        fullchart_data: typeof DEFAULT_FULLCHART_DATA !== 'undefined' ? DEFAULT_FULLCHART_DATA : [],
        prev_fullchart_headers: typeof DEFAULT_PREV_FULLCHART_HEADERS !== 'undefined' ? DEFAULT_PREV_FULLCHART_HEADERS : [],
        prev_fullchart_data: typeof DEFAULT_PREV_FULLCHART_DATA !== 'undefined' ? DEFAULT_PREV_FULLCHART_DATA : [],
        marquee: typeof DEFAULT_MARQUEE !== 'undefined' ? DEFAULT_MARQUEE : '',
        hindi_text: typeof DEFAULT_HINDI_TEXT !== 'undefined' ? DEFAULT_HINDI_TEXT : '',
        ad_schedule: typeof DEFAULT_AD_SCHEDULE !== 'undefined' ? DEFAULT_AD_SCHEDULE : {},
        ad_content: typeof DEFAULT_AD_CONTENT !== 'undefined' ? DEFAULT_AD_CONTENT : '',
        disclaimer: typeof DEFAULT_DISCLAIMER !== 'undefined' ? DEFAULT_DISCLAIMER : ''
    };

    firebaseDb.ref('a7satta').once('value')
        .then(function(snapshot) {
            var existingData = snapshot.val() || {};
            var createdKeys = [];
            var skippedKeys = [];
            var promises = [];

            Object.keys(defaultDataMap).forEach(function(key) {
                var currentVal = existingData[key];
                if (currentVal !== undefined && currentVal !== null) {
                    skippedKeys.push(key);
                } else {
                    createdKeys.push(key);
                    promises.push(pushToFirebase(key, defaultDataMap[key]));
                }
            });

            if (createdKeys.length === 0) {
                showToast('Database already initialized! Zero keys overwritten.', 'info');
                console.log('[DB INIT] All keys already exist:', skippedKeys);
                setElementLoading(btnEl, false);
                return;
            }

            Promise.all(promises)
                .then(function() {
                    console.log('[DB INIT SUCCESS] Created keys:', createdKeys);
                    console.log('[DB INIT SUCCESS] Skipped keys:', skippedKeys);
                    showToast('Successfully initialized ' + createdKeys.length + ' database keys!', 'success');
                    setElementLoading(btnEl, false);
                })
                .catch(function(err) {
                    console.error('[DB INIT ERROR]', err);
                    showToast('Database initialization error: ' + err.message, 'error');
                    setElementLoading(btnEl, false);
                });
        })
        .catch(function(err) {
            console.error('[DB INIT FETCH ERROR]', err);
            showToast('Failed to check database state: ' + err.message, 'error');
            setElementLoading(btnEl, false);
        });
}

// --- Reset Data ---

function resetData(btnEl) {
    if (!confirm('⚠️ This will reset ALL data to default values. Are you sure?')) return;
    if (!confirm('This action cannot be undone. Proceed?')) return;
    
    setElementLoading(btnEl, true, 'Resetting...');
    console.warn('[ADMIN RESET] Resetting all data to initial defaults...');
    resetAllData();
    showToast('All data reset to defaults!', 'info');
    initAdminPage();
    setElementLoading(btnEl, false);
}

// Dynamic Month Headings for Admin Full Charts
function updateAdminFullChartHeadings() {
    var months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var now = new Date();
    var curYear = now.getFullYear();
    var curMonthIdx = now.getMonth();

    try {
        var formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'numeric'
        });
        var parts = formatter.formatToParts(now);
        parts.forEach(function(p) {
            if (p.type === 'year') curYear = parseInt(p.value, 10);
            if (p.type === 'month') curMonthIdx = parseInt(p.value, 10) - 1;
        });
    } catch (e) {
        console.warn('[ADMIN HEADINGS] Intl.DateTimeFormat error:', e);
    }

    var currentMonthName = months[curMonthIdx];
    var currentYear = curYear;

    var prevMonthIdx = curMonthIdx - 1;
    var prevYear = currentYear;
    if (prevMonthIdx < 0) {
        prevMonthIdx = 11;
        prevYear = currentYear - 1;
    }
    var prevMonthName = months[prevMonthIdx];

    var fullchartEl = document.getElementById('admin-fullchart');
    if (fullchartEl) {
        var section1 = fullchartEl.closest ? fullchartEl.closest('.admin-section') : fullchartEl.parentElement;
        if (section1) {
            var h3_1 = section1.querySelector('h3');
            if (h3_1) {
                h3_1.innerHTML = currentMonthName + ' ' + currentYear + ' Full Chart <span class="section-badge">Chart Page</span>';
            }
        }
    }

    var prevFullchartEl = document.getElementById('admin-prev-fullchart');
    if (prevFullchartEl) {
        var section2 = prevFullchartEl.closest ? prevFullchartEl.closest('.admin-section') : prevFullchartEl.parentElement;
        if (section2) {
            var h3_2 = section2.querySelector('h3');
            if (h3_2) {
                h3_2.innerHTML = prevMonthName + ' ' + prevYear + ' Full Chart (Previous Month) <span class="section-badge">Chart Page</span>';
            }
        }
    }
}

// ============================================================
// Initialize Admin Page
// ============================================================

function initAdminPage() {
    console.log('[ADMIN INIT] Initializing admin panel page...');
    checkAuth(function(user) {
        console.log('[ADMIN INIT] Admin panel loaded for user:', user.email);
        var primaryGames = getData('games_primary') || [];
        var secondaryGames = getData('games_secondary') || [];
        var totalGames = primaryGames.length + secondaryGames.length;
        
        var el1 = document.getElementById('stat-total-games');
        if (el1) el1.textContent = totalGames;
        var el2 = document.getElementById('stat-primary-games');
        if (el2) el2.textContent = primaryGames.length;
        var el3 = document.getElementById('stat-secondary-games');
        if (el3) el3.textContent = secondaryGames.length;

        renderAdminFeatured();
        renderAdminPrimaryTable();
        renderAdminSecondaryTable();
        renderAdminChart('admin-chart1', 'chart1_headers', 'chart1_data', 0);
        renderAdminChart('admin-chart2', 'chart2_headers', 'chart2_data', 1);
        renderAdminChart('admin-chart3', 'chart3_headers', 'chart3_data', 2);
        renderAdminChart('admin-fullchart', 'fullchart_headers', 'fullchart_data', 3);
        renderAdminChart('admin-prev-fullchart', 'prev_fullchart_headers', 'prev_fullchart_data', 4);
        updateAdminFullChartHeadings();
        renderAdminYearChart();
        renderAdminTopGameNames();
        renderAdminMarquee();
        renderAdminHindiText();
        renderAdminAdContent();
        renderAdminDisclaimer();
        renderAdminFirebase();
        renderAdminCredentials();

        switchTab('results');
        console.log('[ADMIN INIT] Admin panel loaded successfully.');
    });
}

// ============================================================
// Year Chart 2025-2026 Admin Management & Bulk CSV Importer
// ============================================================

var yearChartCSVPreviewData = null;

function renderAdminYearChart() {
    var thead = document.getElementById('admin-yearchart-head');
    var tbody = document.getElementById('admin-yearchart-body');
    if (!thead || !tbody) return;

    var headers = getData('year_chart_headers') || (typeof DEFAULT_YEAR_CHART_HEADERS !== 'undefined' ? DEFAULT_YEAR_CHART_HEADERS : []);
    var data = getData('year_chart_data') || [];

    // Render Table Head
    var headHtml = '<tr>';
    headHtml += '<th style="width:40px;text-align:center;"><input type="checkbox" onchange="toggleSelectAllYearChartRows(this)"></th>';
    headHtml += '<th style="width:120px;color:#ffd800;">Date</th>';
    headers.forEach(function(h, idx) {
        headHtml += '<th style="text-align:center;min-width:110px;">';
        headHtml += '<div style="display:flex;align-items:center;justify-content:center;gap:4px;">';
        headHtml += '<span>' + h + '</span>';
        headHtml += '<button type="button" class="btn-admin-icon" onclick="editYearChartHeader(' + idx + ', \'' + escapeQuotes(h) + '\')" title="Rename Game">✏️</button>';
        headHtml += '<button type="button" class="btn-admin-icon btn-danger" onclick="deleteYearChartColumn(' + idx + ')" title="Delete Game Column">❌</button>';
        headHtml += '</div>';
        headHtml += '</th>';
    });
    headHtml += '<th style="width:70px;text-align:center;">Action</th>';
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    // Render Table Body
    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + (headers.length + 3) + '" style="text-align:center;padding:25px;color:#888;">No Year Chart records found. Use "Add Date Row" or "Bulk Upload CSV" below to add 2025-2026 data.</td></tr>';
        return;
    }

    var bodyHtml = '';
    data.forEach(function(row) {
        var rowId = row.id;
        bodyHtml += '<tr data-row-id="' + rowId + '">';
        bodyHtml += '<td style="text-align:center;"><input type="checkbox" class="yc-row-checkbox" value="' + rowId + '"></td>';
        
        // Date Cell
        bodyHtml += '<td><span class="cell-editable" onclick="editYearChartDate(\'' + rowId + '\', \'' + escapeQuotes(row.date || '') + '\')">' + (row.date || '-') + '</span></td>';

        // Result Cells
        var values = Array.isArray(row.values) ? row.values : [];
        headers.forEach(function(h, colIdx) {
            var val = (values[colIdx] !== undefined && values[colIdx] !== null && values[colIdx] !== '') ? values[colIdx] : '-';
            bodyHtml += '<td style="text-align:center;"><span class="cell-editable" onclick="editYearChartValue(\'' + rowId + '\', ' + colIdx + ', \'' + escapeQuotes(val) + '\')">' + val + '</span></td>';
        });

        // Action Column
        bodyHtml += '<td style="text-align:center;"><button type="button" class="btn-admin btn-danger btn-sm" onclick="deleteYearChartRow(\'' + rowId + '\')">🗑️</button></td>';
        bodyHtml += '</tr>';
    });

    tbody.innerHTML = bodyHtml;
}

function toggleSelectAllYearChartRows(masterCb) {
    var checkboxes = document.querySelectorAll('.yc-row-checkbox');
    checkboxes.forEach(function(cb) {
        cb.checked = masterCb.checked;
    });
}

function editYearChartHeader(colIdx, currentVal) {
    var newVal = prompt('Enter game/column name:', currentVal);
    if (newVal === null) return;
    newVal = newVal.trim();
    if (!newVal) return;

    var headers = getData('year_chart_headers') || (typeof DEFAULT_YEAR_CHART_HEADERS !== 'undefined' ? DEFAULT_YEAR_CHART_HEADERS : []);
    headers[colIdx] = newVal;

    return pushToFirebase('year_chart_headers', headers)
        .then(function() {
            localStorage.setItem('a7_year_chart_headers', JSON.stringify(headers));
            renderAdminYearChart();
            if (typeof renderYearChart === 'function') renderYearChart();
            showToast('Header updated: ' + newVal);
        })
        .catch(function(err) {
            showToast('Error updating header: ' + err.message, 'error');
        });
}

function addYearChartColumn() {
    var colName = prompt('Enter new Game/Column name:');
    if (colName === null) return;
    colName = colName.trim();
    if (!colName) return;

    var headers = getData('year_chart_headers') || [];
    var data = getData('year_chart_data') || [];

    headers.push(colName);
    data.forEach(function(row) {
        if (!Array.isArray(row.values)) row.values = [];
        row.values.push('-');
    });

    return Promise.all([
        pushToFirebase('year_chart_headers', headers),
        pushToFirebase('year_chart_data', data)
    ]).then(function() {
        localStorage.setItem('a7_year_chart_headers', JSON.stringify(headers));
        localStorage.setItem('a7_year_chart_data', JSON.stringify(data));
        renderAdminYearChart();
        if (typeof renderYearChart === 'function') renderYearChart();
        showToast('Added new game column: ' + colName);
    }).catch(function(err) {
        showToast('Error adding column: ' + err.message, 'error');
    });
}

function deleteYearChartColumn(colIdx) {
    var headers = getData('year_chart_headers') || [];
    var headerName = headers[colIdx] || ('Column #' + (colIdx + 1));
    if (!confirm('Are you sure you want to delete column "' + headerName + '"? Data in this column will be removed.')) return;

    headers.splice(colIdx, 1);
    var data = getData('year_chart_data') || [];
    data.forEach(function(row) {
        if (Array.isArray(row.values)) {
            row.values.splice(colIdx, 1);
        }
    });

    return Promise.all([
        pushToFirebase('year_chart_headers', headers),
        pushToFirebase('year_chart_data', data)
    ]).then(function() {
        localStorage.setItem('a7_year_chart_headers', JSON.stringify(headers));
        localStorage.setItem('a7_year_chart_data', JSON.stringify(data));
        renderAdminYearChart();
        if (typeof renderYearChart === 'function') renderYearChart();
        showToast('Deleted game column: ' + headerName);
    }).catch(function(err) {
        showToast('Error deleting column: ' + err.message, 'error');
    });
}

function editYearChartDate(rowId, currentVal) {
    var newVal = prompt('Edit Date (e.g. 01-01-2025):', currentVal);
    if (newVal === null) return;
    newVal = newVal.trim();
    if (!newVal) return;

    var data = getData('year_chart_data') || [];
    var targetRow = data.find(function(r) { return r.id === rowId; });
    if (!targetRow) return;

    targetRow.date = newVal;

    return pushToFirebase('year_chart_data', data)
        .then(function() {
            localStorage.setItem('a7_year_chart_data', JSON.stringify(data));
            renderAdminYearChart();
            if (typeof renderYearChart === 'function') renderYearChart();
            showToast('Date updated to: ' + newVal);
        })
        .catch(function(err) {
            showToast('Error updating date: ' + err.message, 'error');
        });
}

function editYearChartValue(rowId, colIdx, currentVal) {
    var newVal = prompt('Edit Result Value:', currentVal);
    if (newVal === null) return;
    newVal = newVal.trim();
    if (!newVal) newVal = '-';

    var data = getData('year_chart_data') || [];
    var targetRow = data.find(function(r) { return r.id === rowId; });
    if (!targetRow) return;

    if (!Array.isArray(targetRow.values)) targetRow.values = [];
    targetRow.values[colIdx] = newVal;

    return pushToFirebase('year_chart_data', data)
        .then(function() {
            localStorage.setItem('a7_year_chart_data', JSON.stringify(data));
            renderAdminYearChart();
            if (typeof renderYearChart === 'function') renderYearChart();
            showToast('Result value saved: ' + newVal);
        })
        .catch(function(err) {
            showToast('Error saving value: ' + err.message, 'error');
        });
}

function addYearChartRow() {
    var headers = getData('year_chart_headers') || (typeof DEFAULT_YEAR_CHART_HEADERS !== 'undefined' ? DEFAULT_YEAR_CHART_HEADERS : []);
    var data = getData('year_chart_data') || [];

    var defaultValues = [];
    headers.forEach(function() { defaultValues.push('-'); });

    var todayStr = new Date().toISOString().slice(0, 10).split('-').reverse().join('-'); // DD-MM-YYYY
    var newRow = {
        id: generateUniqueId('yc_r'),
        date: todayStr,
        values: defaultValues
    };

    data.push(newRow);

    return pushToFirebase('year_chart_data', data)
        .then(function() {
            localStorage.setItem('a7_year_chart_data', JSON.stringify(data));
            renderAdminYearChart();
            if (typeof renderYearChart === 'function') renderYearChart();
            showToast('Added new Date Row');
        })
        .catch(function(err) {
            showToast('Error adding row: ' + err.message, 'error');
        });
}

function deleteYearChartRow(rowId) {
    if (!confirm('Are you sure you want to delete this row?')) return;

    var data = getData('year_chart_data') || [];
    var filtered = data.filter(function(r) { return r.id !== rowId; });

    return pushToFirebase('year_chart_data', filtered)
        .then(function() {
            localStorage.setItem('a7_year_chart_data', JSON.stringify(filtered));
            renderAdminYearChart();
            if (typeof renderYearChart === 'function') renderYearChart();
            showToast('Deleted Year Chart row');
        })
        .catch(function(err) {
            showToast('Error deleting row: ' + err.message, 'error');
        });
}

function deleteSelectedYearChartRows() {
    var checkboxes = document.querySelectorAll('.yc-row-checkbox:checked');
    if (checkboxes.length === 0) {
        showToast('Please select at least one row to delete.', 'info');
        return;
    }

    if (!confirm('Are you sure you want to delete ' + checkboxes.length + ' selected row(s)?')) return;

    var selectedIds = Array.from(checkboxes).map(function(cb) { return cb.value; });
    var data = getData('year_chart_data') || [];
    var filtered = data.filter(function(r) { return !selectedIds.includes(r.id); });

    return pushToFirebase('year_chart_data', filtered)
        .then(function() {
            localStorage.setItem('a7_year_chart_data', JSON.stringify(filtered));
            renderAdminYearChart();
            if (typeof renderYearChart === 'function') renderYearChart();
            showToast('Deleted ' + selectedIds.length + ' selected row(s)');
        })
        .catch(function(err) {
            showToast('Error deleting rows: ' + err.message, 'error');
        });
}

// Bulk CSV Handling
function handleYearChartFileSelect(evt) {
    var file = evt.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;
        document.getElementById('yearchart-csv-text').value = contents;
        showToast('Loaded CSV file: ' + file.name, 'info');
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    var lines = text.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
    if (lines.length === 0) return null;

    var rawHeaders = lines[0].split(',').map(function(h) { return h.trim().replace(/^["']|["']$/g, ''); });
    if (rawHeaders.length === 0) return null;

    var gameHeaders = [];
    rawHeaders.forEach(function(h, idx) {
        if (idx !== 0) {
            gameHeaders.push(h);
        }
    });

    var rows = [];
    for (var i = 1; i < lines.length; i++) {
        var cells = lines[i].split(',').map(function(c) { return c.trim().replace(/^["']|["']$/g, ''); });
        if (cells.length === 0) continue;

        var dateVal = cells[0] || ('Row #' + i);
        var values = [];

        for (var j = 1; j < rawHeaders.length; j++) {
            var val = cells[j];
            values.push((val !== undefined && val !== null && val !== '') ? val : '-');
        }

        rows.push({
            id: generateUniqueId('yc_r'),
            date: dateVal,
            values: values
        });
    }

    return {
        headers: gameHeaders,
        rows: rows
    };
}

function previewYearChartCSV() {
    var csvText = document.getElementById('yearchart-csv-text').value.trim();
    if (!csvText) {
        showToast('Please paste CSV data or select a CSV file first.', 'error');
        return;
    }

    var parsed = parseCSV(csvText);
    if (!parsed || !parsed.rows || parsed.rows.length === 0) {
        showToast('Failed to parse CSV data. Check the format.', 'error');
        return;
    }

    yearChartCSVPreviewData = parsed;

    var box = document.getElementById('yearchart-csv-preview-box');
    var stats = document.getElementById('yearchart-csv-stats');
    var tableDiv = document.getElementById('yearchart-csv-preview-table');

    stats.innerHTML = '<strong>Parsed Result:</strong> ' + parsed.rows.length + ' Date Rows, ' + parsed.headers.length + ' Game Columns (' + parsed.headers.join(', ') + ')';

    var html = '<table class="admin-table"><thead><tr><th style="color:#ffd800;">Date</th>';
    parsed.headers.forEach(function(h) {
        html += '<th style="text-align:center;">' + h + '</th>';
    });
    html += '</tr></thead><tbody>';

    var previewLimit = Math.min(parsed.rows.length, 10);
    for (var i = 0; i < previewLimit; i++) {
        var r = parsed.rows[i];
        html += '<tr><td>' + r.date + '</td>';
        r.values.forEach(function(v) {
            html += '<td style="text-align:center;">' + v + '</td>';
        });
        html += '</tr>';
    }

    if (parsed.rows.length > 10) {
        html += '<tr><td colspan="' + (parsed.headers.length + 1) + '" style="text-align:center;color:#888;font-style:italic;">... plus ' + (parsed.rows.length - 10) + ' more rows ...</td></tr>';
    }

    html += '</tbody></table>';
    tableDiv.innerHTML = html;
    box.style.display = 'block';
    showToast('CSV preview generated successfully!');
}

function isValidResultValue(val) {
    if (val === undefined || val === null) return false;
    var str = String(val).trim();
    if (str === '' || str === '-' || str === '--' || str.toUpperCase() === 'WAIT') {
        return false;
    }
    return true;
}

function importYearChartData(mode) {
    if (mode === 'replace') {
        showToast('Replace mode is permanently disabled to protect historical data.', 'error');
        console.error('importYearChartData("replace") rejected: Replace mode is permanently disabled.');
        return Promise.reject(new Error('Replace mode is permanently disabled.'));
    }

    if (!yearChartCSVPreviewData || !yearChartCSVPreviewData.rows || yearChartCSVPreviewData.rows.length === 0) {
        showToast('Please preview the CSV data before importing.', 'error');
        return;
    }

    mode = 'merge';

    if (!confirm('Are you sure you want to MERGE ' + yearChartCSVPreviewData.rows.length + ' imported records with the existing Year Chart?')) return;

    var existingHeaders = getData('year_chart_headers') || [];
    var existingData = getData('year_chart_data') || [];

    var finalHeaders = (existingHeaders.length > 0 && existingHeaders.length === yearChartCSVPreviewData.headers.length) ? existingHeaders : yearChartCSVPreviewData.headers;
    var finalData = JSON.parse(JSON.stringify(existingData));

    yearChartCSVPreviewData.rows.forEach(function(importedRow) {
        if (!importedRow || !importedRow.date) return;

        var existingRow = finalData.find(function(r) { return r && r.date === importedRow.date; });
        if (existingRow) {
            var mergedValues = Array.isArray(existingRow.values) ? existingRow.values.slice() : [];
            var importedValues = Array.isArray(importedRow.values) ? importedRow.values : [];
            var maxLen = Math.max(mergedValues.length, importedValues.length);

            for (var i = 0; i < maxLen; i++) {
                var existingVal = mergedValues[i];
                var importedVal = importedValues[i];

                if (isValidResultValue(importedVal)) {
                    mergedValues[i] = String(importedVal).trim();
                } else {
                    // Do NOT overwrite existing valid value with blank / - / -- / WAIT / null / undefined
                }
            }
            existingRow.values = mergedValues;
        } else {
            finalData.push(importedRow);
        }
    });

    return Promise.all([
        pushToFirebase('year_chart_headers', finalHeaders),
        pushToFirebase('year_chart_data', finalData)
    ]).then(function() {
        localStorage.setItem('a7_year_chart_headers', JSON.stringify(finalHeaders));
        localStorage.setItem('a7_year_chart_data', JSON.stringify(finalData));
        renderAdminYearChart();
        if (typeof renderYearChart === 'function') renderYearChart();

        document.getElementById('yearchart-csv-preview-box').style.display = 'none';
        document.getElementById('yearchart-csv-text').value = '';
        yearChartCSVPreviewData = null;

        showToast('Successfully merged ' + finalData.length + ' records!');
    }).catch(function(err) {
        showToast('Import failed: ' + err.message, 'error');
    });
}
