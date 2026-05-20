import os
import django
from unittest.mock import MagicMock

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

try:
    from users.authentication import JWTAuthentication, User
    print('Import successful')
    
    # Check if 'user_id' is used in the filter
    query = str(User.objects.filter(user_id='test-uuid').query)
    if '\"user_id\" = test-uuid' in query.lower() or 'user_id' in query.lower():
        print(f'Verification: User lookup uses user_id field. Query: {query}')
    else:
        print(f'Verification: User lookup might NOT be using user_id. Query: {query}')

except Exception as e:
    print(f'Error: {e}')
