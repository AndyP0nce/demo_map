"""
Database models for the Housing Finder API.

ApartmentPost     - Maps to existing 'apartments_apartmentpost' table in LIVIO database
User              - Maps to existing 'users_user' table
FavoriteApartment - Maps to existing 'apartments_favoriteapartment' table
University        - New table for California universities (created by Django)
ListingImage      - New table for S3 image URLs (created by Django)

STATUS: Complete for demo. See TODOs for what needs to change when merging
        into the main Livio project.
"""

from django.db import models


class User(models.Model):
    """
    Maps to the existing users_user table in the LIVIO database.
    Used as a read-only model to fetch owner info for listings.

    TODO (main project): When merging, do NOT keep this custom User model.
         The main project should use Django's built-in AbstractUser or your
         existing users_user table hooked up via AUTH_USER_MODEL in settings.py.
         Replace references to this User with request.user (from JWT auth).

    TODO (main project): Add a ForeignKey on ApartmentPost.owner_id pointing
         to the real User model so Django handles joins automatically.
         Right now owner_id is just a raw BigIntegerField with no DB constraint.
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
        managed = False  # Django will NOT create/alter/drop this table

    def __str__(self):
        return self.username


class ApartmentPost(models.Model):
    """
    Maps to the existing apartments_apartmentpost table in the LIVIO database.
    managed = False means Django reads/writes this table but never modifies its schema.

    TODO (main project): Once auth is integrated, remove owner_id as a plain
         BigIntegerField and replace with:
             owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
         This gives you owner.username, owner.email, etc. without extra queries.

    TODO (main project): The 'amenities' field is stored as a comma-separated string
         (e.g. "WiFi,Pool,Gym"). Consider migrating to a proper many-to-many table
         or a JSON field for cleaner querying and filtering.

    TODO (main project): Add server-side search/filter support. Right now all filtering
         is done on the frontend. The API returns every listing and the browser filters
         them. With more data this will be slow — add query params to get_queryset
         in ListingListCreateView (see views.py TODOs).
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
        managed = False  # Django will NOT create/alter/drop this table

    def __str__(self):
        return self.title

    @property
    def owner(self):
        """
        Get the User object for this listing's owner.

        NOTE: This runs a separate DB query every time it's called.
        With many listings this causes an N+1 query problem (1 query for listings,
        then N queries for owners). See serializers.py for how this is called.

        TODO (main project): Replace this with a proper ForeignKey and use
             select_related('owner') in the queryset to fetch in one query.
        """
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
    Maps to the existing apartments_favoriteapartment table in the LIVIO database.
    Stores which listings a user has bookmarked/saved.

    TODO (main project): Same as ApartmentPost - replace user_id and apartment_id
         raw BigIntegerFields with proper ForeignKeys once auth is in place:
             user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
             apartment = models.ForeignKey(ApartmentPost, on_delete=models.CASCADE)
         This enforces referential integrity at the DB level.

    TODO (main project): Right now any user_id can be passed in the request body —
         there's no check that it matches the authenticated user. When auth is added,
         the user_id should be pulled from request.user.id in the view, not from
         request.data (see views.py TODOs).
    """
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    apartment_id = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'apartments_favoriteapartment'
        managed = False  # Django will NOT create/alter/drop this table
        unique_together = ['user_id', 'apartment_id']

    def __str__(self):
        return f"User {self.user_id} - Apartment {self.apartment_id}"


class University(models.Model):
    """
    California universities used as map markers.
    This IS a new table — Django created it via migrations.
    Seeded with 43 schools using: python manage.py seed_universities

    TODO (main project): If the main project already has a university/campus table,
         map to that instead (set managed=False and point db_table to it).
         If not, run the same migration + seed command there.

    TODO (expansion): Add more fields like website URL, enrollment count, housing
         office contact, or a radius (in miles) to filter nearby listings.
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
    Stores S3 image URLs for apartment listings.
    One listing can have multiple images. The 'order' field controls display order.
    This IS a new table — Django created it via migrations.

    TODO (main project): Replace listing_id raw BigIntegerField with a ForeignKey:
             listing = models.ForeignKey(ApartmentPost, on_delete=models.CASCADE,
                                         related_name='listing_images')
         Then you can do listing.listing_images.all() instead of
         ListingImage.objects.filter(listing_id=listing.id).

    TODO (main project): Add image size/dimension validation in the upload view
         (max file size, allowed formats: jpg/png/webp).

    TODO (main project): If the main project already has an image table for listings,
         map to that instead of this one.
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
