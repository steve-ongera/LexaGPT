"""
LexaGPT Celery Tasks
Async background tasks for training, cleanup, etc.
"""
import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger('core')


@shared_task
def cleanup_expired_sessions():
    """Remove expired user sessions"""
    from core.models import UserSession
    deleted, _ = UserSession.objects.filter(
        expires_at__lt=timezone.now()
    ).delete()
    logger.info(f"Cleaned up {deleted} expired sessions")
    return deleted


@shared_task
def reset_daily_usage():
    """Reset daily message counts for all users"""
    from core.models import User
    updated = User.objects.filter(
        daily_messages_used__gt=0
    ).update(daily_messages_used=0, daily_reset_at=timezone.now())
    logger.info(f"Reset daily usage for {updated} users")
    return updated


@shared_task
def start_training_run(run_id: str):
    """Execute a model training run"""
    from core.models import ModelTrainingRun, ModelEvaluation
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()

    try:
        run = ModelTrainingRun.objects.get(id=run_id)
        run.status = 'running'
        run.started_at = timezone.now()
        run.save()

        def send_progress(step, epoch, total_steps, total_epochs, loss=None, accuracy=None):
            """Send progress update via WebSocket"""
            progress = (step / total_steps * 100) if total_steps > 0 else 0
            run.current_step = step
            run.current_epoch = epoch
            run.total_steps = total_steps
            run.total_epochs = total_epochs
            run.progress_percent = progress
            if loss:
                run.train_loss = loss
            if accuracy:
                run.accuracy = accuracy
            run.save()

            async_to_sync(channel_layer.group_send)(
                f"training_{run_id}",
                {
                    'type': 'training_progress',
                    'step': step,
                    'epoch': epoch,
                    'total_steps': total_steps,
                    'total_epochs': total_epochs,
                    'progress': progress,
                    'train_loss': loss,
                    'accuracy': accuracy,
                }
            )

        config = run.config or {}
        hyperparams = run.hyperparameters or {}
        total_epochs = hyperparams.get('epochs', 3)
        learning_rate = hyperparams.get('learning_rate', 2e-5)
        batch_size = hyperparams.get('batch_size', 8)
        total_steps_per_epoch = 100  # Placeholder

        import time
        import random

        for epoch in range(1, total_epochs + 1):
            for step in range(1, total_steps_per_epoch + 1):
                # Simulate training
                time.sleep(0.1)
                # Simulate decreasing loss
                loss = max(0.1, 2.0 - (epoch * total_steps_per_epoch + step) * 0.005 + random.uniform(-0.05, 0.05))
                accuracy = min(0.99, 0.5 + (epoch * total_steps_per_epoch + step) * 0.001 + random.uniform(-0.01, 0.01))

                if step % 10 == 0:
                    send_progress(step, epoch, total_steps_per_epoch, total_epochs, loss, accuracy)

                run_check = ModelTrainingRun.objects.get(id=run_id)
                if run_check.status in ['cancelled', 'failed']:
                    return

            # Create epoch evaluation
            ModelEvaluation.objects.create(
                training_run=run,
                eval_type='epoch_eval',
                score=accuracy,
                details={
                    'epoch': epoch,
                    'train_loss': loss,
                    'eval_loss': loss * 1.1,
                    'accuracy': accuracy,
                }
            )

        # Training complete
        run.status = 'completed'
        run.completed_at = timezone.now()
        run.progress_percent = 100.0
        run.save()

        async_to_sync(channel_layer.group_send)(
            f"training_{run_id}",
            {'type': 'training_progress', 'status': 'completed', 'progress': 100}
        )
        logger.info(f"Training run {run_id} completed successfully")

    except Exception as e:
        logger.error(f"Training run {run_id} failed: {e}")
        try:
            run = ModelTrainingRun.objects.get(id=run_id)
            run.status = 'failed'
            run.logs = str(e)
            run.save()
        except Exception:
            pass


@shared_task
def run_training_checkpoint():
    """Run automated model evaluation checkpoint"""
    from core.models import ModelTrainingRun
    active_runs = ModelTrainingRun.objects.filter(status='running')
    for run in active_runs:
        logger.info(f"Checkpoint for run: {run.id}")
    return active_runs.count()


@shared_task
def generate_platform_metrics():
    """Generate daily platform metrics"""
    from core.models import User, Conversation, Message, Subscription, Payment, PlatformMetric
    from django.db.models import Sum

    today = timezone.now().date()

    metrics, created = PlatformMetric.objects.get_or_create(date=today)
    metrics.total_users = User.objects.count()
    metrics.active_users = User.objects.filter(last_active__date=today).count()
    metrics.new_users = User.objects.filter(created_at__date=today).count()
    metrics.total_messages = Message.objects.count()
    metrics.total_tokens = User.objects.aggregate(t=Sum('total_tokens_used'))['t'] or 0

    revenue = Payment.objects.filter(
        status='completed', created_at__date=today
    ).aggregate(total=Sum('amount'))['total'] or 0
    metrics.revenue_usd = revenue

    for plan in ['free', 'premium', 'team', 'enterprise']:
        count = Subscription.objects.filter(plan=plan, status='active').count()
        setattr(metrics, f'{plan}_users', count)

    metrics.save()
    logger.info(f"Platform metrics generated for {today}")


@shared_task
def send_notification_email(user_id: str, subject: str, message: str):
    """Send email notification to user"""
    from core.models import User
    from django.core.mail import send_mail
    from django.conf import settings

    try:
        user = User.objects.get(id=user_id)
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(f"Email sent to {user.email}: {subject}")
    except Exception as e:
        logger.error(f"Email send failed for {user_id}: {e}")