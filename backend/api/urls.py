"""
URL routes for the Housing Finder API.

Listings:
    GET    /api/listings/               - List all listings
    POST   /api/listings/               - Create a listing
    GET    /api/listings/<id>/          - Get single listing
    PUT    /api/listings/<id>/          - Update listing
    DELETE /api/listings/<id>/          - Delete listing
    GET    /api/listings/user/<id>/     - Get user's listings

Universities:
    GET    /api/universities/           - List all universities

Favorites:
    GET    /api/favorites/<user_id>/    - Get user's favorites
    POST   /api/favorites/              - Add to favorites
    DELETE /api/favorites/<id>/         - Remove from favorites
    GET    /api/favorites/check/<user_id>/<listing_id>/  - Check if favorited

Images:
    POST   /api/images/upload/          - Upload image to S3
    GET    /api/images/<listing_id>/    - Get images for listing
    DELETE /api/images/<id>/            - Delete image

Health:
    GET    /api/health/                 - Health check
"""

from django.urls import path
from . import views

urlpatterns = [
    # Listings
    path('listings/', views.ListingListCreateView.as_view(), name='listing-list-create'),
    path('listings/<int:pk>/', views.ListingDetailView.as_view(), name='listing-detail'),
    path('listings/user/<int:owner_id>/', views.UserListingsView.as_view(), name='user-listings'),

    # Universities
    path('universities/', views.UniversityListView.as_view(), name='university-list'),

    # Favorites
    path('favorites/<int:user_id>/', views.FavoriteListView.as_view(), name='favorite-list'),
    path('favorites/', views.FavoriteCreateView.as_view(), name='favorite-create'),
    path('favorites/delete/<int:pk>/', views.FavoriteDeleteView.as_view(), name='favorite-delete'),
    path('favorites/check/<int:user_id>/<int:listing_id>/', views.FavoriteCheckView.as_view(), name='favorite-check'),

    # Images
    path('images/upload/', views.ImageUploadView.as_view(), name='image-upload'),
    path('images/<int:listing_id>/', views.ListingImagesView.as_view(), name='listing-images'),
    path('images/delete/<int:pk>/', views.ImageDeleteView.as_view(), name='image-delete'),

    # Health
    path('health/', views.HealthCheckView.as_view(), name='health-check'),
]
