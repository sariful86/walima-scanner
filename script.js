const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbztugL1bl5OE1S7CbeVOwpwFvdVP3x12uPCry2YZ2SEpqb3kz06ENI1LUl0OaBmlES01w/exec";

let html5QrCode = null;
let isScanning = false;
let isTorchOn = false;
let videoTrack = null;

// Tab Switch
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

// Modal popup open
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

// Modal popup close
function closeModal() {
  document.getElementById("verifyModal").style.display = "none";
  // Agar scanner chal raha ho toh resume karo
  if (html5QrCode && isScanning) {
    try { html5QrCode.resume(); } catch(e) {}
  }
}

// Database Verify Function (Sheet2 Realtime)
function verifyId(uniqueId) {
  openModal(
    `<p style="text-align:center; padding:20px; font-weight:bold; color:#2b6cb0;">🔍 Checking ID: ${uniqueId}...<br><small>ডাটাবেস চেক করা হচ্ছে...</small></p>`,
    "allow",
    "CHECKING..."
  );

  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ uniqueId: uniqueId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const isExceeded = data.isExceeded;
      const headerClass = isExceeded ? "danger" : "allow";
      const headerTitle = isExceeded ? "⚠️ CAPACITY EXCEEDED! (লোক বেশি)" : "✅ ENTRY ALLOWED (প্রবেশ অনুমোদিত)";

      let alertMessage = "";
      if (isExceeded) {
        alertMessage = `
          <div class="alert-box alert-danger">
            ⛔ ALERT: Is Card Par Limit Se ${data.overLimitBy} Extra Log Aaye Hain!<br>
            লোক সংখ্যা পার হয়ে গেছে! প্রবেশ আটকান।
          </div>`;
      } else {
        alertMessage = `
          <div class="alert-box alert-success">
            ✅ PASS VERIFIED: Entry Valid (${data.remaining} entry baki hai)
          </div>`;
      }

      const bodyHtml = `
        <div style="font-size:19px; font-weight:bold; color:#1a202c; margin-bottom:5px;">${data.guestName}</div>
        <div style="color:#718096; font-size:13px; margin-bottom:12px;">Group: ${data.groupName} | Side: <b>${data.category}</b></div>
        
        <div class="row"><span>Pass Unique ID:</span> <span class="badge">${data.uniqueId}</span></div>
        <div class="row"><span>Total Allowed Capacity:</span> <b>${data.capacity} Persons</b></div>
        <div class="row" style="border-top:1px solid #edf2f7; padding-top:6px;">
          <span>Live Scan Count (মোট প্রবেশ):</span> 
          <span class="counter-tag" style="color:${isExceeded ? '#c53030' : '#276749'};">${data.scanCount} / ${data.capacity}</span>
        </div>
        <div class="row"><span>Scan Time:</span> <small>${data.lastScan}</small></div>

        ${alertMessage}

        <button class="btn-next" onclick="closeModal()">Next Scan / পরবর্তী স্ক্যান (✖)</button>
      `;

      openModal(bodyHtml, headerClass, headerTitle);

    } else {
      openModal(`
        <div style="text-align:center; padding:10px;">
          <p style="color:#c53030; font-size:16px; font-weight:bold;">${data.message || "Invalid QR Code / ID Sahi Nahi Hai!"}</p>
          <button class="btn-next" style="background:#e53e3e;" onclick="closeModal()">Dobara Check Karein</button>
        </div>
      `, "error", "❌ NOT FOUND / পাওয়া যায়নি");
    }
  })
  .catch(err => {
    console.error(err);
    openModal(`
      <p style="color:#c53030; text-align:center;">Database connection failed. Internet check karein.</p>
      <button class="btn-next" onclick="closeModal()">Close</button>
    `, "error", "CONNECTION ERROR");
  });
}

// Manual Form Submit
function submitManual() {
  const input = document.getElementById("manualId");
  const val = input.value.trim();
  if (!val) {
    alert("Kripya ID enter karein / আইডি লিখুন!");
    return;
  }
  verifyId(val);
  input.value = "";
}

// Scanner start
function startScanner() {
  if (isScanning) return;
  html5QrCode = new Html5Qrcode("reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      // Camera pause karke modal kholo
      html5QrCode.pause(true);
      verifyId(decodedText);
    },
    () => {}
  ).then(() => {
    isScanning = true;
    document.getElementById("startCamBtn").style.display = "none";
    document.getElementById("stopCamBtn").style.display = "inline-block";
    checkTorch();
  }).catch(err => {
    console.error(err);
    alert("Camera chalu nahi hua. Browser me camera allow karein.");
  });
}

// Scanner stop
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

// Torch
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
