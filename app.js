/**
 * GITHUB CONFIGURATION AND ARRAYS FOR GODS, PLAYERS, AND STATS
 */
const GITHUB_CONFIG = {
    owner: "IsaiahNathaniel",
    repo: "smite2",       
    path: "data.json"
};

const GODS = ["Achilles", "Agni", "Aladdin", "Amaterasu", "Anhur", "Anubis", "Aphrodite", "Apollo", "Ares", "Artemis", "Artio", "Athena", "Atlas", "Awilix", "Bacchus", "Baron Samedi", "Bellona", "Cabrakan", "Cerberus", "Cernunnos", "Chaac", "Charon", "Chrion", "Cupid", "Da Ji", "Danzaburou", "Discordia", "Eset", "Fenrir", "Ganesha", "Geb", "Gilgamesh", "Guan Yu", "Hades", "Hecate", "Hercules", "Hou Yi", "Hua Mulan", "Hun Batz", "Ishtar", "Izanami", "Janus", "Jing Wei", "Jormungandr", "Kali", "Khepri", "Kukulkan", "Loki", "Medusa", "Mercury", "Merlin", "Mordred", "Morgan Le Fay", "Ne Zha", "Neith", "Nemesis", "Nu Wa", "Nut", "Odin", "Osiris", "Pele", "Poseidon", "Princess Bari", "Ra", "Rama", "Rataroskr", "Scylla", "Sobek", "Sol", "Sun Wukong", "Susano", "Sylvanus", "Thanatos", "The Morrigan", "Thor", "Tsukuyomi", "Ullr", "Vulcan", "Xbalanque", "Yemoja", "Ymir", "Zeus"];
const ROSTERS = {
    "Viridian Vincere": ["Dag", "Bribri", "WhananaMan"],
    "Home Depot Repo": ["Wikipii", "Bumzo", "Kirinzaku"],
    "Dummy Luck": ["TheSnoodPenguin", "DedOne", "Ciecello"],
    "The Team": ["Uvahash", "HoboLord", "Shapow"],
};

const STAT_FIELDS = [
    {id: "Lvl", label: "Level"}, {id: "K", label: "Kills"}, {id: "D", label: "Deaths"}, {id: "A", label: "Assists"},
    {id: "Gpm", label: "GPM"}, {id: "Pdmg", label: "Player Dmg"}, {id: "Mdmg", label: "Minion Dmg"},
    {id: "Jdmg", label: "Jungle Dmg"}, {id: "Sdmg", label: "Struct Dmg"}, {id: "Take", label: "Dmg Taken"},
    {id: "Miti", label: "Dmg Mitigated"}, {id: "SelfH", label: "Self Heal"}, {id: "AllyH", label: "Ally Heal"}, 
    {id: "Wards", label: "Wards"}
];

let matches = [];
let SESSION_TOKEN = null; //stays null until assigned during data input
let PLAYER_MODE = 'pm';  //these two are for display of per minute, per game, and totals in the team display tabs - they change when making selections
let GOD_MODE = 'pm';    

/**
 * ==========================================
 * 2. ANALYTICS ENGINE
 * ==========================================
 */

function sortTeamTable(key) {
    const tMap = {};
    matches.forEach(m => { //pulls from matches array and adds the stats from that data to local variables for display and data sorting purposes, loops through each game
        [m.teamName, m.opponentName].forEach(team => {
            if (!tMap[team]) tMap[team] = { n: team, g: 0, w: 0, l: 0, gpm: 0 }; //if team doesn't already exist, create them
            const s = tMap[team]; s.g++; //adds 1 game played for each team
            if (team === m.winner) s.w++; else s.l++; //adds wins or losses
            //code below is calculating gpm - we aren't gonna use it
            //const pArr = (team === m.teamName) ? m.teamPlayers : m.opponentPlayers;
            //s.gpm += pArr.reduce((acc, curr) => acc + (parseInt(curr.Gpm) || 0), 0);
        });
    });

    const data = Object.values(tMap).map(t => ({ //turns the data organized into individual teams back into a simple array for sorting, then creates a new list to calculate winRate and GPM
        ...t, 
        winRate: (t.w / t.g) * 100, 
        avgGpm: t.gpm / t.g
    })).sort((a, b) => (typeof a[key] === 'string' ? a[key].localeCompare(b[key]) : b[key] - a[key])); //sort ranking logic for team tables

    //below is for displaying the stats on screen, uses the data array created above
    document.getElementById('team-stats-content').innerHTML = data.map(t => `
        <tr class="match-row" onclick="showTeamHistory('${t.n}')" style="cursor: pointer;">
            <td style="color: #ffd700; font-weight: bold;">${t.n}</td>
            <td>${t.g}</td> 
            <td>${t.w}</td>
            <td>${t.l}</td>
            <td>${t.winRate.toFixed(1)}%</td>
            <!-- <td>${Math.round(t.avgGpm).toLocaleString()}</td> GPM SECTION REMOVED //-->
        </tr>`).join('');
}

function showTeamHistory(teamName) {
    // 1. Hide the main team standings table
    document.querySelector('#team-stats-screen .table-wrap').style.display = 'none';
    
    const section = document.getElementById('team-history-section');
    const content = document.getElementById('team-history-content');
    
    // 2. Filter and Sort
    const filtered = matches.filter(m => m.teamName === teamName || m.opponentName === teamName);
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    document.getElementById('history-team-name').innerText = teamName + " - Match History";
    
    // 3. Render rows with click-to-modal functionality
    content.innerHTML = filtered.map(m => {
        const opp = m.teamName === teamName ? m.opponentName : m.teamName;
        const res = m.winner === teamName ? 
            '<span style="color:#4caf50; font-weight:bold;">WIN</span>' : 
            '<span style="color:#f44336;">LOSS</span>';
            
        return `
            <tr class="match-row" onclick="showModal(${m.id})" style="cursor: pointer;">
                <td>${m.date}</td>
                <td>vs ${opp}</td>
                <td>${res}</td>
                <td>${m.length}m</td>
            </tr>`;
    }).join('');

    // 4. Show the history section
    section.style.display = 'block';
    window.scrollTo(0, 0); 
}



/**
 * ==========================================
 * 3. MATCH MODAL (THE STATS VIEW)
 * ==========================================
 */

function showModal(id) {
    const m = matches.find(x => x.id === id);
    if (!m) return;
    
    document.getElementById('mTitle').innerText = `${m.teamName} vs ${m.opponentName}`;
    document.getElementById('mMeta').innerText = `${m.date} | ${m.length}m | Winner: ${m.winner}`;
    
    const renderModalTable = (players, title) => `
        <h4 style="color:#ffd700; margin-top:20px;">${title}</h4>
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Player</th><th>God</th><th>Lvl</th><th>KDA</th><th>GPM</th>${STAT_FIELDS.slice(5).map(f => `<th>${f.label}</th>`).join('')}</tr></thead>
            <tbody>${players.map(p => `<tr><td>${p.name}</td><td>${p.god}</td><td>${p.Lvl}</td><td>${p.K}/${p.D}/${p.A}</td><td>${p.Gpm}</td>${STAT_FIELDS.slice(5).map(f => `<td>${p[f.id].toLocaleString()}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`;

    document.getElementById('mDetails').innerHTML = renderModalTable(m.teamPlayers, m.teamName) + renderModalTable(m.opponentPlayers, m.opponentName);
    document.getElementById('detail-modal').style.display = 'block';
}

/**
 * ==========================================
 * 4. PLAYER & GOD ANALYTICS
 * ==========================================
 */

function getAggregatedData(type, mode) {
    const map = {};
    matches.forEach(m => {
        const all = [...m.teamPlayers.map(p => ({...p, team: m.teamName})), ...m.opponentPlayers.map(p => ({...p, team: m.opponentName}))];
        all.forEach(p => {
            const key = type === 'player' ? p.name : p.god;
            if (!map[key]) {
                map[key] = { id: key, g: 0, w: 0, mins: 0 };
                STAT_FIELDS.forEach(sf => map[key][sf.id] = 0);
            }
            const s = map[key]; s.g++; s.mins += (parseInt(m.length) || 1);
            STAT_FIELDS.forEach(sf => s[sf.id] += (parseInt(p[sf.id]) || 0));
            if (p.team === m.winner) s.w++;
        });
    });

    return Object.values(map).map(s => {
        const res = { id: s.id, g: s.g, wr: (s.w / s.g) * 100, kda: (s.K + s.A) / Math.max(1, s.D) };
        STAT_FIELDS.forEach(sf => {
            if (mode === 'total') res[sf.id] = s[sf.id];
            else if (mode === 'pg') res[sf.id] = s[sf.id] / s.g;
            else {
                if (['Lvl', 'Gpm', 'Wards'].includes(sf.id)) res[sf.id] = s[sf.id] / s.g;
                else res[sf.id] = s[sf.id] / s.mins;
            }
        });
        return res;
    });
}

function renderTable(type, bodyId, headId, mode, sortKey) {
    const data = getAggregatedData(type, mode).sort((a,b) => (typeof a[sortKey] === 'string' ? a[sortKey].localeCompare(b[sortKey]) : b[sortKey] - a[sortKey]));
    const sortFn = type === 'player' ? 'sortPlayerTable' : 'sortGodTable';
    
    const heads = [`<th onclick="${sortFn}('id')">${type === 'player' ? 'Player' : 'God'}</th>`, `<th onclick="${sortFn}('g')">GP</th>`, `<th onclick="${sortFn}('wr')">WR%</th>`, `<th onclick="${sortFn}('kda')">KDA</th>`];
    STAT_FIELDS.forEach(sf => {
        let suffix = (mode === 'pm' && !['Lvl', 'Gpm', 'Wards'].includes(sf.id)) ? '/M' : (mode === 'pg' ? '/G' : '');
        heads.push(`<th onclick="${sortFn}('${sf.id}')">${sf.label}${suffix}</th>`);
    });
    document.getElementById(headId).innerHTML = heads.join('');

    document.getElementById(bodyId).innerHTML = data.map(s => `
        <tr>
            <td class="sticky-col"><strong>${s.id}</strong></td>
            <td>${s.g}</td><td>${s.wr.toFixed(0)}%</td><td>${s.kda.toFixed(2)}</td>
            ${STAT_FIELDS.map(sf => `<td>${mode === 'total' ? Math.round(s[sf.id]).toLocaleString() : s[sf.id].toFixed(2)}</td>`).join('')}
        </tr>`).join('');
}

function sortPlayerTable(key) { renderTable('player', 'player-stats-content', 'ranking-headers', PLAYER_MODE, key); }
function sortGodTable(key) { renderTable('god', 'god-stats-content', 'god-ranking-headers', GOD_MODE, key); }

/**
 * ==========================================
 * 5. NAVIGATION & UI HELPERS
 * ==========================================
 */

/**
 * Ensures that when you switch tabs, the team standings table 
 * is visible again and the history is hidden.
 */
function showScreen(id) {
    // 1. Hide all main screen containers
    const screens = ['main-interface', 'add-screen', 'player-stats-screen', 'team-stats-screen', 'god-stats-screen', 'welcome-screen'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = (s === id) ? 'block' : 'none';
    });

    // 2. Specific logic for the Teams Tab
    if (id === 'team-stats-screen') {
        // Ensure the main standings table is visible
        const mainTable = document.querySelector('#team-stats-screen .table-wrap');
        if (mainTable) mainTable.style.display = 'block';

        // Ensure the drill-down history section is hidden
        const historySection = document.getElementById('team-history-section');
        if (historySection) historySection.style.display = 'none';

        // Re-render the data (in case it was cleared or needs updating)
        sortTeamTable('w'); 
    }
    
    // 3. Logic for other tabs
    if (id === 'player-stats-screen') sortPlayerTable('g');
    if (id === 'god-stats-screen') sortGodTable('g');
    if (id === 'main-interface') displayHistory();
}


function displayHistory() {
    document.getElementById('database-content').innerHTML = matches.slice().reverse().map(m => `
        <tr class="match-row" onclick="showModal(${m.id})" style="cursor: pointer;">
            <td>${m.date}</td><td>${m.length}m</td><td>${m.teamName}</td><td>${m.opponentName}</td><td style="color:#4caf50; font-weight:bold;">${m.winner}</td>
        </tr>`).join('');
}

function createInputSkeletons(id, pre) {
    document.getElementById(id).innerHTML = [1, 2, 3].map(i => `
        <div class="player-card" style="background: #252525; padding: 15px; margin-top: 15px; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <select id="${pre}Name${i}"></select>
                <select id="${pre}God${i}">${GODS.map(g => `<option>${g}</option>`).join('')}</select>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px;">
                ${STAT_FIELDS.map(f => `<div><label style="font-size: 0.7em; color: #ffd700;">${f.label}</label><input type="number" id="${pre}${f.id}${i}" value="0" style="width: 100%;"></div>`).join('')}
            </div>
        </div>`).join('');
}

function updatePlayerDropdowns(pre) {
    const t = document.getElementById(pre === 't' ? 'tNameSelect' : 'oNameSelect').value;
    [1, 2, 3].forEach(i => { document.getElementById(`${pre}Name${i}`).innerHTML = ROSTERS[t].map(p => `<option>${p}</option>`).join(''); });
    const t1 = document.getElementById('tNameSelect').value;
    const t2 = document.getElementById('oNameSelect').value;
    document.getElementById('mWinner').innerHTML = `<option>${t1}</option><option>${t2}</option>`;
}

function setupUI() {
    const opts = Object.keys(ROSTERS).sort().map(t => `<option value="${t}">${t}</option>`).join('');
    document.getElementById('tNameSelect').innerHTML = opts;
    document.getElementById('oNameSelect').innerHTML = opts;
    createInputSkeletons('teamInputs', 't');
    createInputSkeletons('oppInputs', 'o');
    updatePlayerDropdowns('t');
    updatePlayerDropdowns('o');
}

/**
 * ==========================================
 * 6. DATA SYNC
 * ==========================================
 */

async function initApp() { setupUI(); await loadDataFromGitHub(); }

async function loadDataFromGitHub() {
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        matches = JSON.parse(decodeURIComponent(escape(atob(data.content))));
        document.getElementById('nav').style.display = 'flex';
        showScreen('main-interface');
    } catch (e) { alert("Load failed."); }
}

async function saveMatch() {
    if (!SESSION_TOKEN) SESSION_TOKEN = prompt("GitHub Token:");
    const mData = {
        id: Date.now(),
        date: document.getElementById('mDate').value,
        length: document.getElementById('mLength').value,
        teamName: document.getElementById('tNameSelect').value,
        opponentName: document.getElementById('oNameSelect').value,
        winner: document.getElementById('mWinner').value
    };
    const getP = (pre) => [1, 2, 3].map(i => {
        let p = { name: document.getElementById(`${pre}Name${i}`).value, god: document.getElementById(`${pre}God${i}`).value };
        STAT_FIELDS.forEach(f => p[f.id] = parseInt(document.getElementById(`${pre}${f.id}${i}`).value) || 0);
        return p;
    });
    mData.teamPlayers = getP('t');
    mData.opponentPlayers = getP('o');
    matches.push(mData);

    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;
    const fRes = await fetch(url);
    const fData = await fRes.json();
    const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `token ${SESSION_TOKEN}` },
        body: JSON.stringify({ message: "Log Match", content: btoa(unescape(encodeURIComponent(JSON.stringify(matches, null, 2)))), sha: fData.sha })
    });
    if (res.ok) { alert("Saved!"); showScreen('main-interface'); } else { alert("Save failed."); }
}

function togglePlayerMode(m) { PLAYER_MODE = m; sortPlayerTable('g'); }
function toggleGodMode(m) { GOD_MODE = m; sortGodTable('g'); }