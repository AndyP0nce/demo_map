"""
Serializers for the Housing Finder API.

Serializers convert database models to JSON and back.
They also rename fields to match what the frontend expects.
"""

from rest_framework import serializers
from .models import ApartmentPost, University


class UniversitySerializer(serializers.ModelSerializer):
    """
    Serializes University model to JSON.

    Output format matches frontend expectations:
    {
        "name": "CSUN",
        "fullName": "California State University, Northridge",
        "lat": 34.2381,
        "lng": -118.5285
    }
    """
    # Rename fields to match frontend JavaScript conventions (camelCase)
    fullName = serializers.CharField(source='full_name')
    lat = serializers.DecimalField(source='latitude', max_digits=9, decimal_places=6)
    lng = serializers.DecimalField(source='longitude', max_digits=9, decimal_places=6)

    class Meta:
        model = University
        fields = ['name', 'fullName', 'lat', 'lng']


class ApartmentListSerializer(serializers.ModelSerializer):
    """
    Serializes ApartmentPost for list views (map markers, cards).

    Output format matches frontend LISTINGS array:
    {
        "id": 1,
        "title": "Cozy Studio Near Campus",
        "price": 1200,
        "address": "123 Main St, Northridge, CA 91330",
        "bedrooms": 0,
        "bathrooms": 1,
        "sqft": 450,
        "lat": 34.2367,
        "lng": -118.5301,
        "type": "Studio",
        "description": "...",
        "amenities": ["parking", "gym", "pool"],
        "owner": { "name": "John D.", "verified": true },
        "available": true
    }
    """
    # Rename fields to match frontend conventions
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

    class Meta:
        model = ApartmentPost
        fields = [
            'id', 'title', 'price', 'address', 'bedrooms', 'bathrooms',
            'sqft', 'lat', 'lng', 'type', 'description', 'amenities',
            'owner', 'available'
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
        """
        Get owner info. For now returns placeholder.
        TODO: Join with users_user table for real owner data.
        """
        # Placeholder - you can extend this to fetch from users_user
        return {
            'name': 'Property Owner',
            'verified': True
        }
