# LexaGPT — $2B AI Platform

> Next-generation AI assistant platform built for Africa and beyond. Django + React, M-Pesa payments, custom model training.

---

## 🏗️ Architecture

```
lexagpt/
├── backend/                  # Django REST API
│   ├── lexagpt/
│   │   ├── settings.py       # Full config: debug/prod, JWT, CORS, Celery, payments
│   │   ├── urls.py           # Main URL router
│   │   ├── asgi.py           # HTTP + WebSocket (Django Channels)
│   │   └── celery.py         # Celery app
│   ├── core/                 # Single Django app (all models)
│   │   ├── models.py         # All platform models
│   │   ├── serializers.py    # DRF serializers
│   │   ├── views.py          # All API views (SSE streaming)
│   │   ├── urls.py           # API routes
│   │   ├── consumers.py      # WebSocket consumers
│   │   ├── routing.py        # WebSocket URL routing
│   │   ├── tasks.py          # Celery async tasks
│   │   ├── middleware.py     # Timeout + rate limiting
│   │   ├── permissions.py    # Custom DRF permissions
│   │   ├── admin.py          # Django admin config
│   │   ├── signals.py        # Django signals
│   │   ├── pipeline.py       # Social auth pipeline
│   │   └── services/
│   │       ├── ai_service.py      # Lexa model inference (demo + prod)
│   │       └── payment_service.py # M-Pesa, Stripe, PayPal
│   └── requirements.txt
│
└── frontend/                 # React + Vite
    ├── index.html            # SEO-optimized entry (Bootstrap Icons, fonts)
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx          # React entry point
        ├── App.jsx           # Router + guards
        ├── services/api.js   # Full API layer (axios + SSE + WebSocket)
        ├── store/
        │   ├── authStore.js  # Auth state (Zustand)
        │   └── chatStore.js  # Chat/conversation state
        ├── styles/main.css   # Full responsive design system
        ├── components/
        │   ├── sidebar/Sidebar.jsx
        │   ├── ui/SearchOverlay.jsx
        │   └── modals/PaymentModal.jsx
        └── pages/
            ├── user/
            │   ├── LandingPage.jsx
            │   ├── LoginPage.jsx    (+ RegisterPage)
            │   ├── ChatPage.jsx     (main chat interface)
            │   ├── PricingPage.jsx
            │   ├── ProjectsPage.jsx (+ ArtifactsPage)
            │   └── SettingsPage.jsx
            └── admin/
                ├── AdminLayout.jsx
                ├── AdminDashboard.jsx
                ├── AdminUsers.jsx
                ├── AdminTraining.jsx  (model training platform)
                ├── AdminBenchmarks.jsx
                └── AdminMetrics.jsx
```

---

## 🚀 Quick Start

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment variables
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create superuser (admin)
python manage.py createsuperuser

# Start development server
python manage.py runserver

# In separate terminals:
# Redis (required for channels/celery in production)
redis-server

# Celery worker
celery -A lexagpt worker -l info

# Celery beat (scheduled tasks)
celery -A lexagpt beat -l info
```

### Frontend

```bash
cd frontend

npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 🔧 Environment Variables

Create `backend/.env`:

```env
# Core
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (leave empty for SQLite in DEBUG)
DB_NAME=lexagpt
DB_USER=lexagpt
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_HOST=127.0.0.1
REDIS_URL=redis://localhost:6379/0

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# M-Pesa (Safaricom Daraja)
MPESA_CONSUMER_KEY=your-mpesa-key
MPESA_CONSUMER_SECRET=your-mpesa-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback/

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=your-paypal-client
PAYPAL_CLIENT_SECRET=your-paypal-secret

# AI Models (production only)
LEXA_LITE_PATH=models/lexa-lite
LEXA_PRO_PATH=models/lexa-pro

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your@email.com
EMAIL_HOST_PASSWORD=your-app-password
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000
```

---

## 📦 Subscription Plans

| Plan | Price | Messages/day | Models |
|------|-------|-------------|--------|
| Free | $0 | 20 | Lexa Lite |
| Premium | $20/mo | 500 | Lite, Pro, Vision |
| Team | $30/mo | 2,000 | All + Ultra |
| Enterprise | $100/mo | Unlimited | All + Research |

**Kenyan pricing**: M-Pesa STK push at ~130 KES/USD exchange rate.

---

## 💳 Payment Flow

### M-Pesa (Demo Mode)
```
User enters phone → STK push simulated → Payment recorded → Subscription activated
```

### M-Pesa (Production)
```
User enters phone → Daraja API STK push → User enters PIN → Callback confirms → Subscription activated
```

### Card (Stripe)
```
User initiates → PaymentIntent created → Stripe.js handles card → Webhook confirms
```

### PayPal
```
User initiates → Order created → Redirect to PayPal → Return URL → Capture order
```

---

## 🤖 AI Model Training Platform

The admin training platform (`/admin/training`) allows:

1. **Create Datasets** — Upload or manually add prompt/response pairs
2. **Review Samples** — Human-in-the-loop quality control with approve/reject/flag
3. **Launch Training Runs** — Configure hyperparameters, start/pause/cancel
4. **Monitor Progress** — Real-time WebSocket updates with loss, accuracy metrics
5. **Evaluate Models** — Thinking benchmark system with category accuracy tracking
6. **Track Accuracy** — Radar charts, per-category breakdown, difficulty analysis

### Training Flow
```
Dataset → Sample Review → Training Run (with live WebSocket progress) → Evaluation → Deploy
```

### Debug Mode
In `DEBUG=True`, training runs simulate the training loop with realistic metrics.
In production, runs invoke actual PyTorch/HuggingFace training jobs.

---

## 🌐 API Endpoints

```
POST /api/auth/register/          Create account
POST /api/auth/login/             Login → JWT tokens
POST /api/auth/google/            Google OAuth
GET  /api/auth/profile/           Get/update profile

GET  /api/conversations/          List conversations
POST /api/conversations/          Create conversation
GET  /api/conversations/recent/   Recent chats
POST /api/chat/send/              Send message (SSE stream)

GET  /api/projects/               List projects
POST /api/artifacts/              Create artifact

POST /api/payments/mpesa/         M-Pesa STK push
POST /api/payments/stripe/        Stripe payment intent
POST /api/payments/paypal/        PayPal order
GET  /api/subscriptions/          Current subscription + usage

# Admin
GET  /api/admin/dashboard/        Platform overview
GET  /api/admin/users/            All users
POST /api/admin/training/runs/    Create training run
GET  /api/admin/benchmarks/accuracy_report/  Model accuracy

# WebSocket
ws://localhost:8000/ws/chat/{id}/          Real-time chat
ws://localhost:8000/ws/training/{run_id}/  Training progress
```

---

## 🎨 Design System

- **Font**: Syne (display) + DM Sans (body) + JetBrains Mono (code)
- **Colors**: Deep space dark (#08080f) + Electric cyan (#00d4ff) + Purple (#7c5cfc)
- **Responsive**: Mobile-first, works on all screen sizes
- **Theme**: CSS variables for easy theming

---

## 🔒 Security Features

- JWT authentication with refresh token rotation + blacklisting
- Session timeout (1 hour, configurable)
- Rate limiting per IP for anonymous users
- Per-plan message limits enforced server-side
- CORS configured for production domains
- Password validation (min 8 chars, common passwords blocked)

---

## 📊 Platform Features Checklist

- ✅ Email/password authentication
- ✅ Google OAuth login
- ✅ JWT with refresh tokens + blacklisting
- ✅ Session timeout (Claude-like)
- ✅ Real-time SSE message streaming
- ✅ WebSocket for live updates
- ✅ M-Pesa STK push payment (demo + production)
- ✅ Stripe card payment (demo + production)
- ✅ PayPal payment (demo + production)
- ✅ Free/Premium/Team/Enterprise plans
- ✅ Daily message limits per plan
- ✅ Projects organization
- ✅ Conversation history + search
- ✅ Artifacts (code, HTML, React, Markdown, SVG)
- ✅ File attachments
- ✅ Admin dashboard with analytics
- ✅ User management (admin)
- ✅ Model training platform
- ✅ Sample review workflow
- ✅ Thinking benchmark system
- ✅ Real-time training progress (WebSocket)
- ✅ Celery async tasks
- ✅ Platform metrics & charts
- ✅ SEO-optimized landing page
- ✅ Responsive design (mobile-first)
- ✅ Dark theme design system

---

## 🛣️ Roadmap

- [ ] Voice input/output
- [ ] Image generation
- [ ] Team collaboration (shared workspaces)
- [ ] API key management (for enterprise)
- [ ] Plugin/tool system
- [ ] Mobile apps (React Native)
- [ ] Model fine-tuning UI
- [ ] Lexa Research model (RAG-based)