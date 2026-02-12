"""
API Views for the Housing Finder.

These views handle HTTP requests and return JSON responses.

Endpoints:
    GET /api/listings/         - List all active apartment listings
    GET /api/listings/<id>/    - Get a single listing by ID
    GET /api/universities/     - List all universities
"""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ApartmentPost, University
from .serializers import ApartmentListSerializer, UniversitySerializer


class ListingListView(generics.ListAPIView):
    """
    GET /api/listings/

    Returns all active apartment listings.
    Frontend uses this to populate map markers and cards.
    """
    serializer_class = ApartmentListSerializer

    def get_queryset(self):
        """Return only active listings with valid coordinates."""
        return ApartmentPost.objects.filter(
            is_active=True,
            latitude__isnull=False,
            longitude__isnull=False
        ).order_by('-created_at')


class ListingDetailView(generics.RetrieveAPIView):
    """
    GET /api/listings/<id>/

    Returns a single listing by ID.
    Frontend uses this for the detail modal.
    """
    serializer_class = ApartmentListSerializer
    queryset = ApartmentPost.objects.filter(is_active=True)


class UniversityListView(generics.ListAPIView):
    """
    GET /api/universities/

    Returns all universities for the map.
    Frontend uses this for university markers and the target selector.
    """
    serializer_class = UniversitySerializer
    queryset = University.objects.filter(is_active=True).order_by('name')


class HealthCheckView(APIView):
    """
    GET /api/health/

    Simple health check endpoint to verify the API is running.
    """
    def get(self, request):
        return Response({
            'status': 'healthy',
            'database': 'connected'
        }, status=status.HTTP_200_OK)
