// ================= CONFIGURATION & CONSTANTS =================
const MQTT_HOST = "143fa294384e4a2fa42c7bfe8a7ebd1d.s1.eu.hivemq.cloud";
const MQTT_PORT = 80;
const LABELS = ["Printer 1", "Printer 2", "Printer 3", "Printer 4", "Light Bulb 1", "Light Bulb 2", "Free 1", "Free 2"];

const tutorialData = [
    {
        title: "1. SYSTEM ARCHITECTURE",
        img: "https://via.placeholder.com/600x300/4CAF50/ffffff?text=Dashboard+Layout+Overview", 
        content: `<p>Welcome to the <b>Smart Mezza Control System</b>. This interface communicates via MQTT to your ESP32 controller at the PUP EE Laboratory.</p>
                  <div class="tut-step"><b>Master Power (System Bus):</b> This is the gatekeeper. When OFF, it physically disconnects the relay bank.</div>`
    },
    {
        title: "2. MAIN HOST: ESP32",
        img: "https://via.placeholder.com/600x300/2d2d2d/ffffff?text=ESP32+Pinout+&+Relay+Logic",
        content: `<p>The brain of the Smart Mezza is an <b>ESP32 DevKit V1</b>. It manages the relay logic and MQTT communication.</p>
                  <div class="tut-warn">⚠️ VOLTAGE: Never connect the AC mains directly to the ESP32 pins.</div>`
    },
    {
        title: "3. LIVE FEED: ESP32-CAM",
        img: "https://via.placeholder.com/600x300/1a1a1a/ffffff?text=ESP32-CAM+Wiring+&+Power",
        content: `<p>A separate <b>ESP32-CAM</b> module provides the live video stream.</p>`
    },
    {
        title: "4. SAFETY & SHUTDOWN",
        img: "https://via.placeholder.com/600x300/f44336/ffffff?text=Two-Step+Shutdown+Logic",
        content: `<p>To prevent accidental print failures, we have implemented a <b>Two-Step Safety Protocol</b>.</p>`
    },
    {
        title: "5. CLOUD CAMERA SETUP",
        img: "https://via.placeholder.com/600x300/333333/ffffff?text=Cloudflare+Tunnel+Guide",
        content: `<p>The live feed uses a secure Cloudflare Tunnel.</p>
                  <code class="code-block">cloudflared tunnel --url http://[ESP32_IP]:80</code>`
    },
    {
        title: "6. POWER MONITORING",
        img: "https://via.placeholder.com/600x300/2196F3/ffffff?text=PZEM-004T+Data+Reading",
        content: `<p>The <b>PZEM-004T</b> module tracks high-voltage metrics from the printer bus.</p>`
    },
    {
        title: "7. ACTIVITY AUDITING",
        img: "https://via.placeholder.com/600x300/777777/ffffff?text=Security+Activity+Logs",
        content: `<p>Security is maintained through the <b>Activity Log</b>. Actions are tagged with your <b>Device Name</b>.</p>`
    }
];
