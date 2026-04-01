"""
LexaGPT Core Views - Full async-capable REST API
"""
import json
import uuid
import asyncio
import logging
import secrets
from datetime import timedelta

from django.utils import timezone
from django.conf import settings
from django.db import transaction
from django.db.models import Q, Count, Sum
from django.http import StreamingHttpResponse
from django.contrib.auth import login, logout
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    User, Subscription, Payment, Project, Conversation,
    Message, MessageAttachment, Artifact, ArtifactVersion,
    TrainingDataset, TrainingSample, ModelTrainingRun,
    ModelEvaluation, ThinkingBenchmark, Notification,
    PlatformMetric, UserSession, SearchQuery
)
from .serializers import *
from .permissions import IsAdminOrModerator, IsPremiumUser, CanSendMessage
from .ai_service import LexaAIService
from .payment_service import MpesaService, StripeService, PaypalService

logger = logging.getLogger('core')
ai_service = LexaAIService()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


# ══════════════════════════════════════════════════════════════════════════════
# AUTH VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                user = serializer.save()
                # Create free subscription
                Subscription.objects.create(
                    user=user,
                    plan='free',
                    status='active',
                )
                tokens = get_tokens_for_user(user)
                logger.info(f"New user registered: {user.email}")
                return Response({
                    'message': 'Account created successfully',
                    'user': UserProfileSerializer(user, context={'request': request}).data,
                    'tokens': tokens,
                }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            user.last_active = timezone.now()
            user.save(update_fields=['last_active'])
            tokens = get_tokens_for_user(user)
            return Response({
                'message': 'Login successful',
                'user': UserProfileSerializer(user, context={'request': request}).data,
                'tokens': tokens,
            })
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'message': 'Logged out'})


class GoogleAuthView(APIView):
    """Handle Google OAuth token from frontend"""
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('access_token')
        if not token:
            return Response({'error': 'Access token required'}, status=400)

        if settings.DEBUG:
            # Demo mode - create/find demo google user
            email = request.data.get('email', 'demo.google@lexagpt.com')
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': request.data.get('given_name', 'Demo'),
                    'last_name': request.data.get('family_name', 'User'),
                    'google_id': request.data.get('sub', 'demo_google_id'),
                    'is_verified': True,
                    'username': email.split('@')[0],
                }
            )
            if created:
                Subscription.objects.create(user=user, plan='free', status='active')
        else:
            # Verify with Google in production
            import requests as req
            google_resp = req.get(
                f'https://www.googleapis.com/oauth2/v1/userinfo?access_token={token}'
            )
            if google_resp.status_code != 200:
                return Response({'error': 'Invalid Google token'}, status=401)
            google_data = google_resp.json()
            email = google_data.get('email')
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': google_data.get('given_name', ''),
                    'last_name': google_data.get('family_name', ''),
                    'google_id': google_data.get('id'),
                    'is_verified': True,
                    'username': email.split('@')[0],
                }
            )
            if created:
                Subscription.objects.create(user=user, plan='free', status='active')

        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserProfileSerializer(user, context={'request': request}).data,
            'tokens': tokens,
            'is_new': created,
        })


class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not request.user.check_password(old_password):
            return Response({'error': 'Current password is incorrect'}, status=400)
        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters'}, status=400)
        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password changed successfully'})


# ══════════════════════════════════════════════════════════════════════════════
# PROJECT VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(
            user=self.request.user,
            is_archived=self.request.query_params.get('archived', 'false') == 'true'
        ).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        project = self.get_object()
        project.is_archived = not project.is_archived
        project.save()
        return Response({'archived': project.is_archived})

    @action(detail=True, methods=['post'])
    def star(self, request, pk=None):
        project = self.get_object()
        project.is_starred = not project.is_starred
        project.save()
        return Response({'starred': project.is_starred})


# ══════════════════════════════════════════════════════════════════════════════
# CONVERSATION VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        return ConversationListSerializer

    def get_queryset(self):
        qs = Conversation.objects.filter(user=self.request.user)
        project_id = self.request.query_params.get('project')
        archived = self.request.query_params.get('archived', 'false') == 'true'
        search = self.request.query_params.get('search', '')

        qs = qs.filter(is_archived=archived)
        if project_id:
            qs = qs.filter(project_id=project_id)
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(messages__content__icontains=search)
            ).distinct()
        return qs.order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def star(self, request, pk=None):
        conv = self.get_object()
        conv.is_starred = not conv.is_starred
        conv.save()
        return Response({'starred': conv.is_starred})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        conv = self.get_object()
        conv.is_archived = not conv.is_archived
        conv.save()
        return Response({'archived': conv.is_archived})

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        conv = self.get_object()
        if not conv.share_token:
            conv.share_token = secrets.token_urlsafe(32)
        conv.is_shared = True
        conv.save()
        return Response({'share_url': f'/share/{conv.share_token}'})

    @action(detail=False, methods=['get'])
    def recent(self, request):
        convs = Conversation.objects.filter(
            user=request.user,
            is_archived=False
        ).order_by('-updated_at')[:10]
        return Response(ConversationListSerializer(convs, many=True).data)

    @action(detail=False, methods=['get'])
    def starred(self, request):
        convs = Conversation.objects.filter(
            user=request.user,
            is_starred=True,
            is_archived=False
        ).order_by('-updated_at')
        return Response(ConversationListSerializer(convs, many=True).data)


# ══════════════════════════════════════════════════════════════════════════════
# AI CHAT VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        user = request.user
        if not user.can_send_message():
            return Response({
                'error': 'Daily message limit reached',
                'upgrade_url': '/pricing',
                'current_plan': user.current_plan,
            }, status=429)

        data = serializer.validated_data

        with transaction.atomic():
            # Get or create conversation
            if data.get('conversation_id'):
                try:
                    conversation = Conversation.objects.get(
                        id=data['conversation_id'],
                        user=user
                    )
                except Conversation.DoesNotExist:
                    return Response({'error': 'Conversation not found'}, status=404)
            else:
                conversation = Conversation.objects.create(
                    user=user,
                    model=data.get('model', 'lexa-pro'),
                    project_id=data.get('project_id'),
                    system_prompt=data.get('system_prompt', ''),
                )

            # Save user message
            user_message = Message.objects.create(
                conversation=conversation,
                role='user',
                content=data['content'],
                status='completed',
            )

            # Get conversation history
            history = list(conversation.messages.exclude(
                id=user_message.id
            ).order_by('created_at').values('role', 'content'))

            # Create assistant message placeholder
            assistant_message = Message.objects.create(
                conversation=conversation,
                role='assistant',
                content='',
                status='streaming',
                model_used=data.get('model', 'lexa-pro'),
            )

        # Stream response
        return StreamingHttpResponse(
            self._stream_response(
                user, conversation, user_message, assistant_message,
                history, data['content'], data.get('model', 'lexa-pro')
            ),
            content_type='text/event-stream',
        )

    def _stream_response(self, user, conversation, user_msg, asst_msg, history, content, model):
        """Generator for SSE streaming"""
        full_response = ''
        tokens_used = 0

        try:
            yield f"data: {json.dumps({'type': 'start', 'message_id': str(asst_msg.id)})}\n\n"

            for chunk in ai_service.stream_response(content, history, model, user):
                if chunk.get('type') == 'text':
                    text = chunk['text']
                    full_response += text
                    yield f"data: {json.dumps({'type': 'text', 'text': text})}\n\n"
                elif chunk.get('type') == 'done':
                    tokens_used = chunk.get('tokens', 0)
                    break

            # Finalize
            with transaction.atomic():
                asst_msg.content = full_response
                asst_msg.status = 'completed'
                asst_msg.tokens_used = tokens_used
                asst_msg.save()

                conversation.total_tokens += tokens_used
                conversation.updated_at = timezone.now()
                # Auto-generate title from first message
                if conversation.title == 'New Chat' and len(conversation.messages.all()) <= 3:
                    conversation.title = content[:60] + ('...' if len(content) > 60 else '')
                conversation.save()

                user.total_messages_sent += 1
                user.daily_messages_used += 1
                user.total_tokens_used += tokens_used
                user.save(update_fields=['total_messages_sent', 'daily_messages_used', 'total_tokens_used'])

            yield f"data: {json.dumps({'type': 'done', 'conversation_id': str(conversation.id), 'tokens': tokens_used})}\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            asst_msg.status = 'error'
            asst_msg.save()
            yield f"data: {json.dumps({'type': 'error', 'message': 'An error occurred'})}\n\n"


class RegenerateMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id, conversation__user=request.user)
        except Message.DoesNotExist:
            return Response({'error': 'Message not found'}, status=404)

        # Get context up to this message
        conversation = message.conversation
        history = list(conversation.messages.filter(
            created_at__lt=message.created_at
        ).order_by('created_at').values('role', 'content'))

        # Find the user message before this
        user_prompt = ''
        if history:
            user_prompt = history[-1]['content']

        return StreamingHttpResponse(
            self._stream_regeneration(request.user, conversation, message, history[:-1], user_prompt),
            content_type='text/event-stream',
        )

    def _stream_regeneration(self, user, conversation, message, history, prompt):
        full_response = ''
        message.status = 'streaming'
        message.save()

        try:
            yield f"data: {json.dumps({'type': 'start'})}\n\n"
            for chunk in ai_service.stream_response(prompt, history, message.model_used or 'lexa-pro', user):
                if chunk.get('type') == 'text':
                    full_response += chunk['text']
                    yield f"data: {json.dumps({'type': 'text', 'text': chunk['text']})}\n\n"
                elif chunk.get('type') == 'done':
                    break

            message.content = full_response
            message.status = 'completed'
            message.is_edited = True
            message.save()
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error(f"Regeneration error: {e}")
            message.status = 'error'
            message.save()
            yield f"data: {json.dumps({'type': 'error'})}\n\n"


class MessageFeedbackView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id, conversation__user=request.user)
        except Message.DoesNotExist:
            return Response({'error': 'Message not found'}, status=404)
        message.feedback = request.data.get('feedback')
        message.feedback_text = request.data.get('feedback_text', '')
        message.save()
        return Response({'message': 'Feedback saved'})


# ══════════════════════════════════════════════════════════════════════════════
# ARTIFACT VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class ArtifactViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ArtifactSerializer

    def get_queryset(self):
        return Artifact.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        artifact = serializer.save(user=self.request.user)
        ArtifactVersion.objects.create(
            artifact=artifact,
            content=artifact.content,
            version_number=1,
        )

    def perform_update(self, serializer):
        artifact = serializer.save()
        artifact.version += 1
        artifact.save()
        ArtifactVersion.objects.create(
            artifact=artifact,
            content=artifact.content,
            version_number=artifact.version,
        )

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        artifact = self.get_object()
        versions = artifact.versions.order_by('-version_number')
        return Response(ArtifactVersionSerializer(versions, many=True).data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        artifact = self.get_object()
        if not artifact.publish_slug:
            artifact.publish_slug = secrets.token_urlsafe(16)
        artifact.is_published = True
        artifact.save()
        return Response({'publish_url': f'/artifacts/{artifact.publish_slug}'})


# ══════════════════════════════════════════════════════════════════════════════
# SEARCH VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class SearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'results': []})

        # Log search
        SearchQuery.objects.create(user=request.user, query=query)

        # Search conversations
        conversations = Conversation.objects.filter(
            user=request.user,
            is_archived=False
        ).filter(
            Q(title__icontains=query) |
            Q(messages__content__icontains=query)
        ).distinct()[:10]

        # Search messages
        messages = Message.objects.filter(
            conversation__user=request.user,
            content__icontains=query
        ).select_related('conversation')[:20]

        return Response({
            'query': query,
            'conversations': ConversationListSerializer(conversations, many=True).data,
            'messages': [
                {
                    'id': str(m.id),
                    'content': m.content[:200],
                    'conversation_id': str(m.conversation.id),
                    'conversation_title': m.conversation.title,
                    'created_at': m.created_at,
                }
                for m in messages
            ]
        })


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class SubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sub = request.user.active_subscription
        plans = settings.SUBSCRIPTION_PLANS
        return Response({
            'current_subscription': SubscriptionSerializer(sub).data if sub else None,
            'available_plans': plans,
            'usage': {
                'daily_messages_used': request.user.daily_messages_used,
                'daily_limit': plans.get(request.user.current_plan, {}).get('features', {}).get('messages_per_day', 20),
                'total_tokens': request.user.total_tokens_used,
            }
        })


class MpesaPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InitiateMpesaPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        plan_config = settings.SUBSCRIPTION_PLANS[data['plan']]
        amount_usd = plan_config['price_monthly'] if data['billing_cycle'] == 'monthly' else plan_config['price_yearly']
        amount_ksh = int(amount_usd * 130)  # Approximate USD to KES rate

        if settings.DEBUG:
            # Demo: simulate M-Pesa push
            payment = Payment.objects.create(
                user=request.user,
                method='mpesa',
                status='pending',
                amount=amount_usd,
                currency='USD',
                amount_ksh=amount_ksh,
                mpesa_phone=data['phone_number'],
                transaction_id=f'DEMO_{uuid.uuid4().hex[:8].upper()}',
                metadata={'plan': data['plan'], 'billing_cycle': data['billing_cycle']}
            )
            return Response({
                'message': f'[DEMO] M-Pesa STK push sent to {data["phone_number"]}',
                'payment_id': str(payment.id),
                'checkout_request_id': f'DEMO-{uuid.uuid4().hex[:12].upper()}',
                'demo_mode': True,
                'instructions': 'In production, enter your M-Pesa PIN on your phone',
            })
        else:
            mpesa = MpesaService()
            result = mpesa.initiate_stk_push(
                phone=data['phone_number'],
                amount=amount_ksh,
                account_ref=f'LEXA-{request.user.id}',
                description=f'LexaGPT {data["plan"]} subscription'
            )
            if result.get('ResponseCode') == '0':
                payment = Payment.objects.create(
                    user=request.user,
                    method='mpesa',
                    status='pending',
                    amount=amount_usd,
                    currency='USD',
                    amount_ksh=amount_ksh,
                    mpesa_phone=data['phone_number'],
                    transaction_id=result.get('CheckoutRequestID', ''),
                    metadata={
                        'plan': data['plan'],
                        'billing_cycle': data['billing_cycle'],
                        'checkout_request_id': result.get('CheckoutRequestID')
                    }
                )
                return Response({
                    'message': f'M-Pesa push sent to {data["phone_number"]}. Enter PIN to complete.',
                    'payment_id': str(payment.id),
                    'checkout_request_id': result.get('CheckoutRequestID'),
                })
            return Response({'error': result.get('errorMessage', 'M-Pesa error')}, status=400)


class MpesaCallbackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        """Handle M-Pesa payment confirmation callback"""
        callback_data = request.data.get('Body', {}).get('stkCallback', {})
        result_code = callback_data.get('ResultCode')
        checkout_request_id = callback_data.get('CheckoutRequestID')

        try:
            payment = Payment.objects.get(transaction_id=checkout_request_id)
            if result_code == 0:
                # Extract receipt
                metadata = callback_data.get('CallbackMetadata', {}).get('Item', [])
                receipt = next((i['Value'] for i in metadata if i['Name'] == 'MpesaReceiptNumber'), '')
                payment.status = 'completed'
                payment.mpesa_receipt = receipt
                payment.save()

                # Activate subscription
                plan = payment.metadata.get('plan', 'premium')
                billing_cycle = payment.metadata.get('billing_cycle', 'monthly')
                months = 1 if billing_cycle == 'monthly' else 12
                Subscription.objects.update_or_create(
                    user=payment.user,
                    defaults={
                        'plan': plan,
                        'status': 'active',
                        'billing_cycle': billing_cycle,
                        'start_date': timezone.now(),
                        'end_date': timezone.now() + timedelta(days=30 * months),
                    }
                )
                Notification.objects.create(
                    user=payment.user,
                    notification_type='payment',
                    title='Payment Successful',
                    message=f'Your {plan} subscription is now active! Receipt: {receipt}',
                )
            else:
                payment.status = 'failed'
                payment.save()
        except Payment.DoesNotExist:
            pass

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})


class StripePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InitiateCardPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        plan_config = settings.SUBSCRIPTION_PLANS[data['plan']]
        amount = plan_config['price_monthly'] if data['billing_cycle'] == 'monthly' else plan_config['price_yearly']

        if settings.DEBUG:
            payment = Payment.objects.create(
                user=request.user,
                method='card',
                status='pending',
                amount=amount,
                currency='USD',
                transaction_id=f'pi_DEMO_{uuid.uuid4().hex[:16]}',
                metadata={'plan': data['plan'], 'billing_cycle': data['billing_cycle']}
            )
            return Response({
                'client_secret': f'pi_DEMO_{uuid.uuid4().hex[:16]}_secret_DEMO',
                'payment_id': str(payment.id),
                'publishable_key': settings.STRIPE_PUBLISHABLE_KEY,
                'amount': amount,
                'currency': 'USD',
                'demo_mode': True,
            })
        else:
            stripe_service = StripeService()
            intent = stripe_service.create_payment_intent(
                amount=int(amount * 100),
                currency='usd',
                metadata={
                    'user_id': str(request.user.id),
                    'plan': data['plan'],
                    'billing_cycle': data['billing_cycle'],
                }
            )
            payment = Payment.objects.create(
                user=request.user,
                method='card',
                status='pending',
                amount=amount,
                currency='USD',
                stripe_payment_intent=intent['id'],
                transaction_id=intent['id'],
                metadata={'plan': data['plan'], 'billing_cycle': data['billing_cycle']}
            )
            return Response({
                'client_secret': intent['client_secret'],
                'payment_id': str(payment.id),
                'publishable_key': settings.STRIPE_PUBLISHABLE_KEY,
            })


class PaypalPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InitiatePaypalPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        plan_config = settings.SUBSCRIPTION_PLANS[data['plan']]
        amount = plan_config['price_monthly'] if data['billing_cycle'] == 'monthly' else plan_config['price_yearly']

        if settings.DEBUG:
            payment = Payment.objects.create(
                user=request.user,
                method='paypal',
                status='pending',
                amount=amount,
                currency='USD',
                transaction_id=f'DEMO_PAYPAL_{uuid.uuid4().hex[:8]}',
                metadata={'plan': data['plan'], 'billing_cycle': data['billing_cycle']}
            )
            return Response({
                'order_id': f'DEMO_{uuid.uuid4().hex[:12].upper()}',
                'payment_id': str(payment.id),
                'approval_url': 'https://www.sandbox.paypal.com/demo',
                'demo_mode': True,
            })
        else:
            paypal = PaypalService()
            order = paypal.create_order(amount=amount)
            payment = Payment.objects.create(
                user=request.user,
                method='paypal',
                status='pending',
                amount=amount,
                currency='USD',
                paypal_order_id=order['id'],
                transaction_id=order['id'],
                metadata={'plan': data['plan'], 'billing_cycle': data['billing_cycle']}
            )
            approval_url = next(
                link['href'] for link in order['links']
                if link['rel'] == 'approve'
            )
            return Response({
                'order_id': order['id'],
                'payment_id': str(payment.id),
                'approval_url': approval_url,
            })


class PaymentHistoryView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATION VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class NotificationView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def patch(self, request, pk=None):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All marked as read'})


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class AdminDashboardView(APIView):
    permission_classes = [IsAdminOrModerator]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        total_users = User.objects.count()
        active_today = User.objects.filter(last_active__date=today).count()
        new_this_month = User.objects.filter(created_at__date__gte=month_ago).count()

        total_conversations = Conversation.objects.count()
        total_messages = Message.objects.count()
        total_tokens = User.objects.aggregate(total=Sum('total_tokens_used'))['total'] or 0

        plan_distribution = {}
        for plan in ['free', 'premium', 'team', 'enterprise']:
            plan_distribution[plan] = Subscription.objects.filter(
                plan=plan, status='active'
            ).count()

        recent_payments = Payment.objects.filter(
            status='completed'
        ).order_by('-created_at')[:10]

        total_revenue = Payment.objects.filter(
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0

        training_runs = ModelTrainingRun.objects.filter(
            status__in=['running', 'queued']
        ).count()

        return Response({
            'users': {
                'total': total_users,
                'active_today': active_today,
                'new_this_month': new_this_month,
            },
            'conversations': {
                'total': total_conversations,
                'total_messages': total_messages,
                'total_tokens': total_tokens,
            },
            'subscriptions': plan_distribution,
            'revenue': {
                'total_usd': float(total_revenue),
                'recent_payments': PaymentSerializer(recent_payments, many=True).data,
            },
            'training': {
                'active_runs': training_runs,
            },
            'model_accuracy': self._get_accuracy_stats(),
        })

    def _get_accuracy_stats(self):
        benchmarks = ThinkingBenchmark.objects.all()
        if not benchmarks.exists():
            return {}
        total = benchmarks.count()
        correct = benchmarks.filter(is_correct=True).count()
        by_category = {}
        for cat in benchmarks.values_list('category', flat=True).distinct():
            cat_total = benchmarks.filter(category=cat).count()
            cat_correct = benchmarks.filter(category=cat, is_correct=True).count()
            by_category[cat] = round(cat_correct / cat_total * 100, 1) if cat_total > 0 else 0
        return {
            'overall': round(correct / total * 100, 1) if total > 0 else 0,
            'by_category': by_category,
            'total_benchmarks': total,
        }


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrModerator]
    serializer_class = UserAdminSerializer
    queryset = User.objects.all().order_by('-created_at')
    search_fields = ['email', 'first_name', 'last_name']
    filterset_fields = ['role', 'is_active', 'is_verified']

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({'is_active': user.is_active})

    @action(detail=True, methods=['post'])
    def change_plan(self, request, pk=None):
        user = self.get_object()
        plan = request.data.get('plan')
        if plan not in settings.SUBSCRIPTION_PLANS:
            return Response({'error': 'Invalid plan'}, status=400)
        Subscription.objects.update_or_create(
            user=user,
            defaults={'plan': plan, 'status': 'active', 'end_date': timezone.now() + timedelta(days=30)}
        )
        return Response({'message': f'Plan updated to {plan}'})


# ══════════════════════════════════════════════════════════════════════════════
# TRAINING PLATFORM VIEWS (ADMIN)
# ══════════════════════════════════════════════════════════════════════════════

class TrainingDatasetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrModerator]
    serializer_class = TrainingDatasetSerializer
    queryset = TrainingDataset.objects.all().order_by('-created_at')

    @action(detail=True, methods=['post'])
    def bulk_upload(self, request, pk=None):
        dataset = self.get_object()
        serializer = TrainingSampleBulkSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        samples_data = serializer.validated_data['samples']
        created = []
        for sample_data in samples_data:
            sample = TrainingSample.objects.create(
                dataset=dataset,
                prompt=sample_data.get('prompt', ''),
                response=sample_data.get('response', ''),
                category=sample_data.get('category', ''),
                source=sample_data.get('source', 'imported'),
            )
            created.append(sample)

        dataset.total_samples = dataset.samples.count()
        dataset.save()

        return Response({'created': len(created), 'total': dataset.total_samples})


class TrainingSampleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrModerator]
    serializer_class = TrainingSampleSerializer
    filterset_fields = ['dataset', 'quality_status', 'category']

    def get_queryset(self):
        return TrainingSample.objects.all().select_related('dataset', 'reviewed_by')

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        sample = self.get_object()
        quality_status = request.data.get('quality_status')
        if quality_status not in ['approved', 'rejected', 'flagged']:
            return Response({'error': 'Invalid status'}, status=400)
        sample.quality_status = quality_status
        sample.reviewed_by = request.user
        sample.review_notes = request.data.get('notes', '')
        sample.quality_score = request.data.get('score', 0.0)
        sample.save()

        # Update dataset counts
        dataset = sample.dataset
        dataset.validated_samples = dataset.samples.filter(quality_status='approved').count()
        dataset.rejected_samples = dataset.samples.filter(quality_status='rejected').count()
        dataset.save()

        return Response({'message': 'Review saved', 'quality_status': quality_status})


class ModelTrainingRunViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrModerator]
    serializer_class = ModelTrainingRunSerializer
    queryset = ModelTrainingRun.objects.all().order_by('-created_at')

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        run = self.get_object()
        if run.status not in ['queued', 'paused']:
            return Response({'error': 'Cannot start this run'}, status=400)

        # Trigger async training task
        from .tasks import start_training_run
        run.status = 'running'
        run.started_at = timezone.now()
        run.save()
        start_training_run.delay(str(run.id))
        return Response({'message': 'Training started', 'status': 'running'})

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        run = self.get_object()
        run.status = 'paused'
        run.save()
        return Response({'status': 'paused'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        run = self.get_object()
        run.status = 'cancelled'
        run.save()
        return Response({'status': 'cancelled'})

    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        run = self.get_object()
        evals = run.evaluations.all().order_by('evaluated_at')
        return Response({
            'run': ModelTrainingRunSerializer(run).data,
            'evaluations': ModelEvaluationSerializer(evals, many=True).data,
        })


class ThinkingBenchmarkViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrModerator]
    serializer_class = ThinkingBenchmarkSerializer
    queryset = ThinkingBenchmark.objects.all().order_by('-evaluated_at')
    filterset_fields = ['model_name', 'category', 'difficulty', 'is_correct']

    @action(detail=False, methods=['get'])
    def accuracy_report(self, request):
        model = request.query_params.get('model')
        qs = self.queryset
        if model:
            qs = qs.filter(model_name=model)

        total = qs.count()
        correct = qs.filter(is_correct=True).count()

        by_category = {}
        for cat in qs.values_list('category', flat=True).distinct():
            cat_qs = qs.filter(category=cat)
            cat_correct = cat_qs.filter(is_correct=True).count()
            by_category[cat] = {
                'total': cat_qs.count(),
                'correct': cat_correct,
                'accuracy': round(cat_correct / cat_qs.count() * 100, 1) if cat_qs.count() > 0 else 0
            }

        by_difficulty = {}
        for diff in ['easy', 'medium', 'hard']:
            diff_qs = qs.filter(difficulty=diff)
            diff_correct = diff_qs.filter(is_correct=True).count()
            by_difficulty[diff] = {
                'total': diff_qs.count(),
                'correct': diff_correct,
                'accuracy': round(diff_correct / diff_qs.count() * 100, 1) if diff_qs.count() > 0 else 0
            }

        return Response({
            'overall_accuracy': round(correct / total * 100, 1) if total > 0 else 0,
            'total_benchmarks': total,
            'by_category': by_category,
            'by_difficulty': by_difficulty,
        })


class PlatformMetricsView(generics.ListAPIView):
    permission_classes = [IsAdminOrModerator]
    serializer_class = PlatformMetricSerializer

    def get_queryset(self):
        days = int(self.request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        return PlatformMetric.objects.filter(date__gte=start_date).order_by('date')