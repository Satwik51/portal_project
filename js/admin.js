import CONFIG from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // ---- HARDCODED SECURITY ----
    const ADMIN_CREDS = {
        id: "admin",
        pass: "admin123"
    };

    const mainCard = document.getElementById('mainCard');
    const adminView = document.getElementById('adminView');
    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // DOM Elements - Dashboard Data
    const tableBody = document.getElementById('attendanceTableBody');
    const searchInput = document.getElementById('searchInput');
    const courseFilter = document.getElementById('courseFilter');
    const exportBtn = document.getElementById('exportBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    let allData = []; // Stores all fetched data
    let filteredData = []; // Stores data after search/course filter
    let selectedIds = new Set(); // Stores IDs of selected rows
    
    // Pagination state
    let currentPage = 1;
    const itemsPerPage = 50;

    // --- 1. Login Logic ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('adminId').value;
        const pass = document.getElementById('adminPass').value;

        if (id === ADMIN_CREDS.id && pass === ADMIN_CREDS.pass) {
            loginScreen.style.display = 'none';
            dashboardScreen.style.display = 'block';
            fetchData(); // Load data once logged in
        } else {
            loginError.style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', () => {
        dashboardScreen.style.display = 'none';
        loginScreen.style.display = 'block';
        document.getElementById('adminId').value = '';
        document.getElementById('adminPass').value = '';
        loginError.style.display = 'none';
    });

    // --- 2. Robust Data Fetching ---
    async function fetchData() {
        if (!navigator.onLine) {
            Swal.fire('Offline', 'No internet connection. Please check your network.', 'error');
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#dc2626; font-weight:bold;">Network Offline</td></tr>';
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="spinner" style="display:inline-block;border-top-color:#003366;"></div> Loading Data...</td></tr>';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/attendance`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status >= 500) throw new Error('Server side error. Please try again later.');
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.data) {
                allData = result.data;
                filteredData = [...allData]; // Reset filter
                currentPage = 1;
                updateDashboard();
            }
        } catch (error) {
            clearTimeout(timeoutId);
            console.error("Error fetching data:", error);
            let errMsg = 'Failed to load data. ';
            
            if (error.name === 'AbortError') errMsg = 'Internet Slow: Request timed out.';
            else if (error.message.includes('Failed to fetch')) errMsg = 'Server offline or unreachable.';
            else errMsg += error.message;
            
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#dc2626; font-weight:bold;">${errMsg}</td></tr>`;
            
            if(typeof Swal !== 'undefined') {
                Swal.fire({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 4000,
                    icon: 'error', title: 'Data Fetch Error', text: errMsg
                });
            }
        }
    }

    // --- 3. Render Dashboard (with Pagination) ---
    function updateDashboard() {
        // Update Metrics (Based on filteredData)
        document.getElementById('totalCount').textContent = filteredData.length;
        const uniqueCourses = new Set(filteredData.map(item => item.course));
        document.getElementById('uniqueCoursesCount').textContent = uniqueCourses.size;

        if (filteredData.length > 0) {
            document.getElementById('latestSession').textContent = `${filteredData[0].day} - ${filteredData[0].session_name}`;
        } else {
            document.getElementById('latestSession').textContent = '-';
        }

        // Pagination calculations
        const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);

        // Update Pagination UI
        document.getElementById('pageInfo').textContent = `Showing ${startIndex + (pageData.length > 0 ? 1 : 0)} to ${startIndex + pageData.length} of ${filteredData.length}`;
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        if(prevBtn) prevBtn.disabled = currentPage === 1;
        if(nextBtn) nextBtn.disabled = currentPage === totalPages;

        // Render Table
        tableBody.innerHTML = '';
        if (pageData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No records found.</td></tr>';
            return;
        }

        pageData.forEach(record => {
            const tr = document.createElement('tr');
            
            // Format Timestamp (Separate Date and Time)
            const dateObj = new Date(record.timestamp);
            const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute:'2-digit' });

            const photoHtml = record.selfie_base64 
                ? `<img src="${record.selfie_base64}" class="student-photo-thumbnail" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc; margin-right: 10px; cursor: pointer; transition: transform 0.2s; flex-shrink: 0;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="Click to view photo" />` 
                : `<div style="width: 50px; height: 50px; background: #eee; border: 1px solid #ccc; margin-right: 10px; flex-shrink: 0;"></div>`;

            // Check if this row is currently selected in our Set
            const isChecked = selectedIds.has(record.id) ? 'checked' : '';

            tr.innerHTML = `
                <td><input type="checkbox" class="row-checkbox" value="${record.id}" ${isChecked}></td>
                <td><strong>${dateStr}</strong><br><span style="font-size:11px; color:#666;">${timeStr}</span></td>
                <td>
                    <div style="display:flex; align-items:center; min-width:max-content;">
                        ${photoHtml}
                        <strong>${record.student_name}</strong>
                    </div>
                </td>
                <td>${record.enrollment_number}</td>
                <td>${record.course}</td>
                <td>${record.event_name}<br><span style="font-size:11px; color:#666;">${record.day} | ${record.session_name}</span></td>
            `;

            const imgEl = tr.querySelector('.student-photo-thumbnail');
            if (imgEl) {
                imgEl.addEventListener('click', () => {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            title: record.student_name,
                            text: `Enrollment: ${record.enrollment_number}`,
                            imageUrl: record.selfie_base64,
                            imageAlt: `${record.student_name} Photo`,
                            confirmButtonText: 'Close',
                            confirmButtonColor: '#003366',
                            backdrop: `rgba(0,0,0,0.85)`
                        });
                    }
                });
            }

            // Checkbox event
            const checkbox = tr.querySelector('.row-checkbox');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedIds.add(record.id);
                } else {
                    selectedIds.delete(record.id);
                    selectAllCheckbox.checked = false; // Uncheck "Select All" if one is unchecked
                }
                updateDeleteButtons();
            });

            tableBody.appendChild(tr);
        });
        updateDeleteButtons();
    }

    // Pagination Listeners
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; updateDashboard(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { const totalPages = Math.ceil(filteredData.length / itemsPerPage); if (currentPage < totalPages) { currentPage++; updateDashboard(); } });

    // Helper to toggle delete selected button visibility
    function updateDeleteButtons() {
        if (selectedIds.size > 0) {
            deleteSelectedBtn.style.display = 'block';
            deleteSelectedBtn.textContent = `🗑️ Delete Selected (${selectedIds.size})`;
        } else {
            deleteSelectedBtn.style.display = 'none';
        }
    }

    // Select All Logic
    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        if (e.target.checked) {
            checkboxes.forEach(cb => {
                cb.checked = true;
                selectedIds.add(parseInt(cb.value));
            });
        } else {
            checkboxes.forEach(cb => {
                cb.checked = false;
            });
            selectedIds.clear();
        }
        updateDeleteButtons();
    });

    // --- 4. Filtering and Search ---
    function filterData() {
        const query = searchInput.value.toLowerCase();
        const course = courseFilter.value;

        filteredData = allData.filter(record => {
            const matchesSearch = record.student_name.toLowerCase().includes(query) || 
                                  record.enrollment_number.toLowerCase().includes(query);
            const matchesCourse = course === 'ALL' || record.course === course;
            
            return matchesSearch && matchesCourse;
        });

        currentPage = 1; // Reset to page 1 on search
        updateDashboard();
    }

    searchInput.addEventListener('input', filterData);
    courseFilter.addEventListener('change', filterData);

    // --- 5. Export to CSV (Advanced Feature) ---
    exportBtn.addEventListener('click', () => {
        if (allData.length === 0) {
            if(typeof Swal !== 'undefined') Swal.fire('Empty', 'No data to export!', 'info');
            else alert("No data to export!");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        // CSV Headers
        csvContent += "Timestamp,Student Name,Enrollment Number,Gender,Course,Event,Day,Session\n";

        // Current Filtered Data (So export respects search/filters)
        const query = searchInput.value.toLowerCase();
        const course = courseFilter.value;
        const dataToExport = allData.filter(record => {
            const matchesSearch = record.student_name.toLowerCase().includes(query) || record.enrollment_number.toLowerCase().includes(query);
            const matchesCourse = course === 'ALL' || record.course === course;
            return matchesSearch && matchesCourse;
        });

        dataToExport.forEach(row => {
            // Escape quotes and commas in strings
            const safeName = `"${row.student_name.replace(/"/g, '""')}"`;
            const timeStr = new Date(row.timestamp).toLocaleString('en-IN');
            
            const rowData = [
                `"${timeStr}"`,
                safeName,
                row.enrollment_number,
                row.gender,
                row.course,
                `"${row.event_name}"`,
                row.day,
                `"${row.session_name}"`
            ].join(",");
            csvContent += rowData + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- 6. Delete Logic ---
    deleteSelectedBtn.addEventListener('click', async () => {
        const { isConfirmed } = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete ${selectedIds.size} selected record(s).`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        });
        if (!isConfirmed) return;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/attendance`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) })
            });
            const result = await response.json();
            
            if (response.ok) {
                Swal.fire('Deleted!', result.message, 'success');
                selectedIds.clear();
                selectAllCheckbox.checked = false;
                fetchData(); // Refresh the table
            } else {
                Swal.fire('Error!', result.error || 'Failed to delete records', 'error');
            }
        } catch (err) {
            console.error("Delete error:", err);
            let errMsg = 'Error connecting to backend';
            if (err.message.includes('Failed to fetch')) errMsg = 'Network Error: Server unreachable.';
            Swal.fire('Connection Error', errMsg, 'error');
        }
    });

    deleteAllBtn.addEventListener('click', async () => {
        const { value: confirmText } = await Swal.fire({
            title: '⚠️ CRITICAL WARNING',
            text: 'Are you sure you want to delete ALL attendance records? This cannot be undone!',
            icon: 'error',
            input: 'text',
            inputLabel: 'Type "DELETE" to confirm clearing the entire database',
            inputPlaceholder: 'DELETE',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Permanently Delete All',
            inputValidator: (value) => {
                if (value !== 'DELETE') {
                    return 'You need to type DELETE exactly!';
                }
            }
        });
        
        if (confirmText !== 'DELETE') {
            Swal.fire('Cancelled', 'Bulk deletion cancelled.', 'info');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/attendance`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deleteAll: true })
            });
            const result = await response.json();
            
            if (response.ok) {
                Swal.fire('Cleared!', result.message, 'success');
                selectedIds.clear();
                selectAllCheckbox.checked = false;
                fetchData(); // Refresh the table
            } else {
                Swal.fire('Error!', result.error || 'Failed to delete all records', 'error');
            }
        } catch (err) {
            console.error("Delete all error:", err);
            let errMsg = 'Error connecting to backend';
            if (err.message.includes('Failed to fetch')) errMsg = 'Network Error: Server unreachable.';
            Swal.fire('Connection Error', errMsg, 'error');
        }
    });

    // --- 7. Export to PDF (Govt Style) ---
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (allData.length === 0) {
                if(typeof Swal !== 'undefined') Swal.fire('Empty', 'No data to export!', 'info');
                else alert("No data to export!");
                return;
            }

            const query = searchInput.value.toLowerCase();
            const course = courseFilter.value;
            const dataToExport = allData.filter(record => {
                const sName = (record.student_name || "").toLowerCase();
                const eNum = (record.enrollment_number || "").toLowerCase();
                const matchesSearch = sName.includes(query) || eNum.includes(query);
                const matchesCourse = course === 'ALL' || record.course === course;
                return matchesSearch && matchesCourse;
            });

            // If filter excluded everything
            if (dataToExport.length === 0) {
                if(typeof Swal !== 'undefined') Swal.fire('No Matches', 'No records match the current search/filter!', 'warning');
                else alert("No records match the current search/filter!");
                return;
            }

            // Create PDF Document (Landscape mode for tables)
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape');

            // Header Title
            doc.setFontSize(14);
            doc.setTextColor(0, 51, 102); // Navy Blue
            doc.text("MAHILA MAHAVIDYALAYA, BANARAS HINDU UNIVERSITY", 14, 18);
            
            doc.setFontSize(12);
            doc.setTextColor(51, 51, 51);
            doc.text("ATTENDANCE DATA REPORT", 14, 25);

            // Print Date
            const printDate = new Date().toLocaleString('en-IN');
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Print Date & Time: ${printDate}`, 14, 32);

            // Prepare Table Data
            const tableData = dataToExport.map(record => {
                const dateObj = new Date(record.timestamp);
                const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute:'2-digit' });

                return [
                    `${dateStr}\n${timeStr}`, // Col 0: Timestamp
                    "", // Col 1: Photo Placeholder (drawn by hook)
                    record.student_name || 'N/A', // Col 2: Name
                    record.enrollment_number || 'N/A', // Col 3: Enrollment
                    record.course || 'N/A', // Col 4: Course
                    `${record.event_name || 'N/A'}\n${record.day || ''} | ${record.session_name || ''}`, // Col 5: Session
                    record.selfie_base64 || '' // Col 6: Hidden column for base64 image data
                ];
            });

            // Add Table
            doc.autoTable({
                startY: 38,
                head: [['Timestamp', 'Photo', 'Student Name', 'Enrollment No.', 'Course', 'Event / Session']],
                body: tableData,
                styles: { 
                    fontSize: 10, 
                    valign: 'middle', 
                    cellPadding: 4,
                    minCellHeight: 18 // Ensure enough height for the photo
                },
                headStyles: { 
                    fillColor: [0, 51, 102], 
                    textColor: 255,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    1: { cellWidth: 20, halign: 'center' } // Photo column width
                },
                didDrawCell: function(data) {
                    // Draw Selfie Image in the 2nd column (index 1)
                    if (data.column.index === 1 && data.cell.section === 'body') {
                        // Access the hidden 7th column (index 6) from the raw data
                        const base64Img = data.row.raw && data.row.raw[6] ? data.row.raw[6] : null;
                        if (base64Img && base64Img.startsWith('data:image')) {
                            const dim = 12; // 12x12 mm square
                            // Center horizontally and vertically
                            const xPos = data.cell.x + (data.cell.width - dim) / 2;
                            const yPos = data.cell.y + (data.cell.height - dim) / 2;
                            try {
                                doc.addImage(base64Img, 'JPEG', xPos, yPos, dim, dim);
                            } catch (e) {
                                console.error("Could not draw image", e);
                            }
                        }
                    }
                }
            });

            // Save PDF
            doc.save(`Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        });
    }
});
