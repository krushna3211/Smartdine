// js/reports.js
document.addEventListener("DOMContentLoaded", () => {
  
  const token = localStorage.getItem("token");

  // --- Element Definitions ---
  const reportForm = document.getElementById("reportForm");
  const reportDate = document.getElementById("reportDate");
  const reportBtns = document.querySelectorAll(".report-btn"); // D/W/M buttons
  
  const totalSalesEl = document.getElementById("totalSales");
  const totalOrdersEl = document.getElementById("totalOrders");
  const reportBody = document.getElementById("reportBody");
  const reportTableTitle = document.getElementById("report-table-title");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");

  let currentReportData = null; 
  
  // Set default date to today for the calendar
  const today = new Date().toISOString().split('T')[0];
  reportDate.value = today;

  // --- Fetch Report Data (UPDATED) ---
  // Can fetch by period OR by date
  async function fetchReport(queryType, value) {
    let apiUrl = "http://localhost:5000/api/reports";
    
    if (queryType === 'period') {
      apiUrl += `?period=${value}`;
    } else if (queryType === 'date') {
      apiUrl += `?date=${value}`;
    }

    try {
      // Show loading state
      totalSalesEl.textContent = '...';
      totalOrdersEl.textContent = '...';
      reportBody.innerHTML = '<tr><td colspan="4">Loading report...</td></tr>';
      
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load report');
      }
      
      const data = await res.json();
      currentReportData = data; // Save data for PDF

      // 1. Populate the summary cards
      totalSalesEl.textContent = `₹${data.totalSales}`;
      totalOrdersEl.textContent = data.totalOrders;

      // 2. Populate the table title
      let title = "";
      // Check if reportType is a date (e.g., "2025-11-07")
      if (data.reportType.includes('-')) {
        const displayDate = new Date(data.reportType + 'T00:00:00').toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
        title = `Report for ${displayDate}`;
      } else { // It's a period (e.g., "daily")
        title = `${data.reportType.charAt(0).toUpperCase() + data.reportType.slice(1)} Report`;
      }
      reportTableTitle.textContent = title;


      // 3. Populate the detailed table
      if (data.orders.length === 0) {
        reportBody.innerHTML = '<tr><td colspan="4">No paid orders found for this period.</td></tr>';
        return;
      }

      reportBody.innerHTML = ""; // Clear
      data.orders.forEach(order => {
        const paidTime = new Date(order.paidAt).toLocaleString('en-IN');
        const row = `
          <tr>
            <td>${order._id.slice(-6)}</td>
            <td>${order.table}</td>
            <td>${paidTime}</td>
            <td>₹${order.total.toFixed(2)}</td>
          </tr>
        `;
        reportBody.insertAdjacentHTML('beforeend', row);
      });

    } catch (err) {
      console.error(err);
      currentReportData = null; // Clear data on error
      reportBody.innerHTML = '<tr><td colspan="4">Error loading report.</td></tr>';
    }
  }
  
  // --- Download PDF Function (UPDATED) ---
  function downloadPDF() {
    if (!currentReportData) {
      alert("Please load a report before downloading.");
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Create a dynamic title for the PDF
    let title = "";
    let fileName = "";
    if (currentReportData.reportType.includes('-')) { // It's a date
      const displayDate = new Date(currentReportData.reportType + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      title = `Report for: ${displayDate}`;
      fileName = `report_${currentReportData.reportType}`;
    } else { // It's a period
      title = `${currentReportData.reportType.charAt(0).toUpperCase() + currentReportData.reportType.slice(1)} Report`;
      fileName = `report_${currentReportData.reportType}`;
    }
    
    // Add Title and Summary Info
    doc.setFontSize(18);
    doc.text(`SmartDine Sales Report`, 14, 22);
    doc.setFontSize(14);
    doc.text(title, 14, 30);
    
    doc.setFontSize(12);
    doc.text(`Total Sales: ₹${currentReportData.totalSales}`, 14, 42);
    doc.text(`Total Orders: ${currentReportData.totalOrders}`, 14, 48);

    // Prepare the data for the table
    const tableColumn = ["Order ID", "Table", "Paid At", "Total (₹)"];
    const tableRows = [];
    currentReportData.orders.forEach(order => {
      const paidTime = new Date(order.paidAt).toLocaleString('en-IN');
      const total = `₹${order.total.toFixed(2)}`;
      tableRows.push([ order._id.slice(-6), order.table, paidTime, total ]);
    });

    // Add the table
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 55, 
    });

    // Save the file
    doc.save(`smartdine_${fileName}.pdf`);
  }

  // --- Add Click Listeners (UPDATED) ---
  
  // 1. For D/W/M buttons
  reportBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Set active state for buttons
      reportBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Clear date picker so it's not confusing
      reportDate.value = ""; 
      
      // Fetch
      const period = btn.getAttribute('data-period');
      fetchReport('period', period);
    });
  });
  
  // 2. For Calendar form
  reportForm.addEventListener("submit", (e) => {
    e.preventDefault(); 
    const date = reportDate.value;
    if (date) {
      // Clear active state from D/W/M buttons
      reportBtns.forEach(b => b.classList.remove('active'));
      // Fetch
      fetchReport('date', date);
    }
  });

  // 3. For Download button
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", downloadPDF);
  }

  // --- Initial Load ---
  fetchReport('period', 'daily'); // Load daily by default
  
});