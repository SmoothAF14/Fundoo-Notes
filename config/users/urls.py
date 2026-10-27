from django.urls import path

from . import api_views, views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('register/', views.register, name='register'),
    path('logout/', views.logout_view, name='logout'),

    # API auth
    path('api/auth/login/', api_views.LoginAPIView.as_view(), name='api_login'),
    path('api/auth/logout/', api_views.LogoutAPIView.as_view(), name='api_logout'),
    path('api/auth/me/', api_views.MeAPIView.as_view(), name='api_me'),

    # API auth (OTP flow)
    path('api/auth/register/request-otp/', api_views.RegisterRequestOtpAPIView.as_view(), name='api_register_request_otp'),
    path('api/auth/register/verify-otp/', api_views.RegisterVerifyOtpAPIView.as_view(), name='api_register_verify_otp'),
    path('api/auth/login/request-otp/', api_views.LoginRequestOtpAPIView.as_view(), name='api_login_request_otp'),
    path('api/auth/login/verify-otp/', api_views.LoginVerifyOtpAPIView.as_view(), name='api_login_verify_otp'),
    path('api/auth/password/request-otp/', api_views.PasswordResetRequestOtpAPIView.as_view(), name='api_password_request_otp'),
    path('api/auth/password/reset/', api_views.PasswordResetAPIView.as_view(), name='api_password_reset'),


    path('verify-otp/', views.verify_otp, name='verify_otp'),
    path('login-otp/', views.login_otp_verify, name='login_otp_verify'),
]
