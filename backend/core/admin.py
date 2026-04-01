"""LexaGPT Django Admin Configuration"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Subscription, Payment, Project, Conversation,
    Message, Artifact, TrainingDataset, TrainingSample,
    ModelTrainingRun, ThinkingBenchmark, Notification, PlatformMetric
)

admin.site.site_header = "LexaGPT Admin"
admin.site.site_title = "LexaGPT"
admin.site.index_title = "Platform Management"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'role', 'current_plan', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'is_verified', 'created_at']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('first_name', 'last_name', 'username', 'avatar')}),
        ('Platform', {'fields': ('role', 'is_verified', 'theme', 'timezone')}),
        ('Usage', {'fields': ('total_messages_sent', 'total_tokens_used', 'daily_messages_used')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 'role'),
        }),
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'status', 'billing_cycle', 'start_date', 'end_date']
    list_filter = ['plan', 'status', 'billing_cycle']
    search_fields = ['user__email']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['user', 'method', 'status', 'amount', 'currency', 'created_at']
    list_filter = ['method', 'status', 'currency']
    search_fields = ['user__email', 'transaction_id', 'mpesa_receipt']
    readonly_fields = ['transaction_id', 'mpesa_receipt', 'created_at']


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'model', 'total_tokens', 'created_at']
    search_fields = ['user__email', 'title']
    list_filter = ['model', 'is_archived', 'is_starred']


@admin.register(ModelTrainingRun)
class TrainingRunAdmin(admin.ModelAdmin):
    list_display = ['name', 'model_name', 'status', 'progress_percent', 'started_at']
    list_filter = ['status']
    readonly_fields = ['current_epoch', 'current_step', 'progress_percent', 'train_loss', 'accuracy']


@admin.register(TrainingDataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'total_samples', 'validated_samples', 'created_at']
    list_filter = ['status']


@admin.register(ThinkingBenchmark)
class BenchmarkAdmin(admin.ModelAdmin):
    list_display = ['model_name', 'category', 'difficulty', 'is_correct', 'reasoning_score', 'evaluated_at']
    list_filter = ['model_name', 'category', 'difficulty', 'is_correct']


admin.site.register(Project)
admin.site.register(Message)
admin.site.register(Artifact)
admin.site.register(TrainingSample)
admin.site.register(Notification)
admin.site.register(PlatformMetric)