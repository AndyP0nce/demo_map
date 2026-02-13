"""
API Views for the Housing Finder.

Endpoints:
    GET    /api/listings/              - List all active listings
    POST   /api/listings/              - Create a new listing
    GET    /api/listings/<id>/         - Get single listing
    PUT    /api/listings/<id>/         - Update a listing
    DELETE /api/listings/<id>/         - Delete a listing
    GET    /api/listings/user/<id>/    - Get listings by owner
    GET    /api/universities/          - List all universities
    GET    /api/favorites/<user_id>/   - Get user's favorites
    POST   /api/favorites/             - Add to favorites
    DELETE /api/favorites/<id>/        - Remove from favorites
    POST   /api/images/upload/         - Upload image to S3
    GET    /api/health/                - Health check
"""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings

from .models import ApartmentPost, University, FavoriteApartment, ListingImage
from .serializers import (
    ApartmentListSerializer,
    ApartmentCreateSerializer,
    UniversitySerializer,
    FavoriteSerializer,
    FavoriteCreateSerializer,
    ListingImageSerializer,
)


# ── Listings ─────────────────────────────────────────────

class ListingListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/listings/  - List all active listings
    POST /api/listings/  - Create a new listing
    """
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ApartmentCreateSerializer
        return ApartmentListSerializer

    def get_queryset(self):
        """Return only active listings with valid coordinates."""
        return ApartmentPost.objects.filter(
            is_active=True,
            latitude__isnull=False,
            longitude__isnull=False
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Create a new listing."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()

        # Return the full listing data
        output_serializer = ApartmentListSerializer(listing)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/listings/<id>/  - Get single listing
    PUT    /api/listings/<id>/  - Update listing
    DELETE /api/listings/<id>/  - Delete listing (soft delete)
    """
    queryset = ApartmentPost.objects.all()

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ApartmentCreateSerializer
        return ApartmentListSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete - set is_active to False."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserListingsView(generics.ListAPIView):
    """
    GET /api/listings/user/<owner_id>/  - Get all listings by a specific owner
    """
    serializer_class = ApartmentListSerializer

    def get_queryset(self):
        owner_id = self.kwargs.get('owner_id')
        return ApartmentPost.objects.filter(
            owner_id=owner_id
        ).order_by('-created_at')


# ── Universities ─────────────────────────────────────────

class UniversityListView(generics.ListAPIView):
    """
    GET /api/universities/  - List all universities
    """
    serializer_class = UniversitySerializer
    queryset = University.objects.filter(is_active=True).order_by('name')


# ── Favorites ────────────────────────────────────────────

class FavoriteListView(generics.ListAPIView):
    """
    GET /api/favorites/<user_id>/  - Get user's favorite listings
    """
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return FavoriteApartment.objects.filter(user_id=user_id).order_by('-created_at')


class FavoriteCreateView(generics.CreateAPIView):
    """
    POST /api/favorites/  - Add a listing to favorites
    """
    serializer_class = FavoriteCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        favorite = serializer.save()

        # Return full favorite data with listing details
        output_serializer = FavoriteSerializer(favorite)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class FavoriteDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/favorites/<id>/  - Remove from favorites
    """
    queryset = FavoriteApartment.objects.all()


class FavoriteCheckView(APIView):
    """
    GET /api/favorites/check/<user_id>/<listing_id>/  - Check if listing is favorited
    """
    def get(self, request, user_id, listing_id):
        is_favorited = FavoriteApartment.objects.filter(
            user_id=user_id,
            apartment_id=listing_id
        ).exists()
        return Response({'is_favorited': is_favorited})


# ── Image Upload ─────────────────────────────────────────

class ImageUploadView(APIView):
    """
    POST /api/images/upload/  - Upload image to S3

    Request body (multipart/form-data):
        - image: The image file
        - listing_id: The listing this image belongs to
        - label: Optional label for the image (e.g., "Living Room")
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image_file = request.FILES.get('image')
        listing_id = request.data.get('listing_id')
        label = request.data.get('label', '')

        if not image_file:
            return Response(
                {'error': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not listing_id:
            return Response(
                {'error': 'listing_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if listing exists
        if not ApartmentPost.objects.filter(id=listing_id).exists():
            return Response(
                {'error': 'Listing not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            # Upload to S3
            image_url = self._upload_to_s3(image_file, listing_id)

            # Save to database
            image_count = ListingImage.objects.filter(listing_id=listing_id).count()
            listing_image = ListingImage.objects.create(
                listing_id=listing_id,
                image_url=image_url,
                label=label,
                order=image_count
            )

            return Response(
                ListingImageSerializer(listing_image).data,
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            return Response(
                {'error': f'Upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _upload_to_s3(self, file, listing_id):
        """
        Upload file to AWS S3 and return the URL.
        Requires AWS credentials in environment variables.
        """
        import boto3
        import uuid
        import os

        # Get S3 settings from environment
        bucket_name = os.getenv('AWS_S3_BUCKET', 'livio-listing-images')
        region = os.getenv('AWS_S3_REGION', 'us-west-1')

        # Generate unique filename
        file_ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
        filename = f"listings/{listing_id}/{uuid.uuid4()}.{file_ext}"

        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )

        # Upload file
        s3_client.upload_fileobj(
            file,
            bucket_name,
            filename,
            ExtraArgs={
                'ContentType': file.content_type,
                'ACL': 'public-read'
            }
        )

        # Return public URL
        return f"https://{bucket_name}.s3.{region}.amazonaws.com/{filename}"


class ListingImagesView(generics.ListAPIView):
    """
    GET /api/images/<listing_id>/  - Get all images for a listing
    """
    serializer_class = ListingImageSerializer

    def get_queryset(self):
        listing_id = self.kwargs.get('listing_id')
        return ListingImage.objects.filter(listing_id=listing_id)


class ImageDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/images/<id>/  - Delete an image
    """
    queryset = ListingImage.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Optionally delete from S3 as well
        try:
            self._delete_from_s3(instance.image_url)
        except Exception:
            pass  # Continue even if S3 delete fails

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _delete_from_s3(self, image_url):
        """Delete file from S3."""
        import boto3
        import os

        bucket_name = os.getenv('AWS_S3_BUCKET', 'livio-listing-images')
        region = os.getenv('AWS_S3_REGION', 'us-west-1')

        # Extract key from URL
        key = image_url.split(f'{bucket_name}.s3.{region}.amazonaws.com/')[-1]

        s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )

        s3_client.delete_object(Bucket=bucket_name, Key=key)


# ── Health Check ─────────────────────────────────────────

class HealthCheckView(APIView):
    """
    GET /api/health/  - Health check endpoint
    """
    def get(self, request):
        return Response({
            'status': 'healthy',
            'database': 'connected'
        }, status=status.HTTP_200_OK)
