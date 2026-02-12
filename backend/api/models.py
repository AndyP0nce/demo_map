"""
Database models for the Housing Finder API.

ApartmentPost - Maps to existing 'apartments_apartmentpost' table in LIVIO database
University    - New table for California universities (will be created by Django)
"""

from django.db import models


class ApartmentPost(models.Model):
    """
    Maps to the existing apartments_apartmentpost table.

    Using managed=False tells Django NOT to create/modify this table,
    since it already exists in the LIVIO database.
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
    amenities = models.CharField(max_length=500)  # Comma-separated string
    image_url = models.CharField(max_length=500)
    image = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    available_from = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner_id = models.BigIntegerField()  # Foreign key to users_user

    class Meta:
        db_table = 'apartments_apartmentpost'  # Use existing table
        managed = False  # Don't let Django modify this table

    def __str__(self):
        return self.title

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


class University(models.Model):
    """
    California universities for the map.

    This is a NEW table - Django will create it when you run migrations.
    """
    name = models.CharField(max_length=50, unique=True)  # Short name like "CSUN", "UCLA"
    full_name = models.CharField(max_length=200)  # Full name like "California State University, Northridge"
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'api_university'  # Explicit table name
        ordering = ['name']

    def __str__(self):
        return self.name
