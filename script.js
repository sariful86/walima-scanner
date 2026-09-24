const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxOxCSVr1r2jHB5H_lHoGhqSninwyDyNqcFyLo9w9kEIlxSKEyS1xY6XvqNbdyZuE3I0w/exec";

let html5QrCode = null;
let isScanning = false;
let isTorchOn = false;
let videoTrack = null;
let isProcessing = false;

// Guest Verification Result Popup
function renderGuestData(data) {
  isProcessing = false;

  if (data.success) {
    const isExceeded = data.isExceeded;
    const headerClass = isExceeded ? "danger" : "allow";
    const headerTitle = isExceeded ? "⚠️ CAPACITY EXCEEDED! (লোক বেশি)" : "✅ ENTRY ALLOWED (প্রবেশ অনুমোদিত)";

    let alertMessage = isExceeded 
      ? `<div class="alert-box alert-danger">⛔ ALERT: Limit Se ${data.overLimitBy} Extra Log Aaye Hain!<br>লোক সংখ্যা পার হয়ে গেছে! প্রবেশ আটকান।</div>`
      : `<div class="alert-box alert-success">✅ PASS VERIFIED: Entry Valid (${data.remaining} entry baki hai)</div>`;

    const bodyHtml = `
      <div style="font-size:18px; font-weight:bold; color:#1a202c; margin-bottom:4px;">${data.guestName}</div>
      <div style="color:#718096; font-size:13px; margin-bottom:10px;">Group: ${data.groupName} | Category: <b>${data.category}</b></div>
      
      <div class="row"><span>Pass ID:</span> <span class="badge">${data.uniqueId}</span></div>
      <div class="row"><span>Allowed Capacity:</span> <b>${data.capacity} Persons</b></div>
      <div class="row" style="border-top:1px solid #edf2f7; padding-top:6px;">
        <span>Live Scan Count (মোট প্রবেশ):</span> 
        <span class="counter-tag" style="color:${isExceeded ? '#c53030' : '#276749'};">${data.scanCount} / ${data.capacity}</span>
      </div>
      <div class="row"><span>Entry Time:</span> <small>${data.lastScan}</small></div>

      ${alertMessage}

      <button class="btn-next" onclick="closeModal()">Next Scan / পরবর্তী স্ক্যান (✖)</button>
    `;

    openModal(bodyHtml, headerClass, headerTitle);
  } else {
    openModal(`
      <div style="text-align:center; padding:10px;">
        <p style="color:#c53030; font-size:16px; font-weight:bold;">${data.message}</p>
        <button class="btn-next" style="background:#e53e3e;" onclick="closeModal()">Close (✖)</button>
      </div>
    `, "error", "❌ NOT FOUND / পাওয়া যায়নি");
  }
}

window.handleScannerResponse = function(data) {
  renderGuestData(data);
};

function switchView(mode) {
  closeModal();
  if (mode === 'camera') {
    document.getElementById("panelCamera").classList.add("active");
    document.getElementById("panelManual").classList.remove("active");
    document.getElementById("tabCamera").classList.add("active");
    document.getElementById("tabManual").classList.remove("active");
  } else {
    document.getElementById("panelManual").classList.add("active");
    document.getElementById("panelCamera").classList.remove("active");
    document.getElementById("tabManual").classList.add("active");
    document.getElementById("tabCamera").classList.remove("active");
    if (isScanning) stopScanner();
  }
}

function openModal(htmlContent, headerClass, headerTitle) {
  const modal = document.getElementById("verifyModal");
  const modalHeader = document.getElementById("modalHeader");
  const modalStatusText = document.getElementById("modalStatusText");
  const modalContent = document.getElementById("modalContent");

  modalHeader.className = "modal-header " + headerClass;
  modalStatusText.innerText = headerTitle;
  modalContent.innerHTML = htmlContent;
  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("verifyModal").style.display = "none";
  isProcessing = false;
  if (html5QrCode && isScanning) {
    try { html5QrCode.resume(); } catch(e) {}
  }
}

// Database Se Check Karne Ka Function
function verifyId(uniqueId) {
  const cleanId = (uniqueId || "").trim();
  if (!cleanId) return;

  if (isProcessing) return;
  isProcessing = true;

  openModal(
    `<p style="text-align:center; padding:20px; font-weight:bold; color:#2b6cb0;">🔍 Checking ID: ${cleanId}...<br><small>যাচাই করা হচ্ছে...</small></p>`,
    "allow",
    "CHECKING..."
  );

  const targetUrl = `${WEB_APP_URL}?uniqueId=${encodeURIComponent(cleanId)}`;

  // Direct Fetch try karega, agar block hua toh JSONP inject karega
  fetch(targetUrl)
    .then(res => res.json())
    .then(data => renderGuestData(data))
    .catch(() => {
      const oldScript = document.getElementById("jsonp_script");
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.id = "jsonp_script";
      script.src = `${targetUrl}&callback=handleScannerResponse`;

      script.onerror = function() {
        isProcessing = false;
        openModal(`
          <div style="text-align:center; padding:10px;">
            <p style="color:#c53030; font-size:15px; font-weight:bold;">Server connection error.<br><small>Script deployment ya Internet check karein.</small></p>
            <button class="btn-next" style="background:#4a5568;" onclick="closeModal()">Close (✖)</button>
          </div>
        `, "error", "ERROR");
      };

      document.body.appendChild(script);
    });
}

function submitManual() {
  const input = document.getElementById("manualId");
  const val = input.value.trim();
  if (!val) {
    alert("Kripya ID enter karein / একটি আইডি লিখুন!");
    return;
  }
  verifyId(val);
  input.value = "";
}

function startScanner() {
  if (isScanning) return;
  html5QrCode = new Html5Qrcode("reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      if (!isProcessing) {
        try { html5QrCode.pause(true); } catch(e) {}
        verifyId(decodedText);
      }
    },
    () => {}
  ).then(() => {
    isScanning = true;
    document.getElementById("startCamBtn").style.display = "none";
    document.getElementById("stopCamBtn").style.display = "inline-block";
    checkTorch();
  }).catch(err => {
    console.error(err);
    alert("Camera permission allow karein.");
  });
}

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
        document.getElementById("torchBtn").innerText = isTorchOn ? "Torch: ON" : "Torch: OFF";
      });
  }
}
