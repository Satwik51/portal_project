import API from './api.js';
import { validateEnrollment } from './validation.js';

// --- UI Helpers ---
const UI = {
    showToast: (msg, type = 'success') => {
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });
            Toast.fire({
                icon: type === 'error' ? 'error' : 'success',
                title: msg
            });
        } else {
            // Fallback
            const toast = document.getElementById('toast');
            if(toast) {
                toast.textContent = msg;
                toast.style.background = type === 'error' ? '#dc2626' : '#16a34a';
                toast.style.opacity = '1';
                toast.style.top = '20px';
                setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.top = '-50px';
                }, 3000);
            } else {
                alert(msg);
            }
        }
    },
    setLoading: (btn, isLoading, text) => {
        if (!btn) return;
        if(isLoading) {
            btn.disabled = true;
            btn.textContent = text;
        } else {
            btn.disabled = false;
            btn.textContent = text;
        }
    },
    initBottomSheet: (inputId, optionsData, titleText) => {
        const inputEl = document.getElementById(inputId);
        const sheetOverlay = document.getElementById('bottomSheetOverlay');
        const sheet = document.getElementById('bottomSheet');
        const sheetTitle = document.getElementById('sheetTitle');
        const sheetSearch = document.getElementById('sheetSearch');
        const sheetOptions = document.getElementById('sheetOptions');
        const sheetClose = document.getElementById('sheetClose');

        if (!inputEl || !sheetOverlay) return;

        inputEl.addEventListener('click', () => {
            // Setup content
            sheetTitle.textContent = titleText;
            sheetSearch.value = '';
            
            const render = (filter = '') => {
                sheetOptions.innerHTML = '';
                const lower = filter.toLowerCase();
                const filtered = optionsData.filter(o => o.toLowerCase().includes(lower));
                
                if(filtered.length === 0) {
                    sheetOptions.innerHTML = '<div style="padding:15px;text-align:center;color:#666;">No matches found</div>';
                    return;
                }
                
                filtered.forEach(opt => {
                    const div = document.createElement('div');
                    div.className = 'sheet-option';
                    div.textContent = opt;
                    if(inputEl.value === opt) div.classList.add('selected');
                    
                    div.addEventListener('click', () => {
                        inputEl.value = opt;
                        UI.clearError(inputEl);
                        closeSheet();
                    });
                    sheetOptions.appendChild(div);
                });
            };
            
            render();
            
            // Attach temporary search listener
            sheetSearch.oninput = (e) => render(e.target.value);

            // Open Sheet
            sheetOverlay.classList.add('active');
            // Small delay to allow display:block to apply before animating bottom
            setTimeout(() => sheet.classList.add('open'), 10);
            
            // Auto focus search
            setTimeout(() => sheetSearch.focus(), 300);
        });
        
        const closeSheet = () => {
            sheet.classList.remove('open');
            setTimeout(() => sheetOverlay.classList.remove('active'), 300);
            sheetSearch.oninput = null; // cleanup
        };
        
        sheetClose.addEventListener('click', closeSheet);
        sheetOverlay.addEventListener('click', (e) => {
            if(e.target === sheetOverlay) closeSheet();
        });
    },

    showError: (inputEl, msg) => {
        const targetEl = inputEl.classList.contains('searchable-select') ? inputEl.querySelector('.select-box') : inputEl;
        targetEl.style.borderColor = '#dc2626';
        const feedback = inputEl.nextElementSibling;
        if(feedback && feedback.classList.contains('error-feedback')) {
            feedback.textContent = msg;
            feedback.style.display = 'block';
            feedback.style.color = '#dc2626';
            feedback.style.fontSize = '12px';
            feedback.style.marginTop = '4px';
        }
    },
    clearError: (inputEl) => {
        const targetEl = inputEl.classList.contains('searchable-select') ? inputEl.querySelector('.select-box') : inputEl;
        targetEl.style.borderColor = '#ccc';
        const feedback = inputEl.nextElementSibling;
        if(feedback && feedback.classList.contains('error-feedback')) {
            feedback.style.display = 'none';
        }
    }
};

// Global click to close dropdowns
document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchable-select') && !e.target.closest('.dropdown-overlay')) {
        document.querySelectorAll('.searchable-select').forEach(c => c.classList.remove('open'));
        const overlay = document.getElementById('dropdownOverlay');
        if(overlay) overlay.classList.remove('active');
    } else if (e.target.closest('.dropdown-overlay')) {
        // If they click the overlay itself, close dropdowns
        document.querySelectorAll('.searchable-select').forEach(c => c.classList.remove('open'));
        e.target.classList.remove('active');
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 0. Initialize Event Details & Dropdowns ---
    async function loadInitialData() {
        try {
            // Check System Status
            const statusRes = await API.getAttendanceStatus();
            if (statusRes && statusRes.status === 'closed') {
                const mainCard = document.getElementById('mainCard');
                if (mainCard) {
                    mainCard.innerHTML = `
                        <div style="text-align: center; padding: 40px 20px; display: flex; flex-direction: column; align-items: center;">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="#dc2626" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto 20px auto; display: block;">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9l11.21 11.21C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z"/>
                            </svg>
                            <h2 style="color:#dc2626; font-weight:bold; margin-bottom:10px; text-align: center;">ATTENDANCE CLOSED</h2>
                            <p style="color:#555; text-align: center;">The attendance system is currently locked by the administrator. Please wait for instructions.</p>
                        </div>
                    `;
                }
                return; // Stop further loading
            }

            const sessionResponse = await API.getSession();
            if (sessionResponse && sessionResponse.data) {
                document.getElementById('displayEvent').textContent = sessionResponse.data.event;
                document.getElementById('displayDay').textContent = sessionResponse.data.day;
                document.getElementById('displaySession').textContent = sessionResponse.data.session;
                
                const venueEl = document.getElementById('displayVenue');
                if (venueEl) venueEl.textContent = sessionResponse.data.venue || 'TBA';
            }
            
            const formResponse = await API.getFormOptions();
            if (formResponse && formResponse.data) {
                UI.initBottomSheet('course', formResponse.data.courses, 'Select Course');
                UI.initBottomSheet('gender', formResponse.data.genders, 'Select Gender');
            }
        } catch (err) {
            console.error("Failed to load initial data:", err);
            document.getElementById('displayEvent').textContent = "Connection Error";
        }
    }
    
    // Call immediately to populate the screen
    await loadInitialData();

    // Check if coming from success redirect
    if (localStorage.getItem('just_submitted')) {
        localStorage.removeItem('just_submitted');
        UI.showToast('✅ Attendance marked successfully!', 'success');
    }

    const attendanceForm = document.getElementById('attendanceForm');
    const selfieSection = document.getElementById('selfieSection');
    
    const enrollInput = document.getElementById('enrollmentNumber');
    const studentNameInput = document.getElementById('studentName');
    const genderInput = document.getElementById('gender');
    const courseInput = document.getElementById('course');
    
    const cameraFeed = document.getElementById('cameraFeed');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const captureSubmitBtn = document.getElementById('captureSubmitBtn');
    const proceedBtn = document.getElementById('proceedBtn');

    let stream = null;
    let formData = {};

    // Live Validation for Enrollment
    if(enrollInput) {
        enrollInput.addEventListener('input', () => {
            enrollInput.value = enrollInput.value.toUpperCase();
            const err = validateEnrollment(enrollInput.value);
            if (err) {
                UI.showError(enrollInput, err);
            } else {
                UI.clearError(enrollInput);
            }
        });
    }

    // 1. Submit Form & Open Camera
    if(attendanceForm) {
        attendanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate
            let hasError = false;
            const enrollErr = validateEnrollment(enrollInput.value);
            if (enrollErr) {
                UI.showError(enrollInput, enrollErr);
                hasError = true;
            }

            if (!genderInput.value) {
                UI.showError(genderInput, 'Please select your Gender');
                hasError = true;
            }

            if (!courseInput.value) {
                UI.showError(courseInput, 'Please select your Course');
                hasError = true;
            }

            if (hasError) {
                UI.showToast('Please fix the errors in the form', 'error');
                return;
            }

            // Gather Data
            formData = {
                enrollment_number: enrollInput.value,
                student_name: studentNameInput.value,
                gender: genderInput.value,
                course: courseInput.value,
                // Add Session Data
                event_id: document.getElementById('displayEvent').textContent === 'Loading...' ? 'EVT_2026' : 'EVT_2026',
                event_name: document.getElementById('displayEvent').textContent,
                day: document.getElementById('displayDay').textContent,
                session_name: document.getElementById('displaySession').textContent
            };

            // UI Changes
            UI.setLoading(proceedBtn, true, 'Starting Camera...');
            
            try {
                // Request Camera
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                cameraFeed.srcObject = stream;
                
                // Switch UI
                attendanceForm.style.display = 'none';
                selfieSection.style.display = 'block';
                
            } catch (err) {
                console.error("Camera Error:", err);
                UI.showToast('Camera permission denied or not available!', 'error');
            } finally {
                UI.setLoading(proceedBtn, false, 'Open Camera for Selfie');
            }
        });
    }

    // 2. Capture and Submit Attendance
    if(captureSubmitBtn) {
        captureSubmitBtn.addEventListener('click', async () => {
            // Compress Image
            const ctx = cameraCanvas.getContext('2d');
            cameraCanvas.width = 320; // Compressed width
            cameraCanvas.height = 240; // Compressed height
            
            // Draw frame to canvas
            ctx.drawImage(cameraFeed, 0, 0, 320, 240);
            
            // Get Base64 String (JPEG format, 60% quality)
            const compressedBase64 = cameraCanvas.toDataURL('image/jpeg', 0.6);
            formData.selfie_base64 = compressedBase64;
            
            // Stop Camera
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            // Submit to API
            UI.setLoading(captureSubmitBtn, true, 'Saving...');
            
            const res = await API.submitAttendance(formData);
            
            UI.setLoading(captureSubmitBtn, false, '📸 Capture & Mark Attendance');

            if (res.error) {
                if (res.code === 'DUPLICATE') {
                    if(typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'info',
                            title: 'Already Marked!',
                            text: 'You have already marked your attendance for today. Would you like to update your profile photo with the new selfie you just captured?',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, Update Photo',
                            cancelButtonText: 'No, Cancel',
                            confirmButtonColor: '#003366',
                            cancelButtonColor: '#d33'
                        }).then(async (result) => {
                            if (result.isConfirmed) {
                                UI.setLoading(captureSubmitBtn, true, 'Updating Photo...');
                                const updateRes = await API.updateAttendancePhoto(formData);
                                UI.setLoading(captureSubmitBtn, false, '📸 Capture & Mark Attendance');
                                
                                if (updateRes.error) {
                                    Swal.fire('Error', updateRes.error, 'error');
                                    attendanceForm.style.display = 'block';
                                    selfieSection.style.display = 'none';
                                } else {
                                    Swal.fire('Updated!', 'Your photo was successfully updated.', 'success').then(() => {
                                        window.location.href = 'success.html';
                                    });
                                }
                            } else {
                                attendanceForm.style.display = 'block';
                                selfieSection.style.display = 'none';
                            }
                        });
                        return; // Prevent standard toggle flow below since Swal is async
                    } else {
                        alert('You have already marked your attendance for today. Multiple submissions are not allowed.');
                    }
                } else {
                    UI.showToast(res.error, 'error');
                }
                
                // Show form again so they can retry
                attendanceForm.style.display = 'block';
                selfieSection.style.display = 'none';
            } else {
                localStorage.setItem('just_submitted', 'true');
                window.location.href = 'success.html';
            }
        });
    }
});

// --- NAVIGATION TOGGLE LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const navMarkAttendance = document.getElementById('navMarkAttendance');
    const navAdminPortal = document.getElementById('navAdminPortal');
    const mainCard = document.getElementById('mainCard');
    const adminView = document.getElementById('adminView');

    if (navMarkAttendance && navAdminPortal) {
        navMarkAttendance.addEventListener('click', () => {
            // UI Toggle
            mainCard.style.display = 'block';
            adminView.style.display = 'none';
            // Class Toggle
            navMarkAttendance.classList.add('active-primary');
            navAdminPortal.classList.remove('active-danger');
        });

        navAdminPortal.addEventListener('click', () => {
            // UI Toggle
            mainCard.style.display = 'none';
            adminView.style.display = 'block';
            // Class Toggle
            navAdminPortal.classList.add('active-danger');
            navMarkAttendance.classList.remove('active-primary');
        });
    }
});

