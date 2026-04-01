"""LexaGPT Social Auth Pipeline"""


def save_profile(backend, user, response, *args, **kwargs):
    if backend.name == 'google-oauth2':
        user.google_id = response.get('sub', '')
        user.is_verified = True
        if not user.first_name:
            user.first_name = response.get('given_name', '')
        if not user.last_name:
            user.last_name = response.get('family_name', '')
        user.save()