// Aapka deploy kiya hua Google Apps Script Web App URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyS1hY6dxksGIbIkJykHxVP9Gpa9hZMapd2fvv8fPn80RIVvSz5GiyEgu6XW0i4YS8X2Q/exec";

// Function to send verification request to Google Sheets
function verifyAndLogId(uniqueId) {
  const resultDiv = document.getElementById("result");
  resultDiv.style.color = "blue";
  resultDiv.innerText = "Checking ID: " + uniqueId + "...";

  fetch(WEB_APP_URL, {
    method: "POST",
    mode: "no-cors", // Google Apps Script redirects ke liye zaroori hai
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uniqueId: uniqueId })
  })
  .then(() => {
    resultDiv.style.color = "green";
    resultDiv.innerText = "Success! Verified ID: " + uniqueId;
  })
  .catch(error => {
    console.error("Error:", error);
    resultDiv.style.color = "red";
    resultDiv.innerText = "Error updating database!";
  });
}

// Manual form submit handler
function handleManualSubmit() {
  const inputField = document.getElementById("manualIdInput");
  const uniqueId = inputField.value.trim();
  
  if (!uniqueId) {
    alert("Please enter a valid Unique ID!");
    return;
  }
  
  verifyAndLogId(uniqueId);
  inputField.value = ""; // Input clear karne ke liye
}

// QR Code Scanner Initialization
function onScanSuccess(decodedText, decodedResult) {
  // Jab camera se QR scan ho jayega, ye automatic run hoga
  console.log(`Code matched = ${decodedText}`, decodedResult);
  verifyAndLogId(decodedText);
  
  // Bar-bar scan hone se rokne ke liye kuch der ke liye pause kar sakte hain
  html5QrcodeScanner.clear();
  setTimeout(() => {
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  }, 3000); // 3 seconds baad dobara scanner active ho jayega
}

function onScanFailure(error) {
  // Scanning failure errors ko ignore kar sakte hain kyunki yeh continuous run hota hai
}

// Start the camera scanner on page load
const html5QrcodeScanner = new Html5QrcodeScanner(
  "reader", { fps: 10, qrbox: 250 }, false);
html5QrcodeScanner.render(onScanSuccess, onScanFailure);
