/**
 * GITHUB CONFIGURATION
 */
const GITHUB_CONFIG = {
    owner: "IsaiahNathaniel", // Change this
    repo: "smite2",       // Change this
    path: "data.json"
};

const GODS = ["Anubis", "Bacchus", "Bellona", "Chaac", "Fenrir", "Hades", "Loki", "Neith", "Odin", "Thor", "Ymir", "Zeus"];
const ROSTERS = {
    "Titans": ["Zapman", "CycloneSpin", "Aror"],
    "Hounds": ["Coast", "Dardez", "NeilMah"],
    "Dragons": ["PandaCat", "PBM", "Fineo"],
    "Warriors": ["Netrioid", "Cherryo", "Adapting"],
    "Kings": ["Variety", "CaptainTwig", "Genie"],
    "Scarabs": ["Screamnnnn", "Inbowned", "Stuart"]
};

const TEAMS = Object.keys(ROSTERS);
const STAT_FIELDS = [
    {id: "Lvl", label: "Level"}, {id: "Kills", label: "Kills"}, 
    {id: "Deaths", label: "Deaths"}, {id: "Assists", label: "Assists"},
    {id: "Gpm", label: "GPM"}, {id: "Pdmg", label: "Player Dmg"},
    {id: "Mdmg", label: "Minion Dmg"}, {id: "Jdmg", label: "Jungle Dmg"},
    {id: "Sdmg", label: "Structure Dmg"}, {id: "Take", label: "Dmg Taken"},
    {id: "Miti", label: "Dmg Mitigated"}, {id: "SelfH", label: "Self Heal"},
    {id: "AllyH", label: "Ally Heal"}, {id: "Ward", label: "Wards"}
];

let matches = [];

async function initApp() {
    setupUI();
    await loadDataFromGitHub();
}

/**
 * TOKEN MANAGEMENT
 */
function getAuthToken() {
    // Check if token is already in this session
    let token = sessionStorage.getItem('gh_token');
    
    if (!token) {
        token = prompt("Please enter your GitHub Personal Access Token to commit changes:");
        if (token) {
            sessionStorage.setItem('gh_token', token);
        }
    }
    return token;
}

function clearAuthToken() {
    sessionStorage.removeItem('gh_token');
    alert("Token cleared from session.");
}

/**
 * GITHUB API INTERACTIONS
 */
async function loadDataFromGitHub() {
    // Loading is public, no token required for public repos
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("File not found or Repo private");
        const data = await res.json();
        const content = decodeURIComponent(escape(atob(data.content))); // Handles special characters better
        matches = JSON.parse(content);
        
        document.getElementById('nav').style.display = 'flex';
        showScreen('main-interface');
        displayHistory();
    } catch (e) {
        console.error("GitHub Load Error:", e);
        alert("Sync failed. Ensure your Repo Name and Username are correct in app.js.");
    }
}

async function saveMatch() {
    const token = getAuthToken();
    if (!token) return; // User cancelled prompt

    const getP = (pre) => [1,2,3].map(i => {
        let pObj = { name: document.getElementById(`${pre}Name${i}`).value, god: document.getElementById(`${pre}God${i}`).value };
        STAT_FIELDS.forEach(sf => { pObj[sf.id] = parseInt(document.getElementById(`${pre}${sf.id}${i}`).value) || 0; });
        return pObj;
    });

    const newMatch = {
        id: Date.now(), 
        date: new Date().toLocaleDateString(),
        teamName: document.getElementById('tNameSelect').value,
        opponentName: document.getElementById('oNameSelect').value,
        result: document.getElementById('mResult').value,
        teamPlayers: getP('t'), 
        opponentPlayers: getP('o')
    };

    // Prepare GitHub Update
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;
    
    try {
        // 1. Get current file SHA (required for updates)
        const currentFileRes = await fetch(url, {
            headers: { 'Authorization': `token ${token}` }
        });
        
        if (currentFileRes.status === 401) {
            alert("Invalid Token. Clearing session...");
            clearAuthToken();
            return;
        }

        const currentFileData = await currentFileRes.json();
        
        // 2. Add match to local copy
        matches.push(newMatch);

        // 3. Push to GitHub
        const body = {
            message: `Match Log: ${newMatch.teamName} vs ${newMatch.opponentName}`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(matches, null, 2)))),
            sha: currentFileData.sha
        };

        const updateRes = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (updateRes.ok) {
            alert("Match successfully committed to GitHub!");
            showScreen('main-interface');
            displayHistory();
        } else {
            const errorData = await updateRes.json();
            throw new Error(errorData.message);
        }

    } catch (e) {
        console.error("Commit Error:", e);
        alert("Failed to save: " + e.message);
        // Remove the failed match from local array so it doesn't duplicate if they try again
        matches.pop();
    }
}

/**
 * UI & ANALYTICS (Unchanged logic, integrated for full code)
 */
function setupUI() {
    const teamOpts = TEAMS.sort().map(t => `<option value="${t}">${t}</option>`).join('');
    document.getElementById('tNameSelect').innerHTML = teamOpts;
    document.getElementById('oNameSelect').innerHTML = teamOpts;
    createInputSkeletons('teamInputs', 't');
    createInputSkeletons('oppInputs', 'o');
    updatePlayerDropdowns('t');
    updatePlayerDropdowns('o');
}

function createInputSkeletons(containerId, prefix) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    for (let i = 1; i <= 3; i++) {
        let statInputs = STAT_FIELDS.map(sf => `
            <div><label>${sf.label}</label><input type="number" id="${prefix}${sf.id}${i}" value="0"></div>
        `).join('');
        container.innerHTML += `
            <div class="player-card">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div><label>Player</label><select id="${prefix}Name${i}"></select></div>
                    <div><label>God</label><select id="${prefix}God${i}">${GODS.sort().map(g => `<option value="${g}">${g}</option>`).join('')}</select></div>
                </div>
                <div class="stat-input-group">${statInputs}</div>
            </div>`;
    }
}

function updatePlayerDropdowns(prefix) {
    const team = document.getElementById(`${prefix}NameSelect`).value;
    const players = ROSTERS[team] || [];
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`${prefix}Name${i}`).innerHTML = players.map(p => `<option value="${p}">${p}</option>`).join('');
    }
}

function showScreen(id) {
    ['main-interface', 'add-screen', 'player-stats-screen', 'team-stats-screen', 'welcome-screen'].forEach(s => {
        document.getElementById(s).style.display = (s === id) ? 'block' : 'none';
    });
    if (id === 'player-stats-screen') calculatePlayerStats();
    if (id === 'team-stats-screen') calculateTeamStats();
}

function displayHistory() {
    document.getElementById('database-content').innerHTML = matches.map(m => `
        <tr class="match-row" onclick="showModal(${m.id})">
            <td>${m.date}</td><td><strong>${m.teamName}</strong></td><td>${m.opponentName}</td><td class="${m.result}">${m.result}</td>
        </tr>`).join('');
}

function calculatePlayerStats() {
    const pMap = {};
    matches.forEach(m => {
        [...m.teamPlayers, ...m.opponentPlayers].forEach(p => {
            if (!pMap[p.name]) pMap[p.name] = { name:p.name, g:0, w:0, k:0, d:0, a:0, gpm:0, pdmg:0, wards:0 };
            const s = pMap[p.name]; s.g++;
            s.k += p.Kills; s.d += p.Deaths; s.a += p.Assists;
            s.gpm += p.Gpm; s.pdmg += p.Pdmg; s.wards += p.Ward;
            const isHome = m.teamPlayers.some(tp => tp.name === p.name);
            if ((isHome && m.result === 'Win') || (!isHome && m.result === 'Loss')) s.w++;
        });
    });
    document.getElementById('player-stats-content').innerHTML = Object.values(pMap).sort((a,b) => b.w - a.w).map(s => {
        const ratio = ((s.k + s.a) / Math.max(1, s.d)).toFixed(2);
        return `<tr><td><strong>${s.name}</strong></td><td>${s.g}</td><td>${((s.w/s.g)*100).toFixed(0)}%</td><td>${(s.k/s.g).toFixed(1)}</td><td>${(s.d/s.g).toFixed(1)}</td><td>${(s.a/s.g).toFixed(1)}</td><td>${ratio}</td><td>${Math.round(s.gpm/s.g)}</td><td>${Math.round(s.pdmg/s.g).toLocaleString()}</td><td>${(s.wards/s.g).toFixed(1)}</td></tr>`;
    }).join('');
}

function calculateTeamStats() {
    const tMap = {};
    matches.forEach(m => {
        const teams = [{n: m.teamName, r: m.result, p: m.teamPlayers}, {n: m.opponentName, r: (m.result==='Win'?'Loss':'Win'), p: m.opponentPlayers}];
        teams.forEach(t => {
            if (!tMap[t.n]) tMap[t.n] = { n:t.n, g:0, w:0, gpm:0 };
            const s = tMap[t.n]; s.g++;
            if (t.r === 'Win') s.w++;
            s.gpm += t.p.reduce((acc, curr) => acc + curr.Gpm, 0);
        });
    });
    document.getElementById('team-stats-content').innerHTML = Object.values(tMap).sort((a,b) => b.w - a.w).map(t => `<tr><td>${t.n}</td><td>${t.w}/${t.g-t.w}</td><td>${((t.w/t.g)*100).toFixed(1)}%</td><td>${Math.round(t.gpm/t.g).toLocaleString()}</td></tr>`).join('');
}

function showModal(id) {
    const m = matches.find(x => x.id === id);
    document.getElementById('mTitle').innerText = `${m.teamName} vs ${m.opponentName}`;
    const render = (players) => players.map(p => `<div style="background:#252525; padding:10px; margin-bottom:5px; border-radius:4px; font-size:0.8em; border-left: 3px solid #ffd700;"><strong>${p.name} (${p.god})</strong><br>K/D/A: ${p.Kills}/${p.Deaths}/${p.Assists} | GPM: ${p.Gpm} | P.Dmg: ${p.Pdmg}</div>`).join('');
    document.getElementById('mDetails').innerHTML = `<div class="form-grid"><div><h4>Home</h4>${render(m.teamPlayers)}</div><div><h4>Away</h4>${render(m.opponentPlayers)}</div></div>`;
    document.getElementById('detail-modal').style.display = 'block';
}