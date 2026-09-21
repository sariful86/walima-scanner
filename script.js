let html5QrcodeScanner = null;
let isProcessing = false;

window.onload = function() {
  loadDashboard();
  initScanner();
};

function loadDashboard() {
  google.script.run
    .withSuccessHandler(updateDashboardUI)
    .withFailureHandler(err => console.error("Dashboard error: " + err.message))
    .getDashboardStats();
}

function updateDashboardUI(data) {
  document.getElementById('stat-invited').innerText = data.totalInvited;
  document.getElementById('stat-arrived').innerText = data.totalArrived;
  document.getElementById('stat-remaining').innerText = data.totalRemaining;

  let tbody = document.getElementById('group-table-body');
  tbody.innerHTML = "";

  if (!data.groups || data.groups.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">No group data found.</td></tr>`;
    return;
  }

  data.groups.forEach(group => {
    let tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition";
    tr.innerHTML = `
      <td class="p-3 pl-5 font-bold text-slate-800">${group.groupName}</td>
      <td class="p-3 text-center"><span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold">${group.sideCategory}</span></td>
      <td class="p-3 text-center font-semibold text-slate-600">${group.totalCapacity}</td>
      <td class="p-3 text-center font-bold text-emerald-600">${group.arrivedCount}</td>
      <td class="p-3 text-center font-bold text-amber-500">${group.remainingCount}</td>
    `;
    tbody.appendChild(tr);
  });
}

function initScanner() {
  if (html5QrcodeScanner) return;
  try {
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  } catch (e) {
    console.error("Scanner init error: ", e);
  }
}

function onScanSuccess(decodedText) {
  if (isProcessing) return;
  isProcessing = true;
  processScannedId(decodedText.trim());
}

function onScanFailure(error) {
  // Ignore continuous frame scan errors
}

function handleManualSubmit() {
  const input = document.getElementById('manual-id-input');
  const val = input.value.trim();
  if (!val) {
    alert("Kripya valid Pass ID enter karein!");
    return;
  }
  processScannedId(val);
  input.value = "";
}

function processScannedId(id) {
  google.script.run
    .withSuccessHandler(function(response) {
      showModalResult(response);
      isProcessing = false;
    })
    .withFailureHandler(function(err) {
      alert("Server error: " + err.message);
      isProcessing = false;
    })
    .processScan(id);
}

function showModalResult(response) {
  const modal = document.getElementById('result-modal');
  const icon = document.getElementById('modal-header-icon');
  const title = document.getElementById('modal-title');
  const msgBox = document.getElementById('message-box');
  
  document.getElementById('modal-guest-name').innerText = response.guest ? response.guest.guestName : '--';
  document.getElementById('modal-unique-id').innerText = response.guest ? response.guest.uniqueId : '--';
  document.getElementById('modal-group-name').innerText = response.guest ? response.guest.groupName : '--';
  document.getElementById('modal-side').innerText = response.guest ? response.guest.sideCategory : '--';
  document.getElementById('modal-capacity').innerText = response.guest ? response.guest.groupCapacity : '--';
  document.getElementById('modal-group-arrived').innerText = response.groupArrived || '--';
  document.getElementById('modal-group-remaining').innerText = response.groupRemaining !== undefined ? response.groupRemaining : '--';
  msgBox.innerText = response.message;

  if (response.success) {
    if (response.overLimit) {
      icon.innerText = "⚠️";
      title.innerText = "Over-Limit Warning!";
      title.className = "text-xl font-black text-center mb-4 text-amber-600";
      msgBox.className = "mt-3 p-3 rounded-lg text-xs font-bold text-center bg-amber-50 border border-amber-200 text-amber-800";
    } else {
      icon.innerText = "✅";
      title.innerText = "Entry Successful";
      title.className = "text-xl font-black text-center mb-4 text-emerald-600";
      msgBox.className = "mt-3 p-3 rounded-lg text-xs font-bold text-center bg-emerald-50 border border-emerald-200 text-emerald-800";
    }
  } else {
    icon.innerText = "❌";
    title.innerText = "Already Scanned / Blocked";
    title.className = "text-xl font-black text-center mb-4 text-rose-600";
    msgBox.className = "mt-3 p-3 rounded-lg text-xs font-bold text-center bg-rose-50 border border-rose-200 text-rose-800";
  }

  modal.classList.remove('hidden');
  loadDashboard();
}

function closeModal() {
  document.getElementById('result-modal').classList.add('hidden');
}
