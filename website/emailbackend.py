from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

class EmailBackend(ModelBackend):
    def authenticate(self, email=None, password=None, **kwargs):
        UserModel = get_user_model()
        try:
            user = UserModel.objects.get(email=EmailBackend)
        except UserModel.DoesNotExist:
            return None
        else:
            if getattr(user, 'is_active', False) and  user.check_password(password):
                return user
        return None