"""
URL configuration for housing_api project.

Routes:
    /admin/          - Django admin panel
    /api/            - REST API endpoints (see api/urls.py)
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
