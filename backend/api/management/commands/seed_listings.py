"""
Management command to seed the database with 10 test apartment listings.

Usage:
    python manage.py seed_listings

    # Seed using a specific owner (must exist in users_user table)
    python manage.py seed_listings --owner-id 65

    # Remove all seeded test listings and re-seed
    python manage.py seed_listings --reset

All listings are placed near California universities with valid lat/lng
so they appear immediately on the map.
"""

from django.core.management.base import BaseCommand, CommandError
from api.models import ApartmentPost, User


TEST_LISTINGS = [
    {
        'title': '2BR Near CSUN — Modern & Bright',
        'description': 'Spacious 2 bedroom apartment a short walk from CSUN. Updated kitchen, in-unit laundry.',
        'location': 'Northridge',
        'address': '9301 Reseda Blvd',
        'city': 'Northridge',
        'state': 'CA',
        'zip_code': '91324',
        'latitude': 34.2230,
        'longitude': -118.5390,
        'monthly_rent': 1950.00,
        'bedrooms': '2',
        'bathrooms': '1',
        'square_feet': 900,
        'room_type': 'Apartment',
        'amenities': 'WiFi,Parking,Laundry,AC',
        'image_url': '',
    },
    {
        'title': 'Studio Near UCLA — Perfect for Students',
        'description': 'Cozy studio apartment 5 minutes from UCLA campus. Bills included.',
        'location': 'Westwood',
        'address': '10920 Wilshire Blvd',
        'city': 'Los Angeles',
        'state': 'CA',
        'zip_code': '90024',
        'latitude': 34.0600,
        'longitude': -118.4450,
        'monthly_rent': 1600.00,
        'bedrooms': 'Studio',
        'bathrooms': '1',
        'square_feet': 420,
        'room_type': 'Studio',
        'amenities': 'WiFi,Gym,Pool',
        'image_url': '',
    },
    {
        'title': '1BR in Koreatown — Close to USC',
        'description': 'Clean 1 bedroom near USC and Metro. Quiet building, gated parking.',
        'location': 'Koreatown',
        'address': '3470 Wilshire Blvd',
        'city': 'Los Angeles',
        'state': 'CA',
        'zip_code': '90010',
        'latitude': 34.0580,
        'longitude': -118.3000,
        'monthly_rent': 1750.00,
        'bedrooms': '1',
        'bathrooms': '1',
        'square_feet': 650,
        'room_type': 'Apartment',
        'amenities': 'WiFi,Parking,Laundry',
        'image_url': '',
    },
    {
        'title': '3BR House Near SDSU — Split with Friends',
        'description': 'Full 3 bedroom house near SDSU. Great for 3 roommates. Backyard, street parking.',
        'location': 'College Area',
        'address': '5402 College Ave',
        'city': 'San Diego',
        'state': 'CA',
        'zip_code': '92115',
        'latitude': 32.7800,
        'longitude': -117.0700,
        'monthly_rent': 2800.00,
        'bedrooms': '3',
        'bathrooms': '2',
        'square_feet': 1200,
        'room_type': 'House',
        'amenities': 'Parking,Laundry,Backyard,Pet Friendly',
        'image_url': '',
    },
    {
        'title': 'Private Room in Shared House — Berkeley',
        'description': 'Furnished private room in a shared 4BR house near UC Berkeley. All utilities included.',
        'location': 'Southside Berkeley',
        'address': '2519 Telegraph Ave',
        'city': 'Berkeley',
        'state': 'CA',
        'zip_code': '94704',
        'latitude': 37.8650,
        'longitude': -122.2590,
        'monthly_rent': 1200.00,
        'bedrooms': '1',
        'bathrooms': '1',
        'square_feet': 220,
        'room_type': 'Private Room',
        'amenities': 'WiFi,Furnished,Utilities Included',
        'image_url': '',
    },
    {
        'title': '2BR Condo — Walking Distance to SJSU',
        'description': 'Modern 2BR condo in downtown San Jose, 10 min walk to SJSU. City views.',
        'location': 'Downtown San Jose',
        'address': '200 S 2nd St',
        'city': 'San Jose',
        'state': 'CA',
        'zip_code': '95113',
        'latitude': 37.3350,
        'longitude': -121.8850,
        'monthly_rent': 2200.00,
        'bedrooms': '2',
        'bathrooms': '2',
        'square_feet': 1050,
        'room_type': 'Condo',
        'amenities': 'WiFi,Gym,Doorman,Parking',
        'image_url': '',
    },
    {
        'title': 'Studio Loft Near Stanford',
        'description': 'Open-concept studio loft in Palo Alto. Ideal for Stanford grad students.',
        'location': 'Downtown Palo Alto',
        'address': '400 University Ave',
        'city': 'Palo Alto',
        'state': 'CA',
        'zip_code': '94301',
        'latitude': 37.4450,
        'longitude': -122.1600,
        'monthly_rent': 2400.00,
        'bedrooms': 'Studio',
        'bathrooms': '1',
        'square_feet': 510,
        'room_type': 'Studio',
        'amenities': 'WiFi,Bike Storage,AC',
        'image_url': '',
    },
    {
        'title': '1BR Near CSULB — Quiet Neighborhood',
        'description': 'Well-maintained 1 bedroom apartment near Cal State Long Beach. On-site laundry.',
        'location': 'Bixby Knolls',
        'address': '4400 Atlantic Ave',
        'city': 'Long Beach',
        'state': 'CA',
        'zip_code': '90807',
        'latitude': 33.8100,
        'longitude': -118.1650,
        'monthly_rent': 1650.00,
        'bedrooms': '1',
        'bathrooms': '1',
        'square_feet': 720,
        'room_type': 'Apartment',
        'amenities': 'Parking,Laundry,Pet Friendly',
        'image_url': '',
    },
    {
        'title': '2BR Near Cal Poly Pomona',
        'description': 'Affordable 2 bedroom near Cal Poly Pomona. Gated complex with pool.',
        'location': 'Pomona',
        'address': '1200 W Temple Ave',
        'city': 'Pomona',
        'state': 'CA',
        'zip_code': '91768',
        'latitude': 34.0570,
        'longitude': -117.8230,
        'monthly_rent': 1800.00,
        'bedrooms': '2',
        'bathrooms': '1',
        'square_feet': 880,
        'room_type': 'Apartment',
        'amenities': 'Pool,Parking,Laundry,AC',
        'image_url': '',
    },
    {
        'title': 'Shared Room Near Caltech — Furnished',
        'description': 'Furnished shared room in a 3BR apartment near Caltech. Great for researchers.',
        'location': 'Pasadena',
        'address': '500 S Lake Ave',
        'city': 'Pasadena',
        'state': 'CA',
        'zip_code': '91101',
        'latitude': 34.1380,
        'longitude': -118.1270,
        'monthly_rent': 950.00,
        'bedrooms': '1',
        'bathrooms': '1',
        'square_feet': 180,
        'room_type': 'Shared Room',
        'amenities': 'WiFi,Furnished,Utilities Included,AC',
        'image_url': '',
    },
]


class Command(BaseCommand):
    help = 'Seed the database with 10 test apartment listings near California universities'

    def add_arguments(self, parser):
        parser.add_argument(
            '--owner-id',
            type=int,
            default=None,
            help='User ID to assign as owner of all test listings (default: first user in DB)',
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing test listings before seeding',
        )

    def handle(self, *args, **options):
        # Find owner
        owner_id = options['owner_id']
        if owner_id:
            if not User.objects.filter(id=owner_id).exists():
                raise CommandError(f'User with id={owner_id} does not exist. '
                                   f'Run: python manage.py shell then User.objects.all()')
            owner = User.objects.get(id=owner_id)
        else:
            owner = User.objects.first()
            if not owner:
                raise CommandError('No users found in the database. Create a user first.')

        self.stdout.write(f'Using owner: {owner.username} (id={owner.id})')

        # Optional reset
        if options['reset']:
            deleted, _ = ApartmentPost.objects.filter(
                title__in=[l['title'] for l in TEST_LISTINGS]
            ).delete()
            self.stdout.write(f'Deleted {deleted} existing test listings')

        # Create listings
        created_count = 0
        skipped_count = 0

        for listing_data in TEST_LISTINGS:
            title = listing_data['title']

            # Skip if already exists (avoid duplicates)
            if ApartmentPost.objects.filter(title=title, owner_id=owner.id).exists():
                self.stdout.write(f'  Skipped (already exists): {title}')
                skipped_count += 1
                continue

            ApartmentPost.objects.create(
                **listing_data,
                is_active=True,
                owner_id=owner.id,
            )
            self.stdout.write(f'  Created: {title}')
            created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created {created_count} listings, skipped {skipped_count} duplicates.'
        ))
        self.stdout.write(
            f'Refresh http://localhost:8000 to see them on the map.'
        )
