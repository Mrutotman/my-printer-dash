// ================= STATE =================
let SERVER_URL = "";
let authToken = null;
let myDeviceName = "Unknown";
let deviceState = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
let pendingId = null;
let pendingState = null;
let lockTimer = 0;

// ================= INITIALIZATION =================
window.onload = () => {

    renderRelays();
    loadStoredLogs();

    const savedURL = localStorage.getItem("server_url");
    const savedToken = localStorage.getItem("auth_token");
    const savedName = localStorage.getItem("device_name");

    if(savedURL) {
        SERVER_URL = savedURL;
        document.getElementById("server-url").value = savedURL;
    }

    if(savedToken && savedURL) {
        authToken = savedToken;
        myDeviceName = savedName || "Unknown";
        document.getElementById("display-name").innerText = myDeviceName;
        showDashboard();
        startPolling();
    }
};

// ================= LOGIN =================
function connectSystem() {

    const user = document.getElementById("mqtt-user").value.trim();
    const pass = document.getElementById("mqtt-pass").value.trim();
    const name = document.getElementById("device-name").value.trim() || "Unknown";
    const url  = document.getElementById("server-url").value.trim();

    if(!user || !pass || !url) {
        alert("All fields required");
        return;
    }

    if(!url.startsWith("https://") && !url.startsWith("http://")) {
        alert("Invalid server URL");
        return;
    }

    SERVER_URL = url.replace(/\/$/, "");

    fetch(`${SERVER_URL}/login`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({username:user, password:pass})
    })
    .then(r => r.json())
    .then(data => {

        if(!data.token) {
            alert("Login Failed");
            return;
        }

        authToken = data.token;
        myDeviceName = name;

        localStorage.setItem("server_url", SERVER_URL);
        localStorage.setItem("auth_token", authToken);
        localStorage.setItem("device_name", myDeviceName);

        document.getElementById("display-name").innerText = myDeviceName;

        showDashboard();
        startPolling();
    })
    .catch(()=> alert("Cannot reach server"));
}

function doLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("device_name");
    location.reload();
}

function showDashboard() {
    document.getElementById("login-overlay").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
}

// ================= STATUS =================
function startPolling() {
    fetchStatus();
    setInterval(fetchStatus, 2000);
}

function fetchStatus() {

    fetch(`${SERVER_URL}/status`, {
        headers: { "Authorization": "Bearer " + authToken }
    })
    .then(r => r.json())
    .then(d => {

        if(Date.now() < lockTimer) return;

        if(d.relays) d.relays.forEach((s,i)=> updateState(i+1,s));
        if(d.master !== undefined) updateState(9,d.master);

        if(d.v) document.getElementById("val-v").innerText = d.v;
        if(d.a) document.getElementById("val-a").innerText = d.a;
        if(d.w) document.getElementById("val-w").innerText = d.w;
        if(d.wh) document.getElementById("val-wh").innerText = d.wh;
        if(d.temp) document.getElementById("val-temp").innerText = d.temp;
        if(d.humi) document.getElementById("val-humi").innerText = d.humi;
    })
    .catch(()=> console.log("Offline"));
}

// ================= CONTROL =================
function sendCommand(id, state) {

    lockTimer = Date.now() + 2000;
    updateState(id, state);

    fetch(`${SERVER_URL}/control?relay=${id}&state=${state}`, {
        headers: { "Authorization": "Bearer " + authToken }
    })
    .catch(()=> alert("Device Not Reachable"));
}

// ================= UI =================
function updateState(id, state) {

    state = Number(state);
    deviceState[id] = state;

    if(id === 9 && state === 0) {
        for(let i=1;i<=8;i++) {
            deviceState[i] = 0;
            document.getElementById(`led-${i}`).classList.remove("on");
            document.getElementById(`btn-${i}`).innerText = "TURN ON";
        }
    }

    const led = document.getElementById(`led-${id}`);
    const btn = document.getElementById(`btn-${id}`);
    if(!led || !btn) return;

    if(state === 1) {
        led.classList.add("on");
        btn.innerText = "TURN OFF";
    } else {
        led.classList.remove("on");
        btn.innerText = "TURN ON";
    }
}

function handleClick(id) {
    const newState = deviceState[id] === 1 ? 0 : 1;
    sendCommand(id, newState);
}

function renderRelays() {
    const container = document.getElementById("relay-grid");
    container.innerHTML = LABELS.map((name,i)=>`
      <div class="relay-item">
        <div><span id="led-${i+1}" class="led"></span> <b>${name}</b></div>
        <button id="btn-${i+1}" class="btn btn-on" onclick="handleClick(${i+1})">TURN ON</button>
      </div>`).join('');
}

// ================= CLOCK =================
setInterval(()=>{
    const c = document.getElementById("clock");
    if(c) c.innerText = new Date().toLocaleTimeString();
},1000);
