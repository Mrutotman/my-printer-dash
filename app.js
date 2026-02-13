// ================= STATE MANAGEMENT =================
let authToken = null;
let currentCameraUrl = "";
let myDeviceName = "Unknown";
let deviceState = { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0 };
let pendingId = null;
let pendingState = null;
let lockTimer = 0;
let currentTutPage = 0;

// ================= INITIALIZATION =================
window.onload = () => {

    renderRelays();
    loadStoredLogs();

    const storedToken = localStorage.getItem("auth_token");
    const storedName  = localStorage.getItem("device_name");

    if(storedToken) {
        authToken = storedToken;
        myDeviceName = storedName || "Unknown";
        document.getElementById("display-name").innerText = myDeviceName;
        showDashboard();
        startPolling();
    }
};

// ================= LOGIN SYSTEM =================
function connectSystem() {

    const user = document.getElementById("mqtt-user").value;
    const pass = document.getElementById("mqtt-pass").value;
    const name = document.getElementById("device-name").value || "Unknown";

    if(!user || !pass) return alert("Credentials Required");

    fetch(`${DEVICE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass })
    })
    .then(r => r.json())
    .then(data => {

        if(!data.token) return alert("Login Failed");

        authToken = data.token;
        myDeviceName = name;

        localStorage.setItem("auth_token", authToken);
        localStorage.setItem("device_name", myDeviceName);

        document.getElementById("display-name").innerText = myDeviceName;
        showDashboard();
        startPolling();
    })
    .catch(()=> alert("Device Not Reachable"));
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

// ================= STATUS POLLING =================
function startPolling() {
    fetchStatus();
    setInterval(fetchStatus, 2000);
}

function fetchStatus() {

    fetch(`${DEVICE_URL}/status`, {
        headers: { "Authorization": "Bearer " + authToken }
    })
    .then(r => r.json())
    .then(d => {

        if (Date.now() < lockTimer) return;

        if(d.relays) d.relays.forEach((s,i)=> updateState(i+1,s));
        if(d.master !== undefined) updateState(9,d.master);

        if(d.v) ['v','a','w','wh'].forEach(k=>{
            const el = document.getElementById(`val-${k}`);
            if(el) el.innerText = d[k];
        });

        if(d.temp) document.getElementById("val-temp").innerText = d.temp;
        if(d.humi) document.getElementById("val-humi").innerText = d.humi;
    })
    .catch(()=> console.log("Offline"));
}

// ================= SEND COMMAND =================
function sendCommand(id, state) {

    lockTimer = Date.now() + 2000;
    updateState(id, state);

    fetch(`${DEVICE_URL}/control?relay=${id}&state=${state}`, {
        headers: { "Authorization": "Bearer " + authToken }
    })
    .catch(()=> alert("Device Not Reachable"));

    broadcastLog(state ? "ON" : "OFF", getDeviceName(id));
}

// ================= UI & CONTROLS =================
function updateState(id, state) {

    state = Number(state);
    deviceState[id] = state;

    if (id === 9 && state === 0) {
        for (let i = 1; i <= 8; i++) {
            deviceState[i] = 0;
            const subLed = document.getElementById(`led-${i}`);
            const subBtn = document.getElementById(`btn-${i}`);
            if (subLed && subBtn) {
                subLed.classList.remove("on");
                subBtn.innerText = "TURN ON";
                subBtn.className = "btn btn-on";
            }
        }
    }

    const led = document.getElementById(`led-${id}`);
    const btn = document.getElementById(`btn-${id}`);
    if(!led || !btn) return;

    if (state === 1) {
        led.classList.add("on");
        btn.innerText = "TURN OFF";
        btn.className = "btn btn-off";
        if(id === 9) document.getElementById("panel-lock").classList.remove("disabled");
    } else {
        led.classList.remove("on");
        btn.innerText = "TURN ON";
        btn.className = "btn btn-on";
        if(id === 9) document.getElementById("panel-lock").classList.add("disabled");
    }
}

function handleClick(id) {

    const currentState = deviceState[id];
    const newState = currentState === 1 ? 0 : 1;
    const name = getDeviceName(id);

    pendingId = id;
    pendingState = newState;

    if(newState === 1) {
        sendCommand(id, 1);
        return;
    }

    const msg = document.getElementById("confirm-msg");
    const input = document.getElementById("confirm-input");

    if(id === 9) {
        msg.innerHTML = `Type <b>CONFIRM</b> to kill <b>${name}</b>`;
        input.style.display = "block";
        input.value = "";
    } else {
        msg.innerHTML = `Turn off <b>${name}</b>?`;
        input.style.display = "none";
    }

    openModal("confirm-modal");
}

function executeOff() {
    if(pendingId === 9) {
        const txt = document.getElementById("confirm-input").value;
        if(txt !== "CONFIRM") return alert("Please type CONFIRM");
    }
    sendCommand(pendingId, pendingState);
    closeModal("confirm-modal");
}

// ================= UTILITIES =================
function getDeviceName(id) {
    return id === 9 ? "Main System Bus" : LABELS[id - 1] || "Unknown";
}

function renderRelays() {
    const container = document.getElementById("relay-grid");
    container.innerHTML = LABELS.map((name, i) => `
      <div class="relay-item">
        <div><span id="led-${i+1}" class="led"></span> <b>${name}</b></div>
        <button id="btn-${i+1}" class="btn btn-on" onclick="handleClick(${i+1})">TURN ON</button>
      </div>`).join('');
}

function updateCameraSource(url) {
    if(!url || url === currentCameraUrl) return;
    currentCameraUrl = url;
    document.getElementById("cam-stream").src = url;
}

function saveConfig() {
    let newUrl = document.getElementById("stream-input").value.trim();
    if(!newUrl.startsWith("https://")) return alert("Link must start with https://");
    document.getElementById("cam-stream").src = newUrl;
    alert("Camera Updated");
}

// ================= LOGGING =================
function displayLog(data) {
    const tbody = document.getElementById("log-body");
    const row = `<tr><td>${data.date || "---"}</td><td>${data.time}</td><td>${data.by}</td><td>${data.action}</td><td>${data.target}</td></tr>`;
    tbody.insertAdjacentHTML("afterbegin", row);
    if (tbody.rows.length > 50) tbody.deleteRow(50);
}

function loadStoredLogs() {
    const stored = JSON.parse(localStorage.getItem("activity_logs") || "[]");
    stored.forEach(log => {
        const tbody = document.getElementById("log-body");
        tbody.insertAdjacentHTML("beforeend", `<tr><td>${log.date || "---"}</td><td>${log.time}</td><td>${log.by}</td><td>${log.action}</td><td>${log.target}</td></tr>`);
    });
}

function broadcastLog(action, target) {
    const logData = { date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(), by: myDeviceName, action: action, target: target };
    displayLog(logData);
    let logs = JSON.parse(localStorage.getItem("activity_logs") || "[]");
    logs.unshift(logData);
    localStorage.setItem("activity_logs", JSON.stringify(logs.slice(0,50)));
}

// ================= MODALS & TUTORIAL =================
function openModal(id) { 
    if(id === 'tutorial-modal') { currentTutPage = 0; renderTutorial(); }
    document.getElementById(id).style.display = "flex"; 
}

function closeModal(id) { 
    document.getElementById(id || "confirm-modal").style.display = "none"; 
    pendingId = null;
}

function renderTutorial() {
    const data = tutorialData[currentTutPage];
    const imgEl = document.getElementById("tut-image-display");
    document.getElementById("tut-title-text").innerText = data.title;
    document.getElementById("tut-content-area").innerHTML = data.content;
    document.getElementById("tut-page-indicator").innerText = `${currentTutPage + 1}/${tutorialData.length}`;
    imgEl.src = data.img || "";
    imgEl.style.display = data.img ? "block" : "none";
    document.getElementById("btn-prev").disabled = (currentTutPage === 0);
    document.getElementById("btn-next").innerText = (currentTutPage === tutorialData.length - 1) ? "Finish" : "Next";
}

function changeTutorialPage(dir) {
    if (dir === 1 && currentTutPage === tutorialData.length - 1) return closeModal('tutorial-modal');
    currentTutPage = Math.max(0, Math.min(tutorialData.length - 1, currentTutPage + dir));
    renderTutorial();
}

setInterval(() => {
    const c = document.getElementById("clock");
    if(c) c.innerText = new Date().toLocaleTimeString();
}, 1000);
