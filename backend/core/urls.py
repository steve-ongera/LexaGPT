"""
LexaGPT Core App URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet, basename='projects')
router.register(r'conversations', views.ConversationViewSet, basename='conversations')
router.register(r'artifacts', views.ArtifactViewSet, basename='artifacts')
# Admin routes
router.register(r'admin/users', views.AdminUserViewSet, basename='admin-users')
router.register(r'admin/training/datasets', views.TrainingDatasetViewSet, basename='training-datasets')
router.register(r'admin/training/samples', views.TrainingSampleViewSet, basename='training-samples')
router.register(r'admin/training/runs', views.ModelTrainingRunViewSet, basename='training-runs')
router.register(r'admin/benchmarks', views.ThinkingBenchmarkViewSet, basename='benchmarks')

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/google/', views.GoogleAuthView.as_view(), name='google-auth'),
    path('auth/profile/', views.UserProfileView.as_view(), name='profile'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change-password'),

    # ── Chat ──────────────────────────────────────────────────────────────────
    path('chat/send/', views.SendMessageView.as_view(), name='send-message'),
    path('chat/messages/<uuid:message_id>/regenerate/', views.RegenerateMessageView.as_view(), name='regenerate'),
    path('chat/messages/<uuid:message_id>/feedback/', views.MessageFeedbackView.as_view(), name='feedback'),

    # ── Search ────────────────────────────────────────────────────────────────
    path('search/', views.SearchView.as_view(), name='search'),

    # ── Payments ──────────────────────────────────────────────────────────────
    path('subscriptions/', views.SubscriptionView.as_view(), name='subscription'),
    path('payments/mpesa/', views.MpesaPaymentView.as_view(), name='mpesa-pay'),
    path('payments/mpesa/callback/', views.MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('payments/stripe/', views.StripePaymentView.as_view(), name='stripe-pay'),
    path('payments/paypal/', views.PaypalPaymentView.as_view(), name='paypal-pay'),
    path('payments/history/', views.PaymentHistoryView.as_view(), name='payment-history'),

    # ── Notifications ─────────────────────────────────────────────────────────
    path('notifications/', views.NotificationView.as_view(), name='notifications'),

    # ── Admin ─────────────────────────────────────────────────────────────────
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/metrics/', views.PlatformMetricsView.as_view(), name='platform-metrics'),

    # ── Router ────────────────────────────────────────────────────────────────
    path('', include(router.urls)),
]