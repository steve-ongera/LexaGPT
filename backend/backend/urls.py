"""
LexaGPT - Main URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # ── Admin ──────────────────────────────────────────────────────────────────
    path('admin/', admin.site.urls),

    # ── API v1 ─────────────────────────────────────────────────────────────────
    path('api/', include('core.urls')),

    # ── JWT Refresh ────────────────────────────────────────────────────────────
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ── Social Auth (Google OAuth) ─────────────────────────────────────────────
    path('auth/', include('social_django.urls', namespace='social')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)