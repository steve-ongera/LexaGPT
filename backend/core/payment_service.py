"""
LexaGPT Payment Services
M-Pesa, Stripe, PayPal integration
"""
import base64
import logging
import requests
from datetime import datetime
from django.conf import settings

logger = logging.getLogger('core')


class MpesaService:
    """Safaricom M-Pesa Daraja API integration"""

    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.shortcode = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        self.callback_url = settings.MPESA_CALLBACK_URL
        self.base_url = settings.MPESA_BASE_URL

    def get_access_token(self) -> str:
        """Get M-Pesa OAuth access token"""
        credentials = base64.b64encode(
            f"{self.consumer_key}:{self.consumer_secret}".encode()
        ).decode()
        response = requests.get(
            f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {credentials}"},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()['access_token']

    def get_password(self) -> tuple:
        """Generate STK push password and timestamp"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        raw = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(raw.encode()).decode()
        return password, timestamp

    def initiate_stk_push(self, phone: str, amount: int, account_ref: str, description: str) -> dict:
        """Initiate M-Pesa STK push payment"""
        try:
            access_token = self.get_access_token()
            password, timestamp = self.get_password()

            payload = {
                "BusinessShortCode": self.shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount,
                "PartyA": phone,
                "PartyB": self.shortcode,
                "PhoneNumber": phone,
                "CallBackURL": self.callback_url,
                "AccountReference": account_ref,
                "TransactionDesc": description,
            }

            response = requests.post(
                f"{self.base_url}/mpesa/stkpush/v1/processrequest",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            return response.json()
        except Exception as e:
            logger.error(f"M-Pesa STK push failed: {e}")
            return {"ResponseCode": "1", "errorMessage": str(e)}

    def query_stk_status(self, checkout_request_id: str) -> dict:
        """Query STK push transaction status"""
        try:
            access_token = self.get_access_token()
            password, timestamp = self.get_password()
            response = requests.post(
                f"{self.base_url}/mpesa/stkpushquery/v1/query",
                json={
                    "BusinessShortCode": self.shortcode,
                    "Password": password,
                    "Timestamp": timestamp,
                    "CheckoutRequestID": checkout_request_id,
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            return response.json()
        except Exception as e:
            logger.error(f"M-Pesa query failed: {e}")
            return {"ResultCode": "1", "ResultDesc": str(e)}


class StripeService:
    """Stripe card payment integration"""

    def __init__(self):
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.stripe = stripe

    def create_payment_intent(self, amount: int, currency: str, metadata: dict) -> dict:
        """Create Stripe PaymentIntent"""
        intent = self.stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            automatic_payment_methods={"enabled": True},
            metadata=metadata,
        )
        return intent

    def create_subscription(self, customer_id: str, price_id: str) -> dict:
        """Create Stripe subscription"""
        return self.stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            payment_behavior='default_incomplete',
            expand=['latest_invoice.payment_intent'],
        )

    def create_customer(self, email: str, name: str) -> dict:
        """Create Stripe customer"""
        return self.stripe.Customer.create(email=email, name=name)

    def verify_webhook(self, payload: bytes, sig_header: str) -> dict:
        """Verify Stripe webhook signature"""
        return self.stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )


class PaypalService:
    """PayPal payment integration"""

    def __init__(self):
        self.client_id = settings.PAYPAL_CLIENT_ID
        self.client_secret = settings.PAYPAL_CLIENT_SECRET
        self.mode = settings.PAYPAL_MODE
        self.base_url = (
            "https://api-m.sandbox.paypal.com"
            if self.mode == 'sandbox'
            else "https://api-m.paypal.com"
        )

    def get_access_token(self) -> str:
        """Get PayPal OAuth access token"""
        response = requests.post(
            f"{self.base_url}/v1/oauth2/token",
            auth=(self.client_id, self.client_secret),
            data={"grant_type": "client_credentials"},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()['access_token']

    def create_order(self, amount: float, currency: str = 'USD') -> dict:
        """Create PayPal order"""
        try:
            access_token = self.get_access_token()
            response = requests.post(
                f"{self.base_url}/v2/checkout/orders",
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [{
                        "amount": {
                            "currency_code": currency,
                            "value": str(amount),
                        },
                        "description": "LexaGPT Subscription",
                    }],
                    "application_context": {
                        "return_url": f"{settings.MPESA_CALLBACK_URL.replace('/api/payments/mpesa/callback/', '')}/payment/success",
                        "cancel_url": f"{settings.MPESA_CALLBACK_URL.replace('/api/payments/mpesa/callback/', '')}/payment/cancel",
                    }
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            return response.json()
        except Exception as e:
            logger.error(f"PayPal order creation failed: {e}")
            raise

    def capture_order(self, order_id: str) -> dict:
        """Capture (complete) a PayPal order"""
        access_token = self.get_access_token()
        response = requests.post(
            f"{self.base_url}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        return response.json()