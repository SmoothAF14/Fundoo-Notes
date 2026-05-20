import sys
import os
import django

# Add 'config' to sys.path
sys.path.append(os.path.join(os.getcwd(), 'config'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

class DummyObject:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

try:
    from users.jwt_utils import create_access_token, decode_access_token
    print('Imported jwt_utils successfully.')
    
    dummy_user = DummyObject(
        id=1,
        username='testuser',
        email='test@example.com',
        phone_number='1234567890',
        is_verified=True
    )
    
    token = create_access_token(dummy_user)
    decoded = decode_access_token(token)
    print(f'Token creation and decoding successful.')
except Exception as e:
    import traceback
    print(f'jwt_utils validation failed: {type(e).__name__}: {e}')
    # traceback.print_exc()

try:
    from fastapi_app.utils import auth
    print('Imported FastAPI auth helper successfully.')
except Exception as e:
    print(f'FastAPI auth helper import failed: {type(e).__name__}: {e}')
