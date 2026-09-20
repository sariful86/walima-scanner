const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbztugL1bl5OE1S7CbeVOwpwFvdVP3x12uPCry2YZ2SEpqb3kz06ENI1LUl0OaBmlES01w/exec";

let html5QrCode = null;
let isScanning = false;
let isTorchOn = false;
let videoTrack = null;

// Tab Switch Karne Ka Function
function switchView(mode) {
  document.getElementById("resultBox").style.display = "none";
  if (mode === 'manual') {
    document.getElementById("panelManual").classList.add("active");
    document.getElementById("panelCamera").classList.remove("active");
    document.getElementById("tabManual").classList.add("active");
    document.getElementById("tabCamera").classList.remove("active");
    if (isScanning) stopScanner();
  } else {
    document.getElementById("panelCamera").classList.add("active");
    document.getElementById("panelManual").classList.remove("active");
    document.getElementById("tabCamera").classList.add("active");
    document.getElementById("tabManual").classList.remove("active");
  }
}

// Database Se ID Check Aur Details Show Karne Ka Function
function verifyId(uniqueId) {
  const box = document.getElementById("resultBox");
  box.className = "card-box success";
  box.style.display = "block";
  box.innerHTML = `<p style="text-align:center; color:#2b6cb0; font-weight:bold;">🔍 Checking ID: ${uniqueId} ...<br><small>যাচাই করা হচ্ছে...</small></p>`;

  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ uniqueId: uniqueId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      box.className = "card-box success";
      box.innerHTML = `
        <div class="card-title">✅ ${data.groupName}</div>
        <div class="row"><span>Pass ID:</span> <span class="badge">${data.uniqueId}</span></div>
        <div class="row"><span>Adults / বড় মানুষ:</span> <b>${data.adults} Jon</b></div>
        <div class="row"><span>Kids / বাচ্চা:</span> <b>${data.kids} Jon</b></div>
        <div class="row" style="border-top:1.5px solid #cbd5e0; padding-top:5px; margin-top:5px;">
          <span><b>Total Capacity / মোট লোক:</b></span> <span style="color:#22543d; font-size:16px;"><b>${data.total} Persons</b></span>
        </div>
        <div class="row"><span>Scan Count / স্ক্যান হয়েছে:</span> <b>${data.scanCount} bar</b></div>
        <div class="row"><span>Entry Time / সময়:</span> <small>${data.lastScan}</small></div>
      `;
    } else {
      box.className = "card-box error";
      box.innerHTML = `
        <div class="card-title" style="color:#c53030;">❌ Not Found / পাওয়া যায়নি</div>
        <p>${data.message || "Invalid Pass ID / এই পাসটি সঠিক নয়!"}</p>
      `;
    }
  })
  .catch(err => {
    console.error(err);
    box.className = "card-box error";
    box.innerHTML = `
      <div class="card-title" style="color:#c53030;">❌ Connection Error</div>
      <p>Sheet connect karne me dikkat aayi. Internet check karein.</p>
    `;
  });
}

// Manual Form Submit Handler
function submitManual() {
  const input = document.getElementById("manualId");
  const val = input.value.trim();
  if (!val) {
    alert("Kripya ek Unique ID enter karein / একটি আইডি লিখুন!");
    return;
  }
  verifyId(val);
  input.value = "";
}

// Back Camera Shuru Karne Ka Function
function startScanner() {
  if (isScanning) return;
  html5QrCode = new Html5Qrcode("reader");

  html5QrCode.start(
    { facingMode: "environment" }, // Back Camera Force Karega
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      verifyId(decodedText);
      html5QrCode.pause(true);
      setTimeout(() => { if (isScanning) html5QrCode.resume(); }, 3500);
    },
    () => {}
  ).then(() => {
    isScanning = true;
    document.getElementById("startCamBtn").style.display = "none";
    document.getElementById("stopCamBtn").style.display = "inline-block";
    checkTorch();
  }).catch(err => {
    console.error("Camera Error:", err);
    alert("Camera chalu nahi hua. Browser me camera permission 'Allow' karein.");
  });
}

// Camera Band Karne Ka Function
function stopScanner() {
  if (html5QrCode && isScanning) {
    html5QrCode.stop().then(() => {
      isScanning = false;
      document.getElementById("startCamBtn").style.display = "inline-block";
      document.getElementById("stopCamBtn").style.display = "none";
      document.getElementById("torchBtn").style.display = "none";
      document.getElementById("reader").innerHTML = "";
    });
  }
}

// Flashlight / Torch Check Karne Ka Function
function checkTorch() {
  try {
    const video = document.querySelector("#reader video");
    if (video && video.srcObject) {
      videoTrack = video.srcObject.getVideoTracks()[0];
      if (videoTrack.getCapabilities().torch) {
        document.getElementById("torchBtn").style.display = "inline-block";
      }
    }
  } catch (e) {}
}

function toggleTorch() {
  if (videoTrack) {
    isTorchOn = !isTorchOn;
    videoTrack.applyConstraints({ advanced: [{ torch: isTorchOn }] })
      .then(() => {
        document.getElementById("torchBtn").innerText = isTorchOn ? "Flashlight: ON" : "Flashlight: OFF";
      });
  }
}
