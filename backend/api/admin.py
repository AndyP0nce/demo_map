"""
Django Admin configuration for the Housing Finder API.
"""

from django.contrib import admin
from .models import University


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    """Admin interface for managing universities."""
    list_display = ['name', 'full_name', 'latitude', 'longitude', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'full_name']
    ordering = ['name']
