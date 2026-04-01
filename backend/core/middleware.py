"""
LexaGPT Custom Middleware
"""
import time
import logging
from django.http import JsonResponse
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger('core')


class RequestTimeoutMiddleware:
    """Enforce request timeout similar to Claude AI"""
    def __init__(self, get_response):
        self.get_response = get_response
        self.timeout = getattr(settings, 'REQUEST_TIMEOUT_SECONDS', 300)

    def __call__(self, request):
        request._start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - request._start_time
        response['X-Response-Time'] = f"{duration:.3f}s"
        return response


class RateLimitMiddleware:
    """Basic rate limiting per IP for anonymous users"""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated:
            ip = self._get_client_ip(request)
            cache_key = f"ratelimit:{ip}"
            count = cache.get(cache_key, 0)
            if count > 100:  # 100 req/hour for anon
                return JsonResponse(
                    {'error': 'Too many requests. Please sign in.'},
                    status=429
                )
            cache.set(cache_key, count + 1, timeout=3600)
        return self.get_response(request)

    def _get_client_ip(self, request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '0.0.0.0')