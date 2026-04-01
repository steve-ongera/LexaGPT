"""
LexaGPT Core Models
Single application containing all platform models
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from django.conf import settings


# ══════════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('admin', 'Admin'),
        ('moderator', 'Moderator'),
        ('researcher', 'Researcher'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=50, unique=True, blank=True)
    first_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    google_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_active = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='Africa/Nairobi')
    language = models.CharField(max_length=10, default='en')
    theme = models.CharField(max_length=20, default='dark')

    # Usage tracking
    total_messages_sent = models.IntegerField(default=0)
    total_tokens_used = models.BigIntegerField(default=0)
    daily_messages_used = models.IntegerField(default=0)
    daily_reset_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email.split('@')[0]

    @property
    def active_subscription(self):
        return self.subscriptions.filter(
            status='active',
            end_date__gte=timezone.now()
        ).first()

    @property
    def current_plan(self):
        sub = self.active_subscription
        return sub.plan if sub else 'free'

    def can_send_message(self):
        plan_config = settings.SUBSCRIPTION_PLANS.get(self.current_plan, {})
        daily_limit = plan_config.get('features', {}).get('messages_per_day', 20)
        if daily_limit == -1:
            return True
        return self.daily_messages_used < daily_limit


# ══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTIONS & PAYMENTS
# ══════════════════════════════════════════════════════════════════════════════

class Subscription(models.Model):
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('premium', 'Premium'),
        ('team', 'Team'),
        ('enterprise', 'Enterprise'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('pending', 'Pending'),
        ('trial', 'Trial'),
    ]
    BILLING_CYCLE = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    billing_cycle = models.CharField(max_length=10, choices=BILLING_CYCLE, default='monthly')
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True)
    paypal_subscription_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.plan} ({self.status})"


class Payment(models.Model):
    METHOD_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('card', 'Credit/Debit Card'),
        ('paypal', 'PayPal'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    amount_ksh = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Transaction IDs per gateway
    transaction_id = models.CharField(max_length=200, blank=True)
    mpesa_receipt = models.CharField(max_length=50, blank=True)
    mpesa_phone = models.CharField(max_length=20, blank=True)
    stripe_payment_intent = models.CharField(max_length=100, blank=True)
    paypal_order_id = models.CharField(max_length=100, blank=True)

    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.method} - {self.amount} {self.currency}"


# ══════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ══════════════════════════════════════════════════════════════════════════════

class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    system_prompt = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#6366f1')
    icon = models.CharField(max_length=50, default='folder')
    is_archived = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.email} - {self.name}"


# ══════════════════════════════════════════════════════════════════════════════
# CONVERSATIONS & MESSAGES
# ══════════════════════════════════════════════════════════════════════════════

class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='conversations')
    title = models.CharField(max_length=200, blank=True, default='New Chat')
    model = models.CharField(max_length=50, default='lexa-pro')
    is_archived = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    is_shared = models.BooleanField(default=False)
    share_token = models.CharField(max_length=64, blank=True, unique=True, null=True)
    system_prompt = models.TextField(blank=True)
    total_tokens = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'conversations'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.email} - {self.title}"


class Message(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('streaming', 'Streaming'),
        ('completed', 'Completed'),
        ('error', 'Error'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    thinking = models.TextField(blank=True)  # Extended thinking
    status = models.StatusField = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    model_used = models.CharField(max_length=50, blank=True)
    tokens_used = models.IntegerField(default=0)
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    processing_time_ms = models.IntegerField(default=0)
    parent_message = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    feedback = models.IntegerField(null=True, blank=True)  # 1 = thumbs up, -1 = thumbs down
    feedback_text = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']


class MessageAttachment(models.Model):
    TYPE_CHOICES = [
        ('image', 'Image'),
        ('document', 'Document'),
        ('code', 'Code'),
        ('csv', 'CSV'),
        ('pdf', 'PDF'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='attachments/%Y/%m/')
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    file_size = models.IntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'message_attachments'


# ══════════════════════════════════════════════════════════════════════════════
# ARTIFACTS
# ══════════════════════════════════════════════════════════════════════════════

class Artifact(models.Model):
    TYPE_CHOICES = [
        ('code', 'Code'),
        ('html', 'HTML'),
        ('react', 'React Component'),
        ('svg', 'SVG'),
        ('markdown', 'Markdown'),
        ('mermaid', 'Mermaid Diagram'),
        ('text', 'Text Document'),
        ('csv', 'CSV Data'),
        ('json', 'JSON'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='artifacts', null=True, blank=True)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='artifacts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='artifacts')
    title = models.CharField(max_length=200)
    artifact_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='code')
    content = models.TextField()
    language = models.CharField(max_length=50, blank=True)
    version = models.IntegerField(default=1)
    is_published = models.BooleanField(default=False)
    publish_slug = models.CharField(max_length=100, blank=True, unique=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'artifacts'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.artifact_type})"


class ArtifactVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artifact = models.ForeignKey(Artifact, on_delete=models.CASCADE, related_name='versions')
    content = models.TextField()
    version_number = models.IntegerField()
    change_summary = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'artifact_versions'
        ordering = ['-version_number']


# ══════════════════════════════════════════════════════════════════════════════
# AI MODEL TRAINING PLATFORM
# ══════════════════════════════════════════════════════════════════════════════

class TrainingDataset(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('training', 'Training'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='datasets')
    total_samples = models.IntegerField(default=0)
    validated_samples = models.IntegerField(default=0)
    rejected_samples = models.IntegerField(default=0)
    file = models.FileField(upload_to='datasets/', null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'training_datasets'

    def __str__(self):
        return self.name


class TrainingSample(models.Model):
    QUALITY_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('flagged', 'Flagged'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(TrainingDataset, on_delete=models.CASCADE, related_name='samples')
    prompt = models.TextField()
    response = models.TextField()
    quality_score = models.FloatField(default=0.0)
    quality_status = models.CharField(max_length=20, choices=QUALITY_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    review_notes = models.TextField(blank=True)
    source = models.CharField(max_length=100, blank=True)  # synthetic, human, imported
    category = models.CharField(max_length=100, blank=True)
    language = models.CharField(max_length=10, default='en')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'training_samples'


class ModelTrainingRun(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('running', 'Running'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    model_name = models.CharField(max_length=100)
    base_model = models.CharField(max_length=100, blank=True)
    dataset = models.ForeignKey(TrainingDataset, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    started_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    # Training config
    config = models.JSONField(default=dict)
    hyperparameters = models.JSONField(default=dict)

    # Progress
    current_epoch = models.IntegerField(default=0)
    total_epochs = models.IntegerField(default=3)
    current_step = models.IntegerField(default=0)
    total_steps = models.IntegerField(default=0)
    progress_percent = models.FloatField(default=0.0)

    # Metrics
    train_loss = models.FloatField(null=True, blank=True)
    eval_loss = models.FloatField(null=True, blank=True)
    accuracy = models.FloatField(null=True, blank=True)
    perplexity = models.FloatField(null=True, blank=True)
    bleu_score = models.FloatField(null=True, blank=True)

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    model_path = models.CharField(max_length=500, blank=True)
    logs = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'model_training_runs'
        ordering = ['-created_at']


class ModelEvaluation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    training_run = models.ForeignKey(ModelTrainingRun, on_delete=models.CASCADE, related_name='evaluations')
    eval_type = models.CharField(max_length=50)  # 'accuracy', 'hallucination', 'reasoning', 'safety'
    score = models.FloatField()
    details = models.JSONField(default=dict)
    evaluated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'model_evaluations'


class ThinkingBenchmark(models.Model):
    """Tracks model thinking accuracy - for admin monitoring"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    model_name = models.CharField(max_length=100)
    question = models.TextField()
    expected_answer = models.TextField()
    model_answer = models.TextField()
    is_correct = models.BooleanField(default=False)
    reasoning_score = models.FloatField(default=0.0)
    category = models.CharField(max_length=100)  # math, logic, language, science, coding
    difficulty = models.CharField(max_length=20)  # easy, medium, hard
    evaluated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'thinking_benchmarks'


# ══════════════════════════════════════════════════════════════════════════════
# SEARCH
# ══════════════════════════════════════════════════════════════════════════════

class SearchQuery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='searches')
    query = models.CharField(max_length=500)
    results_count = models.IntegerField(default=0)
    conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'search_queries'
        ordering = ['-created_at']


# ══════════════════════════════════════════════════════════════════════════════
# PLATFORM ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

class PlatformMetric(models.Model):
    date = models.DateField(unique=True)
    total_users = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)
    new_users = models.IntegerField(default=0)
    total_messages = models.BigIntegerField(default=0)
    total_tokens = models.BigIntegerField(default=0)
    revenue_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    revenue_ksh = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    free_users = models.IntegerField(default=0)
    premium_users = models.IntegerField(default=0)
    team_users = models.IntegerField(default=0)
    enterprise_users = models.IntegerField(default=0)

    class Meta:
        db_table = 'platform_metrics'
        ordering = ['-date']


class UserSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_token = models.CharField(max_length=255, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_sessions'


class Notification(models.Model):
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('payment', 'Payment'),
        ('system', 'System'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']