/**
 * API Configuration
 * Chỉnh sửa các biến dưới đây để thay đổi API endpoint
 */

// Thay đổi HOST tại đây - tất cả các file sẽ tự động sử dụng giá trị này
export const API_HOST = 'localhost'; // Hoặc '10.106.34.149', '127.0.0.1', etc.
export const API_PORT = 8080;

export const API_CONFIG = {
  // Base URLs
  AUTH_API: `http://${API_HOST}:${API_PORT}/auth`,
  API_BASE: `http://${API_HOST}:${API_PORT}/api`,
  
  // WebSocket
  WS_HOST: API_HOST,
  WS_PORT: API_PORT,
  WS_BASE: `ws://${API_HOST}:${API_PORT}/api/ws`,
  
  // Full endpoints
  ENDPOINTS: {
    // Auth
    LOGIN: `http://${API_HOST}:${API_PORT}/auth/login`,
    REGISTER: `http://${API_HOST}:${API_PORT}/auth/register`,
    GOOGLE_AUTH: `http://${API_HOST}:${API_PORT}/auth/google`,
    PROFILE_UPDATE: `http://${API_HOST}:${API_PORT}/auth/profile`,
    
    // Quizzes
    QUIZZES: `http://${API_HOST}:${API_PORT}/api/quizzes`,
    QUIZ_DETAIL: (id: string) => `http://${API_HOST}:${API_PORT}/api/quizzes/${id}`,
    QUIZ_REVIEWS: (id: string) => `http://${API_HOST}:${API_PORT}/api/quizzes/${id}/reviews`,
    
    // Results
    RESULTS: `http://${API_HOST}:${API_PORT}/api/results`,
    
    // Stats
    USER_STATS: (id: string) => `http://${API_HOST}:${API_PORT}/api/stats/${id}`,
    USER_HISTORY: (id: string) => `http://${API_HOST}:${API_PORT}/api/users/${id}/history`,
  }
};
