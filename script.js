function checkEntry() {
    let id = document.getElementById('manual-input').value.trim();
    let resultDiv = document.getElementById('result');
    
    if(id === "") {
        resultDiv.className = "error";
        resultDiv.innerHTML = "⚠️ Pehle Unique ID enter karein!";
        return;
    }

    // Temporary logic check (Baad me ise Google Sheet database se connect karenge)
    if(id.startsWith("FM")) {
        resultDiv.className = "success";
        resultDiv.innerHTML = `
            ✅ <strong>ENTRY APPROVED (Boys-Side)</strong><br>
            🆔 ID: ${id}<br>
            👥 Group: sarifa.fm1<br>
            📊 Capacity: 3 | Arrived: 1<br>
            ⏳ Status: Active
        `;
    } else if(id.startsWith("BR")) {
        resultDiv.className = "success";
        resultDiv.innerHTML = `
            ✅ <strong>ENTRY APPROVED (Bride-Side)</strong><br>
            🆔 ID: ${id}<br>
            👤 Guest: Mohima Khatoon<br>
            📊 Capacity: 30 | Arrived: 1<br>
            ⏳ Status: Active
        `;
    } else {
        resultDiv.className = "error";
        resultDiv.innerHTML = `
            ❌ <strong>ACCESS DENIED</strong><br>
            ⚠️ Invalid ID or Unauthorized Entry!
        `;
    }
}
