"""
LexaGPT Permissions
"""
from rest_framework.permissions import BasePermission


class IsAdminOrModerator(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'moderator']
        )


class IsPremiumUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.current_plan in ['premium', 'team', 'enterprise']
        )


class CanSendMessage(BasePermission):
    message = 'Daily message limit reached. Please upgrade your plan.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.can_send_message()
        )