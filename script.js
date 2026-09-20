const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbztugL1bl5OE1S7CbeVOwpwFvdVP3x12uPCry2YZ2SEpqb3kz06ENI1LUl0OaBmlES01w/exec";

let html5QrCode = null;
let isScanning = false;
let isTorchOn = false;
let videoTrack = null;
let isProcessing = false;
let autoCloseTimer = null;

function toggleMenu(open) {
  document.getElementById("sideDrawer").style.width = open ? "280px" : "0";
}

// Update dashboard stats & group list
function updateDashboard(data) {
  if (!data) return;
  document.getElementById("statTotalEntered").innerText = data.totalArrived || 0;
  document.getElementById("statRemaining").innerText = data.totalRemaining || 0;
  document.getElementById("statTotalScans").innerText = data.totalScans || 0;

  document.getElementById("dashInvited").innerText = (data.totalArrived || 0) + (data.totalRemaining || 0);
  document.getElementById("dashArrived").innerText = data.totalArrived || 0;
  document.getElementById("dashRemaining").innerText = data.totalRemaining || 0;

  if (data.groups && Array.isArray(data.groups)) {
    let html = "";
    data.groups.forEach(g => {
      html += `<div style="display:flex; justify-content:space-between; margin-bottom:6px; border-bottom:1px dashed #334155; padding-bottom:4px;">
        <span><b>${g.name}</b></span>
        <span><b style="color:#4ade80;">${g.arrived}</b> / ${g.total}</span>
      </div>`;
    });
    document.getElementById("groupBreakdown").innerHTML = html;
  }
}

// Render guest data with bright highlighted text
function renderGuestData(data) {
  isProcessing = false;

  if (navigator.vibrate) {
    navigator.vibrate(data.isExceeded ? [100, 50, 100] : 100);
  }

  if (data.success) {
    updateDashboard(data.dashboard);
    const isExceeded = data.isExceeded;
    const headerClass = isExceeded ? "danger" : "allow";
    const headerTitle = isExceeded ? "⚠️ CAPACITY EXCEEDED!" : "✅ ENTRY ALLOWED (प्रবেশ অনুমোদিত)";

    let alertMessage = isExceeded 
      ? `<div class="alert-box alert-danger">⛔ ALERT: ${data.overLimitBy} Extra Persons Beyond Limit!</div>`
      : `<div class="alert-box alert-success">✅ PASS VERIFIED: Valid Entry (${data.remaining} seats left)</div>`;

    const bodyHtml = `
      <div style="font-size:20px; font-weight:900; color:#0f172a; margin-bottom:6px; background:#f1f5f9; padding:8px; border-radius:6px; text-align:center; border: 1px solid #cbd5e1;">${data.guestName}</div>
      <div style="color:#475569; font-size:13px; margin-bottom:10px; text-align:center;">Group: <b>${data.groupName}</b> | Category: <b>${data.category}</b></div>
      
      <div class="row"><span>Pass ID:</span> <span class="badge">${data.uniqueId}</span></div>
      <div class="row"><span>Allowed Capacity:</span> <b>${data.capacity} Persons</b></div>
      <div class="row" style="border-top:1px solid #e2e8f0; padding-top:6px;">
        <span>Live Scan Count:</span> 
        <span class="counter-tag" style="color:${isExceeded ? '#dc2626' : '#16a34a'};">${data.scanCount} / ${data.capacity}</span>
      </div>
      <div class="row"><span>Entry Time:</span> <small>${data.lastScan}</small></div>

      ${alertMessage}
      <div class="auto-close-info">⚡ Auto-closing in 1.5 seconds...</div>
    `;

    openModal(bodyHtml, headerClass, headerTitle);

    if (!isExceeded) {
      autoCloseTimer = setTimeout(() => {
        closeModal();
      }, 1500);
    }

  } else {
    openModal(`
      <div style="text-align:center; padding:10px;">
        <p style="color:#dc2626; font-size:16px; font-weight:bold; margin-bottom:10px;">${data.message}</p>
        <button class="btn" style="background:#dc2626; color:white;" onclick="closeModal()">Close (✕)</button>
      </div>
    `, "error", "❌ NOT FOUND");
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

function verifyId(uniqueId) {
  const cleanId = (uniqueId || "").trim();
  if (!cleanId) return;

  if (isProcessing) return;
  isProcessing = true;

  openModal(
    `<p style="text-align:center; padding:15px; font-weight:bold; color:#0284c7;">🔍 Verifying: ${cleanId}...</p>`,
    "allow",
    "CHECKING..."
  );

  const oldScript = document.getElementById("jsonp_script");
  if (oldScript) oldScript.remove();

  const script = document.createElement("script");
  script.id = "jsonp_script";
  script.src = `${WEB_APP_URL}?uniqueId=${encodeURIComponent(cleanId)}&callback=handleScannerResponse`;

  script.onerror = function() {
    isProcessing = false;
    openModal(`
      <div style="text-align:center; padding:10px;">
        <p style="color:#dc2626; font-size:14px; font-weight:bold;">Connection Error! Check internet.</p>
        <button class="btn" style="background:#475569; color:white; margin-top:10px;" onclick="closeModal()">Close</button>
      </div>
    `, "error", "ERROR");
  };

  document.body.appendChild(script);
}

function submitManual() {
  const input = document.getElementById("manualId");
  const val = input.value.trim();
  if (!val) {
    alert("Please enter Pass ID!");
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
    alert("Camera permission required.");
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
