const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyS1hY6dxksGIbIkJykHxVP9Gpa9hZMapd2fvv8fPn80RIVvSz5GiyEgu6XW0i4YS8X2Q/exec";

let html5QrCode = null;
let isTorchOn = false;
let currentTrack = null;

// Verification Function
function verifyAndLogId(uniqueId) {
  const resultDiv = document.getElementById("result");
  resultDiv.style.color = "blue";
  resultDiv.innerText = "Checking ID: " + uniqueId + "...";

  fetch(WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uniqueId: uniqueId })
  })
  .then(() => {
    resultDiv.style.color = "green";
    resultDiv.innerText = "Verified & Updated ID: " + uniqueId;
  })
  .catch(error => {
    console.error("Error:", error);
    resultDiv.style.color = "red";
    resultDiv.innerText = "Error updating database!";
  });
}

// Manual Input Handler
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

// Start Camera with Back Camera Forced
function startScanner() {
  html5QrCode = new Html5Qrcode("reader");

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 }
  };

  html5QrCode.start(
    { facingMode: "environment" }, // Forces Back Camera
    config,
    (decodedText) => {
      console.log("Scanned:", decodedText);
      verifyAndLogId(decodedText);
      
      // Pause 3 seconds after a scan
      html5QrCode.pause(true);
      setTimeout(() => {
        html5QrCode.resume();
      }, 3000);
    },
    (errorMessage) => {
      // ignore scanning frame errors
    }
  ).then(() => {
    // Check if flashlight/torch is supported
    applyTorchCapabilities();
  }).catch(err => {
    console.error("Camera open error:", err);
  });
}

// Flashlight toggle
function applyTorchCapabilities() {
  try {
    const videoElement = document.querySelector("#reader video");
    if (videoElement && videoElement.srcObject) {
      const track = videoElement.srcObject.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      if (capabilities.torch) {
        currentTrack = track;
        document.getElementById("torchBtn").style.display = "inline-block";
      }
    }
  } catch (e) {
    console.log("Torch not supported on this device/browser");
  }
}

function toggleTorch() {
  if (currentTrack) {
    isTorchOn = !isTorchOn;
    currentTrack.applyConstraints({
      advanced: [{ torch: isTorchOn }]
    }).then(() => {
      document.getElementById("torchBtn").innerText = isTorchOn ? "Flashlight: ON" : "Flashlight: OFF";
    }).catch(err => console.error("Torch error:", err));
  }
}

// Window load hone par camera shuru karein
window.onload = startScanner;
