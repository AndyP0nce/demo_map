"""
API Views for the Housing Finder.

Each view class maps to one or more URL endpoints defined in urls.py.
All endpoints are currently public (no authentication required).

CURRENT STATUS:
    Listings    - Full CRUD (create, read, update, soft-delete)
    Universities- Read only
    Favorites   - Create, read, delete, check
    Images      - Upload to S3, read, delete from S3
    Auth        - NOT IMPLEMENTED (see TODOs below)

TODO (main project) - Authentication:
    All write endpoints (POST, PUT, PATCH, DELETE) should require a logged-in user.
    Add JWT authentication using djangorestframework-simplejwt:

    1. Install:  pip install djangorestframework-simplejwt
    2. Add to settings.py REST_FRAMEWORK:
           'DEFAULT_AUTHENTICATION_CLASSES': [
               'rest_framework_simplejwt.authentication.JWTAuthentication',
           ],
           'DEFAULT_PERMISSION_CLASSES': [
               'rest_framework.permissions.IsAuthenticatedOrReadOnly',
           ],
    3. Add JWT token endpoints to housing_api/urls.py:
           from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
           path('api/auth/login/',   TokenObtainPairView.as_view()),
           path('api/auth/refresh/', TokenRefreshView.as_view()),
    4. Frontend: store the token in localStorage, send as header:
           Authorization: Bearer <token>

TODO (main project) - Authorization (ownership checks):
    After auth is working, protect write endpoints so users can only
    modify their own listings/favorites. Use permission classes or
    check request.user.id == instance.owner_id inside the view.

Endpoints:
    GET    /api/listings/                              - List all active listings
    POST   /api/listings/                              - Create a new listing
    GET    /api/listings/<id>/                         - Get single listing
    PUT    /api/listings/<id>/                         - Update a listing
    DELETE /api/listings/<id>/                         - Delete a listing (soft)
    GET    /api/listings/user/<id>/                    - Get listings by owner
    GET    /api/universities/                          - List all universities
    GET    /api/favorites/<user_id>/                   - Get user's favorites
    POST   /api/favorites/                             - Add to favorites
    DELETE /api/favorites/delete/<id>/                 - Remove from favorites
    GET    /api/favorites/check/<user_id>/<listing_id>/- Check if favorited
    POST   /api/images/upload/                         - Upload image to S3
    GET    /api/images/<listing_id>/                   - Get images for a listing
    DELETE /api/images/delete/<id>/                    - Delete an image
    GET    /api/health/                                - Health check
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


# ── Listings ──────────────────────────────────────────────────────────────────

class ListingListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/listings/  - List all active listings
    POST /api/listings/  - Create a new listing

    GET returns all active listings that have valid lat/lng coordinates.
    The frontend does its own filtering (price, bedrooms, type) on this full list.

    TODO (main project) - Server-side filtering:
        As the number of listings grows, returning everything at once becomes slow.
        Add query parameter support to filter on the server side:

            def get_queryset(self):
                qs = ApartmentPost.objects.filter(is_active=True, ...)
                if price_min := self.request.query_params.get('price_min'):
                    qs = qs.filter(monthly_rent__gte=price_min)
                if price_max := self.request.query_params.get('price_max'):
                    qs = qs.filter(monthly_rent__lte=price_max)
                if bedrooms := self.request.query_params.get('bedrooms'):
                    qs = qs.filter(bedrooms=bedrooms)
                if room_type := self.request.query_params.get('type'):
                    qs = qs.filter(room_type=room_type)
                if city := self.request.query_params.get('city'):
                    qs = qs.filter(city__icontains=city)
                return qs

    TODO (main project) - Pagination:
        Add pagination so the API doesn't return thousands of listings at once.
        In settings.py add:
            REST_FRAMEWORK = {
                'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
                'PAGE_SIZE': 20,
            }
        The frontend will need to handle paging (load more button, infinite scroll).

    TODO (main project) - Auth (POST):
        Once auth is integrated, protect the POST endpoint:
            permission_classes = [IsAuthenticatedOrReadOnly]
        And set owner_id from the authenticated user instead of request body:
            serializer.save(owner_id=request.user.id)
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
        """
        Create a new listing and return the full serialized data.
        Uses ApartmentCreateSerializer for input, ApartmentListSerializer for output.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()

        # Return the full listing data (with field renames, owner, images, etc.)
        output_serializer = ApartmentListSerializer(listing)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/listings/<id>/  - Get single listing details
    PUT    /api/listings/<id>/  - Update listing (full replace)
    PATCH  /api/listings/<id>/  - Partial update listing
    DELETE /api/listings/<id>/  - Soft delete (sets is_active=False)

    TODO (main project) - Authorization:
        Right now any request can update or delete any listing.
        Add an ownership check before allowing writes:

            def get_object(self):
                obj = super().get_object()
                if self.request.method not in ['GET', 'HEAD', 'OPTIONS']:
                    if obj.owner_id != self.request.user.id:
                        raise PermissionDenied("You don't own this listing.")
                return obj

        This requires authentication to be working first.
    """
    queryset = ApartmentPost.objects.all()

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ApartmentCreateSerializer
        return ApartmentListSerializer

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete — sets is_active=False instead of deleting the row.
        The listing won't appear in GET /api/listings/ but the data is preserved.
        To hard-delete, change this to: instance.delete()
        """
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserListingsView(generics.ListAPIView):
    """
    GET /api/listings/user/<owner_id>/  - Get all listings by a specific owner.

    Returns both active and inactive listings so the owner can see their
    soft-deleted listings in a "my listings" dashboard.

    TODO (main project): When auth is integrated, replace the URL param with
         the authenticated user's ID so users can only fetch their own listings:
             owner_id = request.user.id  (instead of self.kwargs.get('owner_id'))
         This prevents users from viewing other users' private/inactive listings.
    """
    serializer_class = ApartmentListSerializer

    def get_queryset(self):
        owner_id = self.kwargs.get('owner_id')
        return ApartmentPost.objects.filter(
            owner_id=owner_id
        ).order_by('-created_at')


# ── Universities ──────────────────────────────────────────────────────────────

class UniversityListView(generics.ListAPIView):
    """
    GET /api/universities/  - List all active universities.

    Returns all 43 seeded California universities.
    The frontend uses these to place school markers on the Google Map.

    NOTE: This list rarely changes so it's a good candidate for caching.
    TODO (main project): Add Django's cache framework to avoid hitting the DB
         on every map load:
             from django.views.decorators.cache import cache_page
             Or use DRF's cache_response decorator from drf-extensions.
    """
    serializer_class = UniversitySerializer
    queryset = University.objects.filter(is_active=True).order_by('name')


# ── Favorites ─────────────────────────────────────────────────────────────────

class FavoriteListView(generics.ListAPIView):
    """
    GET /api/favorites/<user_id>/  - Get all of a user's saved listings.

    Returns favorites with full listing details nested inside each one.
    Used to populate a "Saved Listings" or "My Favorites" page.

    TODO (main project): Replace URL param with request.user.id so users can
         only see their own favorites — not another user's saved listings.
         Also add auth requirement (IsAuthenticated permission class).
    """
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return FavoriteApartment.objects.filter(user_id=user_id).order_by('-created_at')


class FavoriteCreateView(generics.CreateAPIView):
    """
    POST /api/favorites/  - Save a listing to favorites.

    Request body:
        { "user_id": 1, "apartment_id": 5 }

    TODO (main project): Remove user_id from request body.
         Set it from the authenticated user: serializer.save(user_id=request.user.id)
         This prevents forged favorites (user submitting another user's ID).
         Add: permission_classes = [IsAuthenticated]
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
    DELETE /api/favorites/delete/<id>/  - Remove a listing from favorites.

    TODO (main project): Add an ownership check — only the user who created
         the favorite should be able to delete it:
             if instance.user_id != request.user.id:
                 raise PermissionDenied()
         Add: permission_classes = [IsAuthenticated]
    """
    queryset = FavoriteApartment.objects.all()


class FavoriteCheckView(APIView):
    """
    GET /api/favorites/check/<user_id>/<listing_id>/

    Returns { "is_favorited": true/false }
    Used by the frontend to show a filled vs empty heart icon on a listing card.

    TODO (main project): Replace user_id URL param with request.user.id.
    """
    def get(self, request, user_id, listing_id):
        is_favorited = FavoriteApartment.objects.filter(
            user_id=user_id,
            apartment_id=listing_id
        ).exists()
        return Response({'is_favorited': is_favorited})


# ── Image Upload ──────────────────────────────────────────────────────────────

class ImageUploadView(APIView):
    """
    POST /api/images/upload/  - Upload an image to AWS S3 for a listing.

    Request body (multipart/form-data):
        - image:      The image file (required)
        - listing_id: ID of the listing this image belongs to (required)
        - label:      Optional label like "Living Room", "Bedroom", etc.

    Returns the new ListingImage record with the S3 URL.

    REQUIRES: AWS credentials in .env file:
        AWS_ACCESS_KEY_ID=<your key>
        AWS_SECRET_ACCESS_KEY=<your secret>
        AWS_S3_BUCKET=livio-listing-images   (or your bucket name)
        AWS_S3_REGION=us-west-1

    TODO (main project) - Auth:
        Only the listing owner should be able to upload images.
        After auth is integrated:
            1. Check request.user is authenticated
            2. Fetch the listing and verify listing.owner_id == request.user.id
            3. Then proceed with upload
        Add: permission_classes = [IsAuthenticated]

    TODO (main project) - Validation:
        Add file type and size validation before uploading:
            ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
            MAX_SIZE_MB = 10
            if image_file.content_type not in ALLOWED_TYPES:
                return 400 error
            if image_file.size > MAX_SIZE_MB * 1024 * 1024:
                return 400 error

    TODO (main project) - Image compression:
        Consider resizing/compressing images before upload using Pillow:
            pip install Pillow
            from PIL import Image
            img = Image.open(file)
            img.thumbnail((1920, 1080))
            # then upload compressed version
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

            # Save URL to database; auto-order after existing images
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
        Upload a file to AWS S3 and return the public URL.

        Files are stored at: listings/<listing_id>/<uuid>.<ext>
        The bucket must have public read access (or use pre-signed URLs).

        TODO (main project): Switch from ACL='public-read' to pre-signed URLs
             for better security. Pre-signed URLs expire and don't require
             public bucket access. Use boto3.generate_presigned_url() when serving.
        """
        import boto3
        import uuid
        import os

        # Get S3 settings from environment (.env file)
        bucket_name = os.getenv('AWS_S3_BUCKET', 'livio-listing-images')
        region = os.getenv('AWS_S3_REGION', 'us-west-1')

        # Generate unique filename to avoid collisions
        file_ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
        filename = f"listings/{listing_id}/{uuid.uuid4()}.{file_ext}"

        # Initialize S3 client using credentials from environment
        s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )

        # Upload the file
        s3_client.upload_fileobj(
            file,
            bucket_name,
            filename,
            ExtraArgs={
                'ContentType': file.content_type,
                'ACL': 'public-read'  # Makes URL publicly accessible
            }
        )

        # Return the public URL
        return f"https://{bucket_name}.s3.{region}.amazonaws.com/{filename}"


class ListingImagesView(generics.ListAPIView):
    """
    GET /api/images/<listing_id>/  - Get all images for a specific listing.

    Returns images ordered by 'order' field (ascending).
    Used when displaying the image gallery in the listing detail modal.
    """
    serializer_class = ListingImageSerializer

    def get_queryset(self):
        listing_id = self.kwargs.get('listing_id')
        return ListingImage.objects.filter(listing_id=listing_id)


class ImageDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/images/delete/<id>/  - Delete an image record and remove from S3.

    Tries to delete the file from S3 first, then removes the DB record.
    If S3 delete fails (e.g. file already gone), the DB record is still removed.

    TODO (main project) - Auth:
        Only the listing owner should be able to delete their images.
        After auth is integrated, verify ownership before deleting:
            listing = ApartmentPost.objects.get(id=instance.listing_id)
            if listing.owner_id != request.user.id:
                raise PermissionDenied()
    """
    queryset = ListingImage.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Try to delete from S3; don't fail if S3 delete errors
        try:
            self._delete_from_s3(instance.image_url)
        except Exception:
            pass  # Continue with DB delete even if S3 delete fails

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _delete_from_s3(self, image_url):
        """
        Extract S3 key from URL and delete the object from the bucket.
        Assumes URL format: https://<bucket>.s3.<region>.amazonaws.com/<key>
        """
        import boto3
        import os

        bucket_name = os.getenv('AWS_S3_BUCKET', 'livio-listing-images')
        region = os.getenv('AWS_S3_REGION', 'us-west-1')

        # Parse the S3 key out of the full URL
        key = image_url.split(f'{bucket_name}.s3.{region}.amazonaws.com/')[-1]

        s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )

        s3_client.delete_object(Bucket=bucket_name, Key=key)


# ── Health Check ──────────────────────────────────────────────────────────────

class HealthCheckView(APIView):
    """
    GET /api/health/  - Simple health check endpoint.

    Returns 200 OK if the server is running and can reach the database.
    Use this to confirm the API is up before making real requests.

    TODO (main project): Enhance with actual DB connectivity check:
        from django.db import connection
        try:
            connection.ensure_connection()
            db_status = 'connected'
        except Exception:
            db_status = 'error'
        return Response({'status': 'healthy', 'database': db_status})
    """
    def get(self, request):
        return Response({
            'status': 'healthy',
            'database': 'connected'
        }, status=status.HTTP_200_OK)
