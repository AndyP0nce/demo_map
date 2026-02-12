"""
URL routes for the Housing Finder API.

Routes:
    /api/listings/           - List all listings
    /api/listings/<id>/      - Single listing detail
    /api/universities/       - List all universities
    /api/health/             - Health check
"""

from django.urls import path
from . import views

urlpatterns = [
    path('listings/', views.ListingListView.as_view(), name='listing-list'),
    path('listings/<int:pk>/', views.ListingDetailView.as_view(), name='listing-detail'),
    path('universities/', views.UniversityListView.as_view(), name='university-list'),
    path('health/', views.HealthCheckView.as_view(), name='health-check'),
]
