"""
Serializers for the Housing Finder API.

Serializers convert database models to JSON and back.
They also rename fields to match what the frontend expects.
"""

from rest_framework import serializers
from .models import ApartmentPost, University, User, FavoriteApartment, ListingImage


class UserSerializer(serializers.ModelSerializer):
    """Serializes User model for owner info."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class UniversitySerializer(serializers.ModelSerializer):
    """
    Serializes University model to JSON.
    """
    fullName = serializers.CharField(source='full_name')
    lat = serializers.DecimalField(source='latitude', max_digits=9, decimal_places=6)
    lng = serializers.DecimalField(source='longitude', max_digits=9, decimal_places=6)

    class Meta:
        model = University
        fields = ['name', 'fullName', 'lat', 'lng']


class ListingImageSerializer(serializers.ModelSerializer):
    """Serializes listing images."""
    class Meta:
        model = ListingImage
        fields = ['id', 'image_url', 'label', 'order']


class ApartmentListSerializer(serializers.ModelSerializer):
    """
    Serializes ApartmentPost for list views (map markers, cards).
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
        """Convert bedrooms string to integer (0 for Studio)."""
        if obj.bedrooms.lower() == 'studio':
            return 0
        try:
            return int(obj.bedrooms)
        except (ValueError, TypeError):
            return 0

    def get_bathrooms(self, obj):
        """Convert bathrooms string to float."""
        try:
            return float(obj.bathrooms)
        except (ValueError, TypeError):
            return 1.0

    def get_amenities(self, obj):
        """Convert comma-separated amenities to list."""
        if obj.amenities:
            return [a.strip() for a in obj.amenities.split(',')]
        return []

    def get_owner(self, obj):
        """Get real owner info from users_user table."""
        owner = obj.owner
        if owner:
            # Get first initial of username for display
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
        """Get all images for this listing."""
        images = ListingImage.objects.filter(listing_id=obj.id)
        return ListingImageSerializer(images, many=True).data


class ApartmentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating apartment listings.
    Accepts frontend field names and maps to database fields.
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

    class Meta:
        model = ApartmentPost
        fields = [
            'id', 'title', 'description', 'address', 'city', 'state', 'zip_code',
            'lat', 'lng', 'price', 'bedrooms', 'bathrooms', 'sqft', 'type',
            'amenities', 'amenities_str', 'image_url', 'available_from', 'owner_id'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        """Create a new listing."""
        # Handle amenities list -> comma-separated string
        amenities_list = validated_data.pop('amenities', [])
        if isinstance(amenities_list, list):
            validated_data['amenities'] = ','.join(amenities_list)
        else:
            validated_data['amenities'] = amenities_list or ''

        # Set location field (required by table)
        validated_data['location'] = validated_data.get('city', '')

        # Set defaults
        validated_data.setdefault('image_url', '')
        validated_data.setdefault('is_active', True)

        return ApartmentPost.objects.create(**validated_data)

    def update(self, instance, validated_data):
        """Update an existing listing."""
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
    """Serializer for favorite/saved listings."""
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
    """Serializer for creating favorites."""
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
