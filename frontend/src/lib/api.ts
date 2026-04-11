import axios from 'axios';

let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Production safety check: Ensure the URL is absolute and correctly formatted
if (typeof window !== 'undefined' && API_URL && !API_URL.startsWith('http')) {
  API_URL = `https://${API_URL}`;
}

// Ensure it ends with /api/v1
if (API_URL && !API_URL.endsWith('/api/v1') && !API_URL.endsWith('/api/v1/')) {
    API_URL = API_URL.endsWith('/') ? `${API_URL}api/v1` : `${API_URL}/api/v1`;
}

// Mock JWT token - In production, this would come from your auth service
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5MGFiIiwiZW1haWwiOiJjYW5kaWRhdGVAZXhhbXBsZS5jb20iLCJuYW1lIjoiSm9obiBEb2UiLCJyb2xlIjoiY2FuZGlkYXRlIn0.mock_signature';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem('auth_token') || MOCK_TOKEN;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authAPI = {
  signup: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/signup', { name, email, password });
    return response.data;
  },
  login: async (email: string, password: string) => {
    // OAuth2PasswordRequestForm expects form data
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};
export interface ExamStartRequest {
  skill_keywords: string[];
}

export interface Question {
  question_id: string;
  question_type: 'mcq' | 'coding' | 'descriptive';
  question_text: string;
  options?: any;
  difficulty_level: string;
  sequence_number: number;
}

export interface AnswerSubmitRequest {
  question_id: string;
  answer: string;
  time_taken: number;
}

export const examAPI = {
  startExam: async (data: ExamStartRequest) => {
    const response = await api.post('/exams/start', data);
    return response.data;
  },

  getExam: async (examId: string) => {
    const response = await api.get(`/exams/${examId}`);
    return response.data;
  },

  submitAnswer: async (examId: string, data: AnswerSubmitRequest) => {
    const response = await api.post(`/exams/${examId}/submit-answer`, data);
    return response.data;
  },

  completeExam: async (examId: string) => {
    const response = await api.post(`/exams/${examId}/complete`);
    return response.data;
  },
};

export const proctoringAPI = {
  sendVideoFrame: async (examId: string, frameData: string) => {
    const response = await api.post('/proctoring/video-frame', {
      exam_id: examId,
      frame_data: frameData,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  },

  sendAudioData: async (examId: string, audioData: string) => {
    const response = await api.post('/proctoring/audio-analysis', {
      exam_id: examId,
      audio_data: audioData,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  },

  saveBaselineFace: async (examId: string, frameData: string) => {
    const response = await api.post('/proctoring/setup/baseline-face', {
      exam_id: examId,
      frame_data: frameData,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  },

  verifyIdentity: async (examId: string, frameData: string) => {
    const response = await api.post('/proctoring/verify-identity', {
      exam_id: examId,
      frame_data: frameData,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  },

  logEvent: async (examId: string, eventType: string, severity: number, metadata: any) => {
    const response = await api.post('/proctoring/log-event', {
      exam_id: examId,
      event_type: eventType,
      severity,
      metadata,
    });
    return response.data;
  },

  getLogs: async (examId: string) => {
    const response = await api.get(`/proctoring/logs/${examId}`);
    return response.data;
  },
};

export const reportAPI = {
  getReport: async (examId: string) => {
    const response = await api.get(`/reports/${examId}`);
    return response.data;
  },
};

export default api;
