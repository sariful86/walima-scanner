const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyS1hY6dxksGIbIkJykHxVP9Gpa9hZMapd2fvv8fPn80RIVvSz5GiyEgu6XW0i4YS8X2Q/exec";

let html5QrCode = null;
let isTorchOn = false;
let currentTrack = null;
let isScanning = false;

// Mode Switch (Manual vs Scanner)
function switchMode(mode) {
  const manualSec = document.getElementById("manualSection");
  const scannerSec = document.getElementById("scannerSection");
  const tabManual = document.getElementById("btnTabManual");
  const tabScanner = document.getElementById("btnTabScanner");
  const resultDiv = document.getElementById("result");
  resultDiv.innerText = "";

  if (mode === 'manual') {
    manualSec.classList.add("visible");
    scannerSec.classList.remove("visible");
    tabManual.classList.add("active");
    tabScanner.classList.remove("active");
    if (isScanning) stopScanner(); // Manual par aane par camera band
  } else {
    scannerSec.classList.add("visible");
    manualSec.classList.remove("visible");
    tabScanner.classList.add("active");
    tabManual.classList.remove("active");
  }
}

// Verification Logic
function verifyAndLogId(uniqueId) {
  const resultDiv = document.getElementById("result");
  resultDiv.style.backgroundColor = "#e8f0fe";
  resultDiv.style.color = "#1a73e8";
  resultDiv.innerText = "⏳ Checking ID: " + uniqueId + "...";

  fetch(WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uniqueId: uniqueId })
  })
  .then(() => {
    resultDiv.style.backgroundColor = "#e6f4ea";
    resultDiv.style.color = "#137333";
    resultDiv.innerText = "✅ Verified & Entry Logged: " + uniqueId;
  })
  .catch(error => {
    console.error("Error:", error);
    resultDiv.style.backgroundColor = "#fce8e6";
    resultDiv.style.color = "#c5221f";
    resultDiv.innerText = "❌ Error connecting to database!";
  });
}

// Manual Form Submit
function handleManualSubmit() {
  const inputField = document.getElementById("manualIdInput");
  const uniqueId = inputField.value.trim();
  if (!uniqueId) {
    alert("Please enter a valid Unique ID!");
    return;
  }
  verifyAndLogId(uniqueId);
  inputField.value = "";
}

// Start Back Camera
function startScanner() {
  if (isScanning) return;

  html5QrCode = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  html5QrCode.start(
    { facingMode: "environment" },
    config,
    (decodedText) => {
      verifyAndLogId(decodedText);
      html5QrCode.pause(true);
      setTimeout(() => {
        if (isScanning) html5QrCode.resume();
      }, 3000);
    },
    () => {}
  ).then(() => {
    isScanning = true;
    document.getElementById("startScanBtn").style.display = "none";
    document.getElementById("stopScanBtn").style.display = "inline-block";
    applyTorchCapabilities();
  }).catch(err => {
    console.error("Camera error:", err);
    alert("Camera permission denied or camera not found!");
  });
}

// Stop Camera
function stopScanner() {
  if (html5QrCode && isScanning) {
    html5QrCode.stop().then(() => {
      isScanning = false;
      document.getElementById("startScanBtn").style.display = "inline-block";
      document.getElementById("stopScanBtn").style.display = "none";
      document.getElementById("torchBtn").style.display = "none";
      document.getElementById("reader").innerHTML = "";
    }).catch(err => console.error(err));
  }
}

// Flashlight toggle
function applyTorchCapabilities() {
  try {
    const video = document.querySelector("#reader video");
    if (video && video.srcObject) {
      const track = video.srcObject.getVideoTracks()[0];
      if (track.getCapabilities().torch) {
        currentTrack = track;
        document.getElementById("torchBtn").style.display = "inline-block";
      }
    }
  } catch (e) {}
}

function toggleTorch() {
  if (currentTrack) {
    isTorchOn = !isTorchOn;
    currentTrack.applyConstraints({ advanced: [{ torch: isTorchOn }] })
      .then(() => {
        document.getElementById("torchBtn").innerText = isTorchOn ? "Flashlight: ON" : "Flashlight: OFF";
      });
  }
}
