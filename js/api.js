import CONFIG from './config.js';

let CURRENT_OTP = null;

// Helper to auto-calculate the dynamic Day and Date
function getDynamicDayString() {
  const today = new Date();
  // Workshop start date: Sept 7, 2026
  const startDate = new Date(2026, 8, 7); // Month is 0-indexed (8 = September)

  // Reset times to midnight for accurate day difference calculation
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  // Calculate difference in days (Day 1 = start date)
  const diffTime = today.getTime() - startDate.getTime();
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Fallback to Day 1 if the current date is somehow before the start date
  if (diffDays < 1) diffDays = 1;

  // Format today's date as DD.MM.YYYY
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const dateStr = `${dd}.${mm}.${yyyy}`;

  return `Day ${diffDays} - ${dateStr}`;
}

const API = {
  async getSession(eventId, day, sessionStr) {
    if (CONFIG.USE_MOCK_API) {
      return {
        data: {
          event: 'INDIAN CLASSICAL MUSIC VOCAL, INSTRUMENTAL MUSIC & DANCE EXPLORING RIYAZ, RAGA & RASA-BHAVA',
          day: getDynamicDayString(),
          session: '11:00 AM',
          venue: 'SAVITRIBAI PHULE AUDITORIUM, MAHILA MAHAVIDYALAYA BHU, VARANASI',
          sessionId: 'S1',
          eventId: 'BHU-MMV-2026'
        }
      };
    }
  },

  async getFormOptions() {
    if (CONFIG.USE_MOCK_API) {
      return {
        data: { 
          courses: ["B.A.", "M.A.", "B.Mus.", "M.Mus.", "B.P.A.", "M.P.A.", "Diploma", "Ph.D.", "Other"], 
          genders: ["Male", "Female", "Other", "Prefer not to say"] 
        }
      };
    }
  },

  async sendOTP(email) {
    // Generate a 6-digit OTP
    CURRENT_OTP = Math.floor(100000 + Math.random() * 900000).toString();

    if (CONFIG.USE_REAL_EMAIL) {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, otp: CURRENT_OTP })
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Backend email failed');
        }
        
        return { data: { success: true, isReal: true } };
      } catch (err) {
        console.error("Nodemailer Error:", err);
        return { error: 'Failed to send email via Node server. Check Backend logs.' };
      }
    } else {
      // Fallback Demo OTP
      return { data: { success: true, isReal: false, simulatedOtp: CURRENT_OTP } };
    }
  },

  async verifyOTP(otp) {
    if (otp === CURRENT_OTP) {
      return { data: { success: true } };
    } else {
      return { error: 'Invalid or expired OTP!' };
    }
  },

  async submitAttendance(payload) {
    if (CONFIG.USE_MOCK_API) {
      // 1. Offline Check
      if (!navigator.onLine) {
        return { error: 'No Internet Connection. Please check your network and try again.', code: 'OFFLINE_ERR' };
      }

      // 2. Fetch with Timeout (15 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const result = await response.json();
        
        // 3. Server Side Error Handling (5xx / 4xx)
        if (!response.ok) {
           let msg = result.error || 'Server Error';
           if (response.status >= 500) msg = 'Server Side Problem: We are fixing this. Please try again in a moment.';
           return { error: msg, code: result.code || `HTTP_${response.status}` };
        }
        
        // Save to local storage for success page rendering
        const timestamp = new Date().toISOString();
        localStorage.setItem('latest_attendance', JSON.stringify({ 
          ...payload, 
          attendanceId: result.data.attendanceId, 
          timestamp: timestamp 
        }));
        
        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("Backend connection failed:", err);
        let errorMsg = 'Network Error: Cannot reach the backend server.';
        if (err.name === 'AbortError') {
            errorMsg = 'Internet Slow: Request timed out. Please check your speed.';
        } else if (err.message.includes('Failed to fetch')) {
            errorMsg = 'Server Offline or Network issue: Server is unreachable right now.';
        }
        return { error: errorMsg, code: 'NETWORK_ERR' };
      }
    }
  },

  async updateAttendancePhoto(payload) {
    if (CONFIG.USE_MOCK_API) {
      if (!navigator.onLine) {
        return { error: 'No Internet Connection.', code: 'OFFLINE_ERR' };
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/attendance/photo`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const result = await response.json();
        if (!response.ok) {
           return { error: result.error || 'Server Error', code: result.code || `HTTP_${response.status}` };
        }
        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        return { error: 'Network Error: Cannot reach the server.', code: 'NETWORK_ERR' };
      }
    }
  }
};

export default API;
