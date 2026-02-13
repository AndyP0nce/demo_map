"""
Database models for the Housing Finder API.

ApartmentPost - Maps to existing 'apartments_apartmentpost' table in LIVIO database
User          - Maps to existing 'users_user' table
FavoriteApartment - Maps to existing 'apartments_favoriteapartment' table
University    - New table for California universities
"""

from django.db import models


class User(models.Model):
    """
    Maps to the existing users_user table.
    Read-only model for getting owner information.
    """
    id = models.BigAutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    email = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=128)
    join_date = models.DateTimeField()
    last_login = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'users_user'
        managed = False

    def __str__(self):
        return self.username


class ApartmentPost(models.Model):
    """
    Maps to the existing apartments_apartmentpost table.
    """
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=200)
    address = models.CharField(max_length=300, null=True, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=40)
    zip_code = models.CharField(max_length=10, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    monthly_rent = models.DecimalField(max_digits=8, decimal_places=2)
    bedrooms = models.CharField(max_length=20)
    bathrooms = models.CharField(max_length=20)
    square_feet = models.PositiveIntegerField(null=True, blank=True)
    room_type = models.CharField(max_length=50)
    amenities = models.CharField(max_length=500)
    image_url = models.CharField(max_length=500)
    image = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    available_from = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner_id = models.BigIntegerField()

    class Meta:
        db_table = 'apartments_apartmentpost'
        managed = False

    def __str__(self):
        return self.title

    @property
    def owner(self):
        """Get the User object for this listing's owner."""
        try:
            return User.objects.get(id=self.owner_id)
        except User.DoesNotExist:
            return None

    @property
    def amenities_list(self):
        """Convert comma-separated amenities string to a list."""
        if self.amenities:
            return [a.strip() for a in self.amenities.split(',')]
        return []

    @property
    def full_address(self):
        """Combine address components into a single string."""
        parts = [self.address, self.city, self.state, self.zip_code]
        return ', '.join(filter(None, parts))


class FavoriteApartment(models.Model):
    """
    Maps to the existing apartments_favoriteapartment table.
    Stores user's saved/bookmarked listings.
    """
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    apartment_id = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'apartments_favoriteapartment'
        managed = False
        unique_together = ['user_id', 'apartment_id']

    def __str__(self):
        return f"User {self.user_id} - Apartment {self.apartment_id}"


class University(models.Model):
    """
    California universities for the map.
    This is a NEW table - Django will create it when you run migrations.
    """
    name = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'api_university'
        ordering = ['name']

    def __str__(self):
        return self.name


class ListingImage(models.Model):
    """
    Images for apartment listings.
    Stores S3 URLs for listing photos.
    """
    id = models.BigAutoField(primary_key=True)
    listing_id = models.BigIntegerField()
    image_url = models.CharField(max_length=500)
    label = models.CharField(max_length=100, null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_listing_image'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Image for listing {self.listing_id}"
