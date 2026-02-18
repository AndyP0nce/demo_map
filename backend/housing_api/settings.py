"""
Django settings for housing_api project.

This backend serves the Campus Housing Finder demo frontend,
connecting to the existing LIVIO MySQL database on AWS RDS.

CURRENT STATUS:
    - Connected to LIVIO MySQL database on AWS RDS
    - CORS open for local development (localhost:3000, 8000)
    - All endpoints are public (AllowAny)
    - DEBUG mode ON

REQUIRED .env variables (create backend/.env — never commit this file):
    DB_ENGINE=mysql
    DB_NAME=LIVIO
    DB_USER=admin
    DB_PASSWORD=<your password>
    DB_HOST=livio-rds.c3euemwmm60k.us-west-1.rds.amazonaws.com
    DB_PORT=3306
    SECRET_KEY=<generate a strong random key>
    DEBUG=True

OPTIONAL .env variables (required for S3 image uploads):
    AWS_ACCESS_KEY_ID=<your IAM key>
    AWS_SECRET_ACCESS_KEY=<your IAM secret>
    AWS_S3_BUCKET=livio-listing-images
    AWS_S3_REGION=us-west-1

TODO (main project) - Add these .env variables for JWT auth when ready:
    JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
    JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ── Security ──────────────────────────────────────────────────────────────────

# SECURITY WARNING: keep the secret key used in production secret!
# TODO (main project): Generate a real key with:
#     python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
# Then store in .env and never commit it.
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-key')

# SECURITY WARNING: don't run with debug turned on in production!
# TODO (main project): Set DEBUG=False in production .env and add proper error pages.
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# TODO (main project): Add your production domain here when deploying.
# Example: ALLOWED_HOSTS = ['api.livio.com', 'livio.com', 'www.livio.com']
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# ── Application Definition ────────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'rest_framework',
    'corsheaders',
    # TODO (main project): Add JWT auth package after installing:
    #     pip install djangorestframework-simplejwt
    #     'rest_framework_simplejwt',
    # Local apps
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be at top for CORS headers
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'housing_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'housing_api.wsgi.application'

# ── Database ──────────────────────────────────────────────────────────────────

# Connected to the existing LIVIO MySQL database on AWS RDS.
# All credentials come from the .env file (never hardcoded).
#
# The api app uses managed=False on ApartmentPost, User, and FavoriteApartment
# so Django does NOT alter those existing tables — it only reads/writes them.
# Only University and ListingImage tables were created by Django via migrations.
#
# TODO (main project): When merging into the main Livio Django project, this
#     DATABASES config will be replaced by the main project's existing config.
#     The important thing is the LIVIO database already has the tables we need.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_NAME', 'LIVIO'),
        'USER': os.getenv('DB_USER', 'admin'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    }
}

# ── Password Validation ───────────────────────────────────────────────────────

# Standard Django password validators (used by the admin panel).
# TODO (main project): These apply to Django's built-in auth. If using custom
#     user model, these are already active via AbstractUser.
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internationalization ──────────────────────────────────────────────────────

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'America/Los_Angeles'
USE_I18N = True
USE_TZ = True

# ── Static Files ──────────────────────────────────────────────────────────────

STATIC_URL = 'static/'

# ── Primary Key ───────────────────────────────────────────────────────────────

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── CORS ──────────────────────────────────────────────────────────────────────

# These origins are allowed to make cross-origin requests to this API.
# The frontend (static HTML or React) runs on one of these URLs in development.
CORS_ALLOWED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

# CORS_ALLOW_ALL_ORIGINS=True means any origin can call this API in dev mode.
# This is fine for local development but MUST be False in production.
# TODO (main project): Remove this line (or ensure DEBUG=False in production),
#     and add only your real production frontend domain to CORS_ALLOWED_ORIGINS:
#         'https://livio.com',
#         'https://www.livio.com',
CORS_ALLOW_ALL_ORIGINS = DEBUG  # True in dev, False when DEBUG=False in prod

# ── Django REST Framework ─────────────────────────────────────────────────────

# Currently AllowAny so the frontend can call all endpoints without logging in.
# This is appropriate for the demo where there's no user auth yet.
#
# TODO (main project): Once JWT authentication is set up, change to:
#     REST_FRAMEWORK = {
#         'DEFAULT_AUTHENTICATION_CLASSES': [
#             'rest_framework_simplejwt.authentication.JWTAuthentication',
#         ],
#         'DEFAULT_PERMISSION_CLASSES': [
#             # Lets anyone READ (GET), but requires login to WRITE (POST/PUT/DELETE)
#             'rest_framework.permissions.IsAuthenticatedOrReadOnly',
#         ],
#         # Optional: add pagination (see views.py TODOs)
#         'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
#         'PAGE_SIZE': 20,
#     }
#
# TODO (main project): After enabling JWT auth, add token URL endpoints
#     in housing_api/urls.py:
#         from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
#         path('api/auth/login/',   TokenObtainPairView.as_view()),   # POST {username, password} -> tokens
#         path('api/auth/refresh/', TokenRefreshView.as_view()),      # POST {refresh} -> new access token
#
#     Frontend sends: Authorization: Bearer <access_token> header on protected requests.
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # TODO: change when auth is added
    ],
}
