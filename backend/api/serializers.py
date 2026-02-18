"""
Serializers for the Housing Finder API.

Serializers convert database models to JSON (for responses) and back (for requests).
They also rename fields to match what the frontend expects (e.g. monthly_rent -> price).

STATUS: Complete for demo. See TODOs below for performance improvements and
        changes needed when merging into the main Livio project.
"""

from rest_framework import serializers
from .models import ApartmentPost, University, User, FavoriteApartment, ListingImage


class UserSerializer(serializers.ModelSerializer):
    """
    Serializes User model for owner info.
    Used internally — not exposed as its own API endpoint.

    TODO (main project): Replace with the main project's existing UserSerializer
         if one exists, or use DRF's built-in token/JWT user representation.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class UniversitySerializer(serializers.ModelSerializer):
    """
    Serializes University model to JSON.
    Renames fields to camelCase to match what the frontend map.js expects:
        full_name -> fullName
        latitude  -> lat
        longitude -> lng
    """
    fullName = serializers.CharField(source='full_name')
    lat = serializers.DecimalField(source='latitude', max_digits=9, decimal_places=6)
    lng = serializers.DecimalField(source='longitude', max_digits=9, decimal_places=6)

    class Meta:
        model = University
        fields = ['name', 'fullName', 'lat', 'lng']


class ListingImageSerializer(serializers.ModelSerializer):
    """
    Serializes listing images (S3 URLs).
    Used nested inside ApartmentListSerializer to include all images per listing.
    """
    class Meta:
        model = ListingImage
        fields = ['id', 'image_url', 'label', 'order']


class ApartmentListSerializer(serializers.ModelSerializer):
    """
    Serializes ApartmentPost for read operations (GET list, GET detail).
    Used for map markers, listing cards, and the detail modal.

    Field mappings (database -> JSON):
        monthly_rent -> price
        latitude     -> lat
        longitude    -> lng
        room_type    -> type
        square_feet  -> sqft
        is_active    -> available

    PERFORMANCE NOTE - N+1 Query Problem:
        get_owner() calls obj.owner which runs User.objects.get(id=owner_id)
        get_images() calls ListingImage.objects.filter(listing_id=obj.id)
        For 100 listings, this is 200 extra DB queries on top of the main listing query.

        TODO (main project): Fix N+1 by using select_related and prefetch_related
             in the queryset:
                 ApartmentPost.objects.select_related('owner')
                                      .prefetch_related('listing_images')
             This collapses 200 queries down to 2 regardless of listing count.
             Requires converting owner_id to a ForeignKey first (see models.py).
    """
    price = serializers.DecimalField(source='monthly_rent', max_digits=8, decimal_places=2)
    address = serializers.SerializerMethodField()
    bedrooms = serializers.SerializerMethodField()
    bathrooms = serializers.SerializerMethodField()
    sqft = serializers.IntegerField(source='square_feet')
    lat = serializers.DecimalField(source='latitude', max_digits=9, decimal_places=6)
    lng = serializers.DecimalField(source='longitude', max_digits=9, decimal_places=6)
    type = serializers.CharField(source='room_type')
    amenities = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()
    available = serializers.BooleanField(source='is_active')
    images = serializers.SerializerMethodField()

    class Meta:
        model = ApartmentPost
        fields = [
            'id', 'title', 'price', 'address', 'bedrooms', 'bathrooms',
            'sqft', 'lat', 'lng', 'type', 'description', 'amenities',
            'owner', 'available', 'images', 'image_url'
        ]

    def get_address(self, obj):
        """Combine address components into full address string."""
        parts = [obj.address, obj.city, obj.state, obj.zip_code]
        return ', '.join(filter(None, parts))

    def get_bedrooms(self, obj):
        """
        Convert bedrooms string to integer (0 for Studio).
        The DB stores bedrooms as a string like '1', '2', 'Studio'.
        The frontend filter compares numbers, so we normalize here.
        """
        if obj.bedrooms.lower() == 'studio':
            return 0
        try:
            return int(obj.bedrooms)
        except (ValueError, TypeError):
            return 0

    def get_bathrooms(self, obj):
        """Convert bathrooms string to float (e.g. '1.5' -> 1.5)."""
        try:
            return float(obj.bathrooms)
        except (ValueError, TypeError):
            return 1.0

    def get_amenities(self, obj):
        """
        Convert comma-separated amenities string to a list.
        DB stores: "WiFi,Pool,Gym"  ->  returns: ["WiFi", "Pool", "Gym"]
        """
        if obj.amenities:
            return [a.strip() for a in obj.amenities.split(',')]
        return []

    def get_owner(self, obj):
        """
        Get real owner info from users_user table.
        Returns display name and verification status.

        NOTE: Runs a DB query per listing. See class docstring for N+1 fix.

        TODO (main project): When auth is integrated, the owner info will be
             directly available via select_related — no extra query needed.
             Also consider returning owner's profile picture URL here.
        """
        owner = obj.owner
        if owner:
            # Format username as "A. ndyponc" style for privacy
            name = owner.username
            if len(name) > 1:
                display_name = f"{name[0].upper()}. {name[1:].title()}"
            else:
                display_name = name.title()
            return {
                'name': display_name,
                'verified': owner.is_active
            }
        return {
            'name': 'Property Owner',
            'verified': True
        }

    def get_images(self, obj):
        """
        Get all S3 images for this listing.
        Returns empty list if no images uploaded yet.

        NOTE: Runs a DB query per listing. See class docstring for N+1 fix.

        TODO (main project): If the first image should be the card thumbnail,
             order by 'order' ASC and use the first result as the main image_url.
        """
        images = ListingImage.objects.filter(listing_id=obj.id)
        return ListingImageSerializer(images, many=True).data


class ApartmentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating apartment listings (POST/PUT/PATCH).
    Accepts frontend field names and maps them to database column names.

    Field mappings (JSON -> database):
        price -> monthly_rent
        lat   -> latitude
        lng   -> longitude
        type  -> room_type
        sqft  -> square_feet

    SECURITY NOTE - owner_id:
        Currently the frontend must pass owner_id in the request body.
        This means any user could create a listing with someone else's owner_id.

        TODO (main project): Remove owner_id from the request body entirely.
             Instead, set it automatically in the view from the authenticated user:
                 serializer.save(owner_id=request.user.id)
             This requires JWT/session auth to be working first (see settings.py).
    """
    price = serializers.DecimalField(source='monthly_rent', max_digits=8, decimal_places=2)
    lat = serializers.DecimalField(source='latitude', max_digits=9, decimal_places=6, required=False)
    lng = serializers.DecimalField(source='longitude', max_digits=9, decimal_places=6, required=False)
    type = serializers.CharField(source='room_type')
    sqft = serializers.IntegerField(source='square_feet', required=False, allow_null=True)
    amenities = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True
    )
    amenities_str = serializers.CharField(source='amenities', read_only=True)

    # image_url is optional — default to empty string if not provided
    image_url = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = ApartmentPost
        fields = [
            'id', 'title', 'description', 'address', 'city', 'state', 'zip_code',
            'lat', 'lng', 'price', 'bedrooms', 'bathrooms', 'sqft', 'type',
            'amenities', 'amenities_str', 'image_url', 'available_from', 'owner_id'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        """
        Create a new listing.
        Converts amenities list -> comma-separated string for DB storage.
        Sets required 'location' field from city name.
        """
        # Handle amenities list -> comma-separated string
        amenities_list = validated_data.pop('amenities', [])
        if isinstance(amenities_list, list):
            validated_data['amenities'] = ','.join(amenities_list)
        else:
            validated_data['amenities'] = amenities_list or ''

        # Set location field (required by the existing table schema)
        validated_data['location'] = validated_data.get('city', '')

        # Set defaults
        validated_data.setdefault('image_url', '')
        validated_data.setdefault('is_active', True)

        return ApartmentPost.objects.create(**validated_data)

    def update(self, instance, validated_data):
        """
        Update an existing listing.
        Only updates fields that are sent — others remain unchanged.
        """
        # Handle amenities
        amenities_list = validated_data.pop('amenities', None)
        if amenities_list is not None:
            if isinstance(amenities_list, list):
                instance.amenities = ','.join(amenities_list)
            else:
                instance.amenities = amenities_list

        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class FavoriteSerializer(serializers.ModelSerializer):
    """
    Serializer for reading favorites — includes full listing details nested inside.
    Used when fetching a user's saved listings (GET /api/favorites/<user_id>/).

    NOTE: get_listing() runs a DB query per favorite. Same N+1 issue as above.

    TODO (main project): Use prefetch_related to batch-fetch all favorite listings
         in one query instead of one per favorite row.
    """
    listing = serializers.SerializerMethodField()

    class Meta:
        model = FavoriteApartment
        fields = ['id', 'user_id', 'apartment_id', 'created_at', 'listing']
        read_only_fields = ['id', 'created_at']

    def get_listing(self, obj):
        """Get the full listing details for this favorite."""
        try:
            listing = ApartmentPost.objects.get(id=obj.apartment_id)
            return ApartmentListSerializer(listing).data
        except ApartmentPost.DoesNotExist:
            return None


class FavoriteCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for adding a listing to favorites (POST /api/favorites/).
    Validates that the listing exists and isn't already favorited.

    TODO (main project): Remove user_id from the accepted fields.
         It should come from request.user.id (authenticated user), not request body.
         This prevents users from favoriting things under other users' accounts.
    """
    class Meta:
        model = FavoriteApartment
        fields = ['user_id', 'apartment_id']

    def validate(self, data):
        """Check that the listing exists and favorite doesn't already exist."""
        if not ApartmentPost.objects.filter(id=data['apartment_id']).exists():
            raise serializers.ValidationError("Listing does not exist")

        if FavoriteApartment.objects.filter(
            user_id=data['user_id'],
            apartment_id=data['apartment_id']
        ).exists():
            raise serializers.ValidationError("Already in favorites")

        return data
