"""
LexaGPT - $2 Billion AI Platform
Django Settings - Core Configuration
"""
 
import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-z11e$db5712e%l9fyq7u@l#^+nvb71yey5rw@%*$+2n(+r^o6z'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',
    'social_django',
    'django_filters',
    # LexaGPT Core
    'core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'social_django.middleware.SocialAuthExceptionMiddleware',
    'core.middleware.RequestTimeoutMiddleware',
    'core.middleware.RateLimitMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'social_django.context_processors.backends',
                'social_django.context_processors.login_redirect',
            ],
        },
    },
]



WSGI_APPLICATION = 'backend.wsgi.application'
ASGI_APPLICATION = 'backend.asgi.application'

# ─── DATABASE ──────────────────────────────────────────────────────────────────
if DEBUG:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='lexagpt'),
            'USER': config('DB_USER', default='lexagpt'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': 60,
        }
    }


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

# ─── AUTH ──────────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'core.User'
 
AUTHENTICATION_BACKENDS = [
    'social_core.backends.google.GoogleOAuth2',
    'django.contrib.auth.backends.ModelBackend',
]
 
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ─── JWT ──────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}
 
# ─── REST FRAMEWORK ────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.CursorPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/hour',
        'user': '1000/hour',
        'free_tier': '50/day',
        'premium': '2000/day',
        'enterprise': '10000/day',
    },
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}
 
# ─── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000',
    cast=Csv()
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type',
    'dnt', 'origin', 'user-agent', 'x-csrftoken', 'x-requested-with',
]
 
# ─── CHANNELS / WEBSOCKET ──────────────────────────────────────────────────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [(config('REDIS_HOST', default='127.0.0.1'), 6379)],
        },
    } if not DEBUG else {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}
 
# ─── CELERY ────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Nairobi'
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-sessions': {
        'task': 'core.tasks.cleanup_expired_sessions',
        'schedule': timedelta(hours=6),
    },
    'reset-daily-usage': {
        'task': 'core.tasks.reset_daily_usage',
        'schedule': timedelta(hours=24),
    },
    'train-model-checkpoint': {
        'task': 'core.tasks.run_training_checkpoint',
        'schedule': timedelta(hours=12),
    },
}
 
# ─── GOOGLE OAUTH ──────────────────────────────────────────────────────────────
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = config('GOOGLE_CLIENT_ID', default='demo-google-client-id')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = config('GOOGLE_CLIENT_SECRET', default='demo-google-secret')
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = ['email', 'profile']
SOCIAL_AUTH_GOOGLE_OAUTH2_EXTRA_DATA = ['first_name', 'last_name']
SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.user.create_user',
    'core.pipeline.save_profile',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)
SOCIAL_AUTH_USER_MODEL = 'core.User'
LOGIN_URL = '/api/auth/login/'
LOGIN_REDIRECT_URL = '/'
 
# ─── PAYMENT GATEWAYS ─────────────────────────────────────────────────────────
# M-PESA (Safaricom Daraja API)
MPESA_CONSUMER_KEY = config('MPESA_CONSUMER_KEY', default='demo_mpesa_key')
MPESA_CONSUMER_SECRET = config('MPESA_CONSUMER_SECRET', default='demo_mpesa_secret')
MPESA_SHORTCODE = config('MPESA_SHORTCODE', default='174379')
MPESA_PASSKEY = config('MPESA_PASSKEY', default='demo_passkey')
MPESA_CALLBACK_URL = config('MPESA_CALLBACK_URL', default='http://localhost:8000/api/payments/mpesa/callback/')
MPESA_ENV = 'sandbox' if DEBUG else 'production'
MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke' if DEBUG else 'https://api.safaricom.co.ke'
 
# STRIPE (Card)
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='pk_test_demo')
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='sk_test_demo')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='whsec_demo')
 
# PAYPAL
PAYPAL_CLIENT_ID = config('PAYPAL_CLIENT_ID', default='demo_paypal_client')
PAYPAL_CLIENT_SECRET = config('PAYPAL_CLIENT_SECRET', default='demo_paypal_secret')
PAYPAL_MODE = 'sandbox' if DEBUG else 'live'
 
# ─── SUBSCRIPTION PLANS ────────────────────────────────────────────────────────
SUBSCRIPTION_PLANS = {
    'free': {
        'name': 'Free',
        'price_monthly': 0,
        'price_yearly': 0,
        'currency': 'USD',
        'features': {
            'messages_per_day': 20,
            'max_context_tokens': 8192,
            'models': ['lexa-lite'],
            'artifacts': True,
            'code_execution': False,
            'priority_support': False,
            'file_uploads': 3,
            'projects': 3,
        }
    },
    'premium': {
        'name': 'Premium',
        'price_monthly': 20,
        'price_yearly': 200,
        'currency': 'USD',
        'features': {
            'messages_per_day': 500,
            'max_context_tokens': 200000,
            'models': ['lexa-lite', 'lexa-pro', 'lexa-vision'],
            'artifacts': True,
            'code_execution': True,
            'priority_support': True,
            'file_uploads': 50,
            'projects': 50,
        }
    },
    'team': {
        'name': 'Team',
        'price_monthly': 30,
        'price_yearly': 300,
        'currency': 'USD',
        'features': {
            'messages_per_day': 2000,
            'max_context_tokens': 200000,
            'models': ['lexa-lite', 'lexa-pro', 'lexa-vision', 'lexa-ultra'],
            'artifacts': True,
            'code_execution': True,
            'priority_support': True,
            'file_uploads': 500,
            'projects': -1,  # unlimited
            'team_members': 5,
        }
    },
    'enterprise': {
        'name': 'Enterprise',
        'price_monthly': 100,
        'price_yearly': 1000,
        'currency': 'USD',
        'features': {
            'messages_per_day': -1,  # unlimited
            'max_context_tokens': 1000000,
            'models': ['lexa-lite', 'lexa-pro', 'lexa-vision', 'lexa-ultra', 'lexa-research'],
            'artifacts': True,
            'code_execution': True,
            'priority_support': True,
            'dedicated_support': True,
            'file_uploads': -1,
            'projects': -1,
            'team_members': -1,
            'custom_models': True,
            'api_access': True,
        }
    }
}
 
# ─── AI MODELS CONFIG ─────────────────────────────────────────────────────────
LEXA_MODELS = {
    'lexa-lite': {
        'display_name': 'Lexa Lite',
        'description': 'Fast and efficient for everyday tasks',
        'max_tokens': 8192,
        'context_window': 32768,
        'model_path': config('LEXA_LITE_PATH', default='models/lexa-lite'),
    },
    'lexa-pro': {
        'display_name': 'Lexa Pro',
        'description': 'Advanced reasoning and analysis',
        'max_tokens': 32768,
        'context_window': 200000,
        'model_path': config('LEXA_PRO_PATH', default='models/lexa-pro'),
    },
    'lexa-vision': {
        'display_name': 'Lexa Vision',
        'description': 'Multimodal: text + image understanding',
        'max_tokens': 32768,
        'context_window': 200000,
        'model_path': config('LEXA_VISION_PATH', default='models/lexa-vision'),
    },
    'lexa-ultra': {
        'display_name': 'Lexa Ultra',
        'description': 'Most powerful model for complex tasks',
        'max_tokens': 100000,
        'context_window': 1000000,
        'model_path': config('LEXA_ULTRA_PATH', default='models/lexa-ultra'),
    },
}
 
# ─── SESSION TIMEOUT ──────────────────────────────────────────────────────────
SESSION_COOKIE_AGE = 3600  # 1 hour like Claude AI
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = True
REQUEST_TIMEOUT_SECONDS = 300  # 5 min per AI request
 
# ─── STATIC & MEDIA ────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
 
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
 
# ─── EMAIL ─────────────────────────────────────────────────────────────────────
if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
    EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
 
DEFAULT_FROM_EMAIL = 'LexaGPT <noreply@lexagpt.com>'
 
# ─── LOGGING ──────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs/lexagpt.log',
            'formatter': 'verbose',
        } if not DEBUG else {'class': 'logging.StreamHandler'},
    },
    'loggers': {
        'django': {'handlers': ['console'], 'level': 'INFO'},
        'core': {'handlers': ['console'], 'level': 'DEBUG' if DEBUG else 'INFO', 'propagate': False},
    },
}
 
# ─── INTERNATIONALIZATION ─────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'