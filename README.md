# AI-Powered Interview Examination System

Complete full-stack application with AI-powered question generation, adaptive difficulty, and integrated proctoring.

## 🚀 Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your Gemini API key and database credentials

# Create database
createdb interview_system

# Run migrations
alembic upgrade head

# Seed keywords
python scripts\seed_keywords.py

# Start server
uvicorn app.main:app --reload
```

Backend will run at: http://localhost:8000
API Docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local

# Start development server
npm run dev
```

Frontend will run at: http://localhost:3000

## 📁 Project Structure

```
Python interview/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/v1/            # REST endpoints
│   │   ├── core/              # Database, cache, security
│   │   ├── models/            # SQLAlchemy models
│   │   ├── services/          # Business logic
│   │   └── main.py
│   ├── alembic/               # Migrations
│   ├── scripts/               # Utility scripts
│   └── requirements.txt
│
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/               # Pages (Next.js 14)
│   │   ├── components/        # React components
│   │   ├── lib/               # API client
│   │   └── store/             # State management
│   └── package.json
│
└── README.md
```

## ✨ Features

### Backend
- ✅ AI-powered question generation (Gemini)
- ✅ Adaptive difficulty system
- ✅ MCQ, coding, and descriptive questions
- ✅ Real-time proctoring API
- ✅ Integrity scoring algorithm
- ✅ Comprehensive AI reports
- ✅ JWT token validation

### Frontend
- ✅ Modern, responsive UI
- ✅ Real-time camera monitoring
- ✅ Monaco code editor for coding questions
- ✅ Live integrity score display
- ✅ Comprehensive report visualization
- ✅ Smooth animations and transitions

## 🔑 Key Technologies

**Backend:**
- FastAPI (Python)
- PostgreSQL + SQLAlchemy
- Redis
- Google Gemini AI
- Alembic migrations

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Monaco Editor
- React Webcam

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/interview_system
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 🧪 Testing

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm run lint
npm run build  # Test production build
```

## 📖 API Documentation

Once backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🔐 Authentication

> **Note:** Authentication is handled by an external service. The system validates JWT tokens.

Mock token is provided in `frontend/src/lib/api.ts` for development.

## 🎯 Usage Flow

1. **Start Exam** - Select skills to test
2. **Answer Questions** - MCQ, coding, or descriptive
3. **Proctoring** - Camera monitors face presence
4. **Submit Answers** - AI evaluates in real-time
5. **Adaptive Difficulty** - Questions adjust based on performance
6. **Complete Exam** - View comprehensive AI-generated report

## 🚧 Production Deployment

### Backend
- Use Gunicorn/Uvicorn workers
- Setup PostgreSQL and Redis
- Configure S3 for video clips
- Add proper JWT secret
- Enable HTTPS

### Frontend
- Build: `npm run build`
- Deploy to Vercel/Netlify
- Configure environment variables
- Enable production optimizations

## 📄 License

MIT

## 🤝 Contributing

This is a demonstration project. For production use, implement:
- Actual computer vision (MediaPipe)
- Audio analysis (speech recognition)
- WebSocket real-time updates
- Video clip storage (S3)
- Production authentication
- Rate limiting
- Comprehensive testing
