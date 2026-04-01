"""
LexaGPT Core Serializers
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.conf import settings
from .models import (
    User, Subscription, Payment, Project, Conversation,
    Message, MessageAttachment, Artifact, ArtifactVersion,
    TrainingDataset, TrainingSample, ModelTrainingRun,
    ModelEvaluation, ThinkingBenchmark, Notification,
    PlatformMetric, SearchQuery
)


# ══════════════════════════════════════════════════════════════════════════════
# AUTH SERIALIZERS
# ══════════════════════════════════════════════════════════════════════════════

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('An account with this email already exists')
        return value.lower()

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        email = validated_data['email']
        username = email.split('@')[0]
        base = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{counter}"
            counter += 1
        validated_data['username'] = username
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs['email'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled')
        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    current_plan = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'avatar', 'avatar_url', 'role', 'is_verified',
            'theme', 'timezone', 'language', 'current_plan',
            'total_messages_sent', 'total_tokens_used',
            'daily_messages_used', 'created_at', 'last_active',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_verified', 'total_messages_sent',
                            'total_tokens_used', 'daily_messages_used', 'created_at']

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None


class UserAdminSerializer(serializers.ModelSerializer):
    """Full user data for admin"""
    current_plan = serializers.ReadOnlyField()
    active_subscription = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_active_subscription(self, obj):
        sub = obj.active_subscription
        if sub:
            return SubscriptionSerializer(sub).data
        return None


# ══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION & PAYMENT SERIALIZERS
# ══════════════════════════════════════════════════════════════════════════════

class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']

    def get_plan_details(self, obj):
        return settings.SUBSCRIPTION_PLANS.get(obj.plan, {})


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']


class InitiateMpesaPaymentSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    plan = serializers.ChoiceField(choices=['premium', 'team', 'enterprise'])
    billing_cycle = serializers.ChoiceField(choices=['monthly', 'yearly'])

    def validate_phone_number(self, value):
        # Normalize Kenyan phone number
        phone = value.replace('+', '').replace(' ', '').replace('-', '')
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('7') or phone.startswith('1'):
            phone = '254' + phone
        if not phone.startswith('254') or len(phone) != 12:
            raise serializers.ValidationError('Enter a valid Kenyan phone number (e.g., 0712345678)')
        return phone


class InitiateCardPaymentSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=['premium', 'team', 'enterprise'])
    billing_cycle = serializers.ChoiceField(choices=['monthly', 'yearly'])


class InitiatePaypalPaymentSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=['premium', 'team', 'enterprise'])
    billing_cycle = serializers.ChoiceField(choices=['monthly', 'yearly'])


# ══════════════════════════════════════════════════════════════════════════════
# PROJECT SERIALIZERS
# ══════════════════════════════════════════════════════════════════════════════

class ProjectSerializer(serializers.ModelSerializer):
    conversation_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_conversation_count(self, obj):
        return obj.conversations.count()

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# ══════════════════════════════════════════════════════════════════════════════
# CONVERSATION SERIALIZERS
# ══════════════════════════════════════════════════════════════════════════════

class ConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'model', 'project', 'is_starred',
            'is_archived', 'total_tokens', 'last_message',
            'message_count', 'created_at', 'updated_at'
        ]

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {'content': msg.content[:100], 'role': msg.role, 'created_at': msg.created_at}
        return None

    def get_message_count(self, obj):
        return obj.messages.count()


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'total_tokens']

    def get_messages(self, obj):
        messages = obj.messages.select_related().prefetch_related('attachments', 'artifacts')
        return MessageSerializer(messages, many=True, context=self.context).data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = '__all__'


class ArtifactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artifact
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'version']


class MessageSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    artifacts = ArtifactSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'tokens_used',
                            'processing_time_ms', 'model_used']


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField()
    model = serializers.CharField(default='lexa-pro')
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    project_id = serializers.UUIDField(required=False, allow_null=True)
    attachments = serializers.ListField(child=serializers.FileField(), required=False)
    system_prompt = serializers.CharField(required=False, allow_blank=True)


# ══════════════════════════════════════════════════════════════════════════════
# ARTIFACT SERIALIZERS
# ══════════════════════════════════════════════════════════════════════════════

class ArtifactVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtifactVersion
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ArtifactDetailSerializer(serializers.ModelSerializer):
    versions = ArtifactVersionSerializer(many=True, read_only=True)

    class Meta:
        model = Artifact
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


# ══════════════════════════════════════════════════════════════════════════════
# TRAINING PLATFORM SERIALIZERS
# ══════════════════════════════════════════════════════════════════════════════

class TrainingDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingDataset
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at',
                            'total_samples', 'validated_samples', 'rejected_samples']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TrainingSampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingSample
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'quality_score']


class TrainingSampleBulkSerializer(serializers.Serializer):
    dataset_id = serializers.UUIDField()
    samples = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=1000
    )


class ModelTrainingRunSerializer(serializers.ModelSerializer):
    dataset_name = serializers.SerializerMethodField()
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = ModelTrainingRun
        fields = '__all__'
        read_only_fields = [
            'id', 'started_by', 'created_at', 'updated_at',
            'current_epoch', 'current_step', 'progress_percent',
            'train_loss', 'eval_loss', 'accuracy', 'started_at', 'completed_at'
        ]

    def get_dataset_name(self, obj):
        return obj.dataset.name if obj.dataset else None

    def get_duration_minutes(self, obj):
        if obj.started_at and obj.completed_at:
            delta = obj.completed_at - obj.started_at
            return round(delta.total_seconds() / 60, 1)
        return None

    def create(self, validated_data):
        validated_data['started_by'] = self.context['request'].user
        return super().create(validated_data)


class ModelEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelEvaluation
        fields = '__all__'


class ThinkingBenchmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThinkingBenchmark
        fields = '__all__'


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

class PlatformMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformMetric
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']


class SearchQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchQuery
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']