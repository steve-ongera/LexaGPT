"""LexaGPT Django Signals"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, Subscription, Notification


@receiver(post_save, sender=User)
def create_user_subscription(sender, instance, created, **kwargs):
    if created and not Subscription.objects.filter(user=instance).exists():
        Subscription.objects.create(user=instance, plan='free', status='active')


@receiver(post_save, sender=Subscription)
def notify_subscription_change(sender, instance, created, **kwargs):
    if not created and instance.status == 'active':
        Notification.objects.create(
            user=instance.user,
            notification_type='success',
            title='Subscription Updated',
            message=f'Your plan has been updated to {instance.plan.title()}.',
        )