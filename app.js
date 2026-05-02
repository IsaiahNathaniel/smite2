/**
 * GITHUB CONFIGURATION
 */
const GITHUB_CONFIG = {
    owner: "IsaiahNathaniel", // Change this
    repo: "smite2",       // Change this
    path: "data.json"
};

const GODS = ["Achilles", "Agni", "Aladdin", "Amaterasu", "Anhur", "Anubis", "Aphrodite", "Apollo", "Ares", "Artemis", "Artio", "Athena", "Atlas", "Awilix", "Bacchus", "Baron Samedi", "Bellona", "Cabrakan", "Cerberus", "Cernunnos", "Chaac", "Charon", "Chrion", "Cupid", "Da Ji", "Danzaburou", "Discordia", "Eset", "Fenrir", "Ganesha", "Geb", "Gilgamesh", "Guan Yu", "Hades", "Hecate", "Hercules", "Hou Yi", "Hua Mulan", "Hun Batz", "Ishtar", "Izanami", "Janus", "Jing Wei", "Jormungandr", "Kali", "Khepri", "Kukulkan", "Loki", "Medusa", "Mercury", "Merlin", "Mordred", "Morgan Le Fay", "Ne Zha", "Neith", "Nemesis", "Nu Wa", "Nut", "Odin", "Osiris", "Pele", "Poseidon", "Princess Bari", "Ra", "Rama", "Rataroskr", "Scylla", "Sobek", "Sol", "Sun Wukong", "Susano", "Sylvanus", "Thanatos", "The Morrigan", "Thor", "Tsukuyomi", "Ullr", "Vulcan", "Xbalanque", "Yemoja", "Ymir", "Zeus"];
const ROSTERS = {
    "Dag's Team": ["Dag", "Bribri", "WhananaMan"],
    "JD's Team": ["JD", "Bumzo", "Kirinzaku"],
    "Tate's Team": ["Tate", "DedOne", "Ciecello"],
    "Dennis' Team": ["Dennis", "HoboLord", "Shapow"],
};

const TEAMS = Object.keys(ROSTERS);

// ALL 14 TRACKED STATS
const STAT_FIELDS = [
    {id: "Lvl", label: "Level"}, {id: "K", label: "Kills"}, {id: "D", label: "Deaths"}, {id: "A", label: "Assists"},
    {id: "Gpm", label: "GPM"}, {id: "Pdmg", label: "Player Dmg"}, {id: "Mdmg", label: "Minion Dmg"},
    {id: "Jdmg", label: "Jungle Dmg"}, {id: "Sdmg", label: "Struct Dmg"}, {id: "Take", label: "Dmg Taken"},
    {id: "Miti", label: "Dmg Mitigated"}, {id: "SelfH", label: "Self Heal"}, {id: "AllyH", label: "Ally Heal"}, 
    {id: "Wards", label: "Wards"}
];

let matches = [];
let SESSION_TOKEN = null;
let CURRENT_MODE = 'pm'; // 'pm' or 'total'

/**
 * 2. UI GENERATORS & UTILITIES
 * These must be defined before setupUI calls them.
 */

function createInputSkeletons(containerId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= 3; i++) {
        let statInputs = STAT_FIELDS.map(sf => `
            <div>
                <label>${sf.label}</label>
                <input type="number" id="${prefix}${sf.id}${i}" value="0">
            </div>`).join('');
            
        container.innerHTML += `
            <div class="player-card">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div><label>Player</label><select id="${prefix}Name${i}"></select></div>
                    <div><label>God</label><select id="${prefix}God${i}">${GODS.map(g => `<option value="${g}">${g}</option>`).join('')}</select></div>
                </div>
                <div class="stat-input-group">${statInputs}</div>
            </div>`;
    }
}

function updateWinnerOptions() {
    const t1 = document.getElementById('tNameSelect').value;
    const t2 = document.getElementById('oNameSelect').value;
    const winnerSelect = document.getElementById('mWinner');
    if (winnerSelect) {
        winnerSelect.innerHTML = `<option value="${t1}">${t1}</option><option value="${t2}">${t2}</option>`;
    }
}

function updatePlayerDropdowns(prefix) {
    const teamName = document.getElementById(`${prefix}NameSelect`).value;
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById(`${prefix}Name${i}`);
        if (el) {
            el.innerHTML = ROSTERS[teamName].map(p => `<option value="${p}">${p}</option>`).join('');
        }
    }
    updateWinnerOptions();
}

function showScreen(id) {
    ['main-interface', 'add-screen', 'player-stats-screen', 'team-stats-screen', 'welcome-screen'].forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = (s === id) ? 'block' : 'none';
    });
    if (id === 'player-stats-screen') sortPlayerTable('g');
    if (id === 'team-stats-screen') sortTeamTable('w');
}

/**
 * 3. ANALYTICS ENGINE
 */

function calculatePlayerStats() {
    const pMap = {};
    matches.forEach(m => {
        const all = [...m.teamPlayers, ...m.opponentPlayers];
        all.forEach(p => {
            if (!pMap[p.name]) {
                pMap[p.name] = { name: p.name, g: 0, w: 0, totalMins: 0 };
                STAT_FIELDS.forEach(sf => pMap[p.name][sf.id] = 0);
            }
            const s = pMap[p.name];
            s.g++;
            s.totalMins += (m.length || 1);
            STAT_FIELDS.forEach(sf => s[sf.id] += (p[sf.id] || 0));
            
            const isHomePlayer = m.teamPlayers.some(tp => tp.name === p.name);
            const playerTeam = isHomePlayer ? m.teamName : m.opponentName;
            if (playerTeam === m.winner) s.w++;
        });
    });

    return Object.values(pMap).map(s => {
        const base = { 
            name: s.name, 
            g: s.g, 
            winRate: (s.w / s.g) * 100, 
            kda: (s.K + s.A) / Math.max(1, s.D) 
        };
        
        if (CURRENT_MODE === 'total') {
            STAT_FIELDS.forEach(sf => base[sf.id] = s[sf.id]);
        } else {
            // Level, GPM, and Wards are better as averages than per-minute
            base.Lvl = s.Lvl / s.g; 
            base.Gpm = s.Gpm / s.g; 
            base.Wards = s.Wards / s.g;
            // Everything else is calculated Per Minute
            const pmKeys = ["K", "D", "A", "Pdmg", "Mdmg", "Jdmg", "Sdmg", "Take", "Miti", "SelfH", "AllyH"];
            pmKeys.forEach(key => base[key] = s[key] / s.totalMins);
        }
        return base;
    });
}

function sortPlayerTable(key) {
    const data = calculatePlayerStats().sort((a, b) => {
        if (typeof a[key] === 'string') return a[key].localeCompare(b[key]);
        return b[key] - a[key];
    });
    
    // Generate Headers
    const headers = [
        `<th onclick="sortPlayerTable('name')">Player</th>`,
        `<th onclick="sortPlayerTable('g')">GP</th>`,
        `<th onclick="sortPlayerTable('winRate')">Win%</th>`,
        `<th onclick="sortPlayerTable('kda')">KDA</th>`
    ];
    
    STAT_FIELDS.forEach(sf => {
        const isPM = CURRENT_MODE === 'pm' && !['Lvl', 'Gpm', 'Wards'].includes(sf.id);
        headers.push(`<th onclick="sortPlayerTable('${sf.id}')">${sf.label}${isPM ? '/M' : ''}</th>`);
    });
    document.getElementById('ranking-headers').innerHTML = headers.join('');

    // Generate Body
    document.getElementById('player-stats-content').innerHTML = data.map(s => `
        <tr>
            <td class="sticky-col"><strong>${s.name}</strong></td>
            <td>${s.g}</td>
            <td>${s.winRate.toFixed(0)}%</td>
            <td>${s.kda.toFixed(2)}</td>
            ${STAT_FIELDS.map(sf => {
                const isPM = CURRENT_MODE === 'pm' && !['Lvl', 'Gpm', 'Wards'].includes(sf.id);
                const val = s[sf.id];
                return `<td>${isPM ? val.toFixed(2) : Math.round(val).toLocaleString()}</td>`;
            }).join('')}
        </tr>`).join('');
}

function toggleStatMode(mode) {
    CURRENT_MODE = mode;
    document.getElementById('btn-pm').className = mode === 'pm' ? 'active' : '';
    document.getElementById('btn-total').className = mode === 'total' ? 'active' : '';
    sortPlayerTable('g'); 
}

function sortTeamTable(key) {
    const tMap = {};
    matches.forEach(m => {
        [m.teamName, m.opponentName].forEach(team => {
            if (!tMap[team]) tMap[team] = { n: team, g: 0, w: 0, l: 0, gpm: 0 };
            const s = tMap[team];
            s.g++;
            if (team === m.winner) s.w++; else s.l++;
            const players = (team === m.teamName) ? m.teamPlayers : m.opponentPlayers;
            s.gpm += players.reduce((acc, curr) => acc + (curr.Gpm || 0), 0);
        });
    });
    
    const data = Object.values(tMap).map(t => ({
        ...t,
        winRate: (t.w / t.g) * 100,
        avgGpm: t.gpm / t.g
    })).sort((a, b) => b[key] - a[key]);

    document.getElementById('team-stats-content').innerHTML = data.map(t => `
        <tr>
            <td><strong>${t.n}</strong></td>
            <td>${t.g}</td>
            <td>${t.w}</td>
            <td>${t.l}</td>
            <td>${t.winRate.toFixed(1)}%</td>
            <td>${Math.round(t.avgGpm).toLocaleString()}</td>
        </tr>`).join('');
}

/**
 * 4. GITHUB SYNC & HISTORY
 */

async function loadDataFromGitHub() {
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("File not found");
        const data = await res.json();
        const content = decodeURIComponent(escape(atob(data.content)));
        matches = JSON.parse(content);
        document.getElementById('nav').style.display = 'flex';
        showScreen('main-interface');
        displayHistory();
    } catch (e) {
        console.error(e);
        alert("Error loading data. Ensure GITHUB_CONFIG is set and data.json exists.");
    }
}

async function saveMatch() {
    if (!SESSION_TOKEN) {
        SESSION_TOKEN = prompt("Please enter your GitHub Personal Access Token:");
        if (!SESSION_TOKEN) return;
    }

    const mDate = document.getElementById('mDate').value;
    const mLen = parseInt(document.getElementById('mLength').value);
    if (!mDate || !mLen) return alert("Please fill in Date and Game Length.");

    const getP = (pre) => [1,2,3].map(i => {
        let pObj = { 
            name: document.getElementById(`${pre}Name${i}`).value, 
            god: document.getElementById(`${pre}God${i}`).value 
        };
        STAT_FIELDS.forEach(sf => pObj[sf.id] = parseInt(document.getElementById(`${pre}${sf.id}${i}`).value) || 0);
        return pObj;
    });

    const newMatch = {
        id: Date.now(),
        date: mDate,
        length: mLen,
        teamName: document.getElementById('tNameSelect').value,
        opponentName: document.getElementById('oNameSelect').value,
        winner: document.getElementById('mWinner').value,
        teamPlayers: getP('t'),
        opponentPlayers: getP('o')
    };

    matches.push(newMatch);
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;
    
    try {
        const fileRes = await fetch(url);
        const fileData = await fileRes.json();
        
        const body = {
            message: `Match: ${newMatch.teamName} vs ${newMatch.opponentName}`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(matches, null, 2)))),
            sha: fileData.sha
        };

        const putRes = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${SESSION_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (putRes.ok) {
            alert("Match Saved!");
            showScreen('main-interface');
            displayHistory();
        } else {
            const err = await putRes.json();
            throw new Error(err.message);
        }
    } catch (e) {
        matches.pop(); // Remove match if save failed
        alert("Sync Failed: " + e.message);
    }
}

function displayHistory() {
    document.getElementById('database-content').innerHTML = matches.slice().reverse().map(m => `
        <tr class="match-row" onclick="showModal(${m.id})">
            <td>${m.date}</td>
            <td>${m.length}m</td>
            <td>${m.teamName} ${m.winner === m.teamName ? '🏆' : ''}</td>
            <td>${m.opponentName} ${m.winner === m.opponentName ? '🏆' : ''}</td>
            <td class="winner-tag">${m.winner} Won</td>
        </tr>`).join('');
}

function showModal(id) {
    const m = matches.find(x => x.id === id);
    if (!m) return;

    document.getElementById('mTitle').innerText = `${m.teamName} vs ${m.opponentName}`;
    document.getElementById('mMeta').innerHTML = `
        <span style="color:var(--gold)">${m.date}</span> | 
        <span>${m.length} Minutes</span> | 
        <span class="winner-tag">Winner: ${m.winner}</span>
    `;

    const renderPlayerTable = (players, teamTitle) => {
        return `
            <div style="margin-top: 20px;">
                <h4 style="color:var(--gold); border-bottom: 1px solid #444; padding-bottom: 5px;">${teamTitle}</h4>
                <div style="overflow-x: auto;">
                    <table style="font-size: 0.7em; min-width: 1000px; background: #222;">
                        <thead>
                            <tr>
                                <th>Player</th><th>God</th><th>Lvl</th><th>K/D/A</th><th>GPM</th>
                                <th>P.Dmg</th><th>M.Dmg</th><th>J.Dmg</th><th>S.Dmg</th>
                                <th>Taken</th><th>Miti</th><th>SelfH</th><th>AllyH</th><th>Wards</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${players.map(p => `
                                <tr>
                                    <td style="font-weight:bold; color:var(--gold)">${p.name}</td>
                                    <td>${p.god}</td>
                                    <td>${p.Lvl}</td>
                                    <td>${p.K}/${p.D}/${p.A}</td>
                                    <td>${p.Gpm}</td>
                                    <td>${p.Pdmg.toLocaleString()}</td>
                                    <td>${p.Mdmg.toLocaleString()}</td>
                                    <td>${p.Jdmg.toLocaleString()}</td>
                                    <td>${p.Sdmg.toLocaleString()}</td>
                                    <td>${p.Take.toLocaleString()}</td>
                                    <td>${p.Miti.toLocaleString()}</td>
                                    <td>${p.SelfH.toLocaleString()}</td>
                                    <td>${p.AllyH.toLocaleString()}</td>
                                    <td>${p.Wards}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    document.getElementById('mDetails').innerHTML = `
        ${renderPlayerTable(m.teamPlayers, m.teamName)}
        ${renderPlayerTable(m.opponentPlayers, m.opponentName)}
    `;
    
    document.getElementById('detail-modal').style.display = 'block';
}

/**
 * 5. INITIALIZATION
 * Runs last to ensure everything else is defined.
 */

function setupUI() {
    const teamNames = Object.keys(ROSTERS).sort();
    const teamOpts = teamNames.map(t => `<option value="${t}">${t}</option>`).join('');
    
    document.getElementById('tNameSelect').innerHTML = teamOpts;
    document.getElementById('oNameSelect').innerHTML = teamOpts;
    document.getElementById('mDate').valueAsDate = new Date();

    // Call helpers defined above
    createInputSkeletons('teamInputs', 't');
    createInputSkeletons('oppInputs', 'o');
    updatePlayerDropdowns('t');
    updatePlayerDropdowns('o');
}

async function initApp() {
    setupUI();
    await loadDataFromGitHub();
}