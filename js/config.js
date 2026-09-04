const CONFIG = {
  USE_MOCK_API: true, // Keep true so local DB works
  USE_REAL_EMAIL: true,
  // Automatically use relative path on Vercel, and localhost during local development
  API_BASE_URL: window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
      ? 'http://localhost:3000/api/v1' 
      : '/api/v1'
};

export default CONFIG;
