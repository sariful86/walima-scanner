const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbztugL1bl5OE1S7CbeVOwpwFvdVP3x12uPCry2YZ2SEpqb3kz06ENI1LUl0OaBmlES01w/exec";

let html5QrCode = null;
let isScanning = false;
let isTorchOn = false;
let videoTrack = null;
let isProcessing = false;
let autoCloseTimer = null;

// Dashboard stats update helper
function updateDashboardStats(totalEntered, remaining, totalScans) {
  document.getElementById("statTotalEntered").innerText = totalEntered || 0;
  document.getElementById("statRemaining").innerText = remaining || 0;
  document.getElementById("statTotalScans").innerText = totalScans || 0;
}

// UPI Style Instant Popup and Auto-Close Handler
function renderGuestData(data) {
  isProcessing = false;

  // Haptic Vibration (Phone vibrate karega scan hote hi)
  if (navigator.vibrate) {
    navigator.vibrate(data.isExceeded ? [100, 50, 100] : 100);
  }

  if (data.success) {
    const isExceeded = data.isExceeded;
    const headerClass = isExceeded ? "danger" : "allow";
    const headerTitle = isExceeded ? "⚠️ CAPACITY EXCEEDED! (লোক বেশি)" : "✅ ENTRY ALLOWED (প্রবেশ অনুমোদিত)";

    let alertMessage = isExceeded 
      ? `<div class="alert-box alert-danger">⛔ ALERT: Limit Se ${data.overLimitBy} Log Extra Aaye Hain!<br>লোক সংখ্যা পার হয়ে গেছে! প্রবেশ আটকান।</div>`
      : `<div class="alert-box alert-success">✅ PASS VERIFIED: Entry Valid (${data.remaining} entry baki hai)</div>`;

    const bodyHtml = `
      <div style="font-size:18px; font-weight:bold; color:#f8fafc; margin-bottom:4px;">${data.guestName}</div>
      <div style="color:#94a3b8; font-size:13px; margin-bottom:10px;">Group: ${data.groupName} | Category: <b>${data.category}</b></div>
      
      <div class="row"><span>Pass ID:</span> <span class="badge">${data.uniqueId}</span></div>
      <div class="row"><span>Allowed Capacity:</span> <b>${data.capacity} Persons</b></div>
      <div class="row" style="border-top:1px solid #334155; padding-top:6px;">
        <span>Live Scan Count (মোট প্রবেশ):</span> 
        <span class="counter-tag" style="color:${isExceeded ? '#f87171' : '#4ade80'};">${data.scanCount} / ${data.capacity}</span>
      </div>
      <div class="row"><span>Entry Time:</span> <small>${data.lastScan}</small></div>

      ${alertMessage}
      <div class="auto-close-info">⚡ Auto-closing in 1.5 seconds...</div>
    `;

    openModal(bodyHtml, headerClass, headerTitle);

    // Agar limit cross nahi hui, toh 1.5 second me UPI ki tarah apne aap band ho jayega
    if (!isExceeded) {
      autoCloseTimer = setTimeout(() => {
        closeModal();
      }, 1500);
    }

  } else {
    openModal(`
      <div style="text-align:center; padding:10px;">
        <p style="color:#f87171; font-size:16px; font-weight:bold; margin-bottom:10px;">${data.message}</p>
        <button class="btn" style="background:#dc2626; color:white;" onclick="closeModal()">Close (✕)</button>
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
  if (autoCloseTimer) clearTimeout(autoCloseTimer);
  if (html5QrCode && isScanning) {
    try { html5QrCode.resume(); } catch(e) {}
  }
}

// Fast UPI style verification request
function verifyId(uniqueId) {
  const cleanId = (uniqueId || "").trim();
  if (!cleanId) return;

  if (isProcessing) return;
  isProcessing = true;

  openModal(
    `<p style="text-align:center; padding:15px; font-weight:bold; color:#38bdf8;">🔍 Verifying: ${cleanId}...</p>`,
    "allow",
    "CHECKING..."
  );

  const targetUrl = `${WEB_APP_URL}?uniqueId=${encodeURIComponent(cleanId)}`;

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
            <p style="color:#f87171; font-size:14px; font-weight:bold;">Connection Error! Internet check karein.</p>
            <button class="btn" style="background:#475569; color:white; margin-top:10px;" onclick="closeModal()">Close</button>
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
    alert("Kripya ID enter karein!");
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
