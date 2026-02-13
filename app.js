// ================= STATE MANAGEMENT =================
const CLIENT_ID = "web_" + Math.random().toString(16).substr(2, 8);
let client = null;
let currentCameraUrl = "";
let myDeviceName = "Unknown";
let deviceState = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 }; 
let pendingId = null; 
let pendingState = null;
let lockTimer = 0; 
let currentTutPage = 0;

// ================= INITIALIZATION =================
window.onload = () => {
    renderRelays();
    loadStoredLogs(); 

    const u = localStorage.getItem("mq_u");
    const p = localStorage.getItem("mq_p");
    const d = localStorage.getItem("mq_d"); 
  
    if(u && p) { 
        document.getElementById("mqtt-user").value = u;
        document.getElementById("mqtt-pass").value = p;
        if(d) document.getElementById("device-name").value = d;
        connectSystem();
    }
};

// ================= MQTT CORE =================
function connectSystem() {
    const u = document.getElementById("mqtt-user").value;
    const p = document.getElementById("mqtt-pass").value;
    const d = document.getElementById("device-name").value || "Unknown Device";
  
    if(!u || !p) return alert("Credentials Required");

    myDeviceName = d;
    document.getElementById("display-name").innerText = myDeviceName;

    if(document.getElementById("remember-me").checked) {
        localStorage.setItem("mq_u", u);
        localStorage.setItem("mq_p", p);
        localStorage.setItem("mq_d", d);
    }

    client = new Paho.MQTT.Client("wss://" + MQTT_HOST + ":" + MQTT_PORT + "/mqtt", CLIENT_ID);
    client.onMessageArrived = onMessage;
  
    client.connect({
        useSSL: true, userName: u, password: p,
        onSuccess: () => {
            document.getElementById("login-overlay").style.display = "none";
            document.getElementById("dashboard").style.display = "block";
            client.subscribe("/printer_01/status");
            client.subscribe("/printer_01/logs"); 
            client.subscribe("/printer_01/sync");
            client.subscribe("/printer_01/config/camera");
        },
        onFailure: (e) => alert("Connection Failed: " + e.errorMessage)
    });
}

function onMessage(m) {
    const topic = m.destinationName;
    const payload = m.payloadString;

    if (topic === "/printer_01/config/camera") {
        updateCameraSource(payload);
        return;
    }
    if (topic === "/printer_01/logs") {
        try { displayLog(JSON.parse(payload)); } catch(e) {}
        return;
    }
  
    try {
        const d = JSON.parse(payload);
        if (Date.now() < lockTimer && d.master === undefined && d.relay !== 9) return;

        if (topic === "/printer_01/sync") {
            if(d.by !== myDeviceName) updateState(d.relay, d.state);
            return;
        }

        if(d.relays) d.relays.forEach((s, i) => updateState(i+1, s));
        if(d.master !== undefined) updateState(9, d.master);
    
        if(d.v) ['v','a','w','wh'].forEach(k => {
            const el = document.getElementById(`val-${k}`);
            if(el) el.innerText = d[k];
        });
        if(d.temp) document.getElementById("val-temp").innerText = d.temp;
        if(d.humi) document.getElementById("val-humi").innerText = d.humi;
    } catch(e) { console.error(e); }
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

function sendCommand(id, state) {
    lockTimer = Date.now() + 2000; 
    updateState(id, state); 
  
    const payloadObj = { relay: id, state: state, by: myDeviceName };
    const payloadStr = JSON.stringify(payloadObj);

    const msgCommand = new Paho.MQTT.Message(payloadStr);
    msgCommand.destinationName = "/printer_01/commands";
    client.send(msgCommand);

    const msgSync = new Paho.MQTT.Message(payloadStr);
    msgSync.destinationName = "/printer_01/sync"; 
    client.send(msgSync);

    broadcastLog(state ? "ON" : "OFF", getDeviceName(id));
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
    if(newUrl.endsWith("/")) newUrl = newUrl.slice(0, -1);
    if(!newUrl.includes("/stream")) newUrl += "/stream";

    if(!newUrl.startsWith("https://")) return alert("Link must start with https://");

    if(client && client.isConnected()) {
        const msg = new Paho.MQTT.Message(newUrl);
        msg.destinationName = "/printer_01/config/camera";
        msg.retained = true; 
        client.send(msg);
        alert("Link Saved & Synced!");
        closeModal('config-modal');
    }
}

// ================= LOGGING =================
function displayLog(data) {
    const tbody = document.getElementById("log-body");
    const row = `<tr><td>${data.date || "---"}</td><td>${data.time}</td><td style="color:#666; font-weight:bold;">${data.by}</td><td>${data.action}</td><td>${data.target}</td></tr>`;
    tbody.insertAdjacentHTML("afterbegin", row);
    if (tbody.rows.length > 50) tbody.deleteRow(50);
    
    let logs = JSON.parse(localStorage.getItem("activity_logs") || "[]");
    logs.unshift(data);
    localStorage.setItem("activity_logs", JSON.stringify(logs.slice(0, 50)));
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
    const message = new Paho.MQTT.Message(JSON.stringify(logData));
    message.destinationName = "/printer_01/logs"; 
    client.send(message);
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

function doLogout() {
    localStorage.removeItem("mq_u"); localStorage.removeItem("mq_p");
    location.reload();
}

setInterval(() => {
    document.getElementById("clock").innerText = new Date().toLocaleTimeString();
}, 1000);