"""
LexaGPT WebSocket Consumers
Real-time chat via Django Channels
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger('core')


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time AI chat"""

    async def connect(self):
        """Authenticate and connect"""
        user = await self.get_user_from_token()
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        self.conversation_id = self.scope['url_route']['kwargs'].get('conversation_id', 'new')
        self.room_group_name = f"chat_{user.id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.send(text_data=json.dumps({
            'type': 'connected',
            'user': str(user.id),
            'conversation_id': self.conversation_id,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming WebSocket message"""
        try:
            data = json.loads(text_data)
            msg_type = data.get('type')

            if msg_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))

            elif msg_type == 'typing':
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {'type': 'user_typing', 'user_id': str(self.user.id)}
                )

        except json.JSONDecodeError:
            logger.error("Invalid WebSocket message")
        except Exception as e:
            logger.error(f"WebSocket receive error: {e}")
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Internal error'}))

    async def chat_message(self, event):
        """Send message to WebSocket"""
        await self.send(text_data=json.dumps(event))

    async def user_typing(self, event):
        """Broadcast typing indicator"""
        await self.send(text_data=json.dumps({'type': 'typing', 'user_id': event['user_id']}))

    async def training_update(self, event):
        """Send training progress update"""
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def get_user_from_token(self):
        """Extract user from JWT token in headers"""
        try:
            headers = dict(self.scope.get('headers', []))
            auth_header = headers.get(b'authorization', b'').decode()
            if not auth_header.startswith('Bearer '):
                # Try query params
                query_string = self.scope.get('query_string', b'').decode()
                for param in query_string.split('&'):
                    if param.startswith('token='):
                        token_str = param[6:]
                        break
                else:
                    return AnonymousUser()
            else:
                token_str = auth_header[7:]

            access_token = AccessToken(token_str)
            user_id = access_token['user_id']
            from core.models import User
            return User.objects.get(id=user_id)
        except Exception as e:
            logger.warning(f"WebSocket auth failed: {e}")
            return AnonymousUser()


class TrainingConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time training progress (admin only)"""

    async def connect(self):
        user = await self.get_user_from_token()
        if not user or not user.is_authenticated or user.role not in ['admin', 'moderator']:
            await self.close(code=4003)
            return

        self.user = user
        self.run_id = self.scope['url_route']['kwargs']['run_id']
        self.group_name = f"training_{self.run_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def training_progress(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def get_user_from_token(self):
        try:
            query_string = self.scope.get('query_string', b'').decode()
            token_str = ''
            for param in query_string.split('&'):
                if param.startswith('token='):
                    token_str = param[6:]
                    break
            if not token_str:
                return AnonymousUser()
            access_token = AccessToken(token_str)
            from core.models import User
            return User.objects.get(id=access_token['user_id'])
        except Exception:
            return AnonymousUser()