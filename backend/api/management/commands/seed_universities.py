"""
Management command to seed the universities table with California universities.

Usage:
    python manage.py seed_universities

This will add all 43 California universities to the database.
"""

from django.core.management.base import BaseCommand
from api.models import University


UNIVERSITIES = [
    # UC Schools
    {'name': 'UCLA', 'full_name': 'University of California, Los Angeles', 'latitude': 34.0689, 'longitude': -118.4452},
    {'name': 'UC Berkeley', 'full_name': 'University of California, Berkeley', 'latitude': 37.8719, 'longitude': -122.2585},
    {'name': 'UCSD', 'full_name': 'University of California, San Diego', 'latitude': 32.8801, 'longitude': -117.2340},
    {'name': 'UC Irvine', 'full_name': 'University of California, Irvine', 'latitude': 33.6405, 'longitude': -117.8443},
    {'name': 'UC Davis', 'full_name': 'University of California, Davis', 'latitude': 38.5382, 'longitude': -121.7617},
    {'name': 'UC Santa Barbara', 'full_name': 'University of California, Santa Barbara', 'latitude': 34.4140, 'longitude': -119.8489},
    {'name': 'UC Santa Cruz', 'full_name': 'University of California, Santa Cruz', 'latitude': 36.9914, 'longitude': -122.0609},
    {'name': 'UC Riverside', 'full_name': 'University of California, Riverside', 'latitude': 33.9737, 'longitude': -117.3281},
    {'name': 'UC Merced', 'full_name': 'University of California, Merced', 'latitude': 37.3660, 'longitude': -120.4248},
    {'name': 'UCSF', 'full_name': 'University of California, San Francisco', 'latitude': 37.7631, 'longitude': -122.4586},

    # CSU Schools
    {'name': 'CSUN', 'full_name': 'California State University, Northridge', 'latitude': 34.2381, 'longitude': -118.5285},
    {'name': 'CSULB', 'full_name': 'California State University, Long Beach', 'latitude': 33.7838, 'longitude': -118.1141},
    {'name': 'CSUF', 'full_name': 'California State University, Fullerton', 'latitude': 33.8829, 'longitude': -117.8869},
    {'name': 'SDSU', 'full_name': 'San Diego State University', 'latitude': 32.7757, 'longitude': -117.0719},
    {'name': 'SJSU', 'full_name': 'San José State University', 'latitude': 37.3352, 'longitude': -121.8811},
    {'name': 'SF State', 'full_name': 'San Francisco State University', 'latitude': 37.7241, 'longitude': -122.4783},
    {'name': 'Cal Poly SLO', 'full_name': 'California Polytechnic State University, San Luis Obispo', 'latitude': 35.3050, 'longitude': -120.6625},
    {'name': 'Cal Poly Pomona', 'full_name': 'California State Polytechnic University, Pomona', 'latitude': 34.0565, 'longitude': -117.8215},
    {'name': 'Fresno State', 'full_name': 'California State University, Fresno', 'latitude': 36.8134, 'longitude': -119.7483},
    {'name': 'Sac State', 'full_name': 'California State University, Sacramento', 'latitude': 38.5607, 'longitude': -121.4234},
    {'name': 'Cal State LA', 'full_name': 'California State University, Los Angeles', 'latitude': 34.0667, 'longitude': -118.1690},
    {'name': 'CSU East Bay', 'full_name': 'California State University, East Bay', 'latitude': 37.6565, 'longitude': -122.0568},
    {'name': 'Chico State', 'full_name': 'California State University, Chico', 'latitude': 39.7301, 'longitude': -121.8455},
    {'name': 'Sonoma State', 'full_name': 'Sonoma State University', 'latitude': 38.3394, 'longitude': -122.6741},
    {'name': 'Humboldt', 'full_name': 'Cal Poly Humboldt', 'latitude': 40.8760, 'longitude': -124.0786},
    {'name': 'CSU Dominguez Hills', 'full_name': 'California State University, Dominguez Hills', 'latitude': 33.8636, 'longitude': -118.2553},
    {'name': 'CSU San Bernardino', 'full_name': 'California State University, San Bernardino', 'latitude': 34.1812, 'longitude': -117.3237},
    {'name': 'CSU Bakersfield', 'full_name': 'California State University, Bakersfield', 'latitude': 35.3507, 'longitude': -119.1026},
    {'name': 'Stanislaus State', 'full_name': 'California State University, Stanislaus', 'latitude': 37.5256, 'longitude': -120.8561},
    {'name': 'CSU Monterey Bay', 'full_name': 'California State University, Monterey Bay', 'latitude': 36.6536, 'longitude': -121.7989},
    {'name': 'CSU San Marcos', 'full_name': 'California State University, San Marcos', 'latitude': 33.1284, 'longitude': -117.1597},
    {'name': 'CSU Channel Islands', 'full_name': 'California State University, Channel Islands', 'latitude': 34.1625, 'longitude': -119.0452},
    {'name': 'Maritime Academy', 'full_name': 'California State University Maritime Academy', 'latitude': 38.0698, 'longitude': -122.2310},

    # Private Universities
    {'name': 'Stanford', 'full_name': 'Stanford University', 'latitude': 37.4275, 'longitude': -122.1697},
    {'name': 'USC', 'full_name': 'University of Southern California', 'latitude': 34.0224, 'longitude': -118.2851},
    {'name': 'Caltech', 'full_name': 'California Institute of Technology', 'latitude': 34.1377, 'longitude': -118.1253},
    {'name': 'Pepperdine', 'full_name': 'Pepperdine University', 'latitude': 34.0360, 'longitude': -118.7095},
    {'name': 'LMU', 'full_name': 'Loyola Marymount University', 'latitude': 33.9700, 'longitude': -118.4179},
    {'name': 'USD', 'full_name': 'University of San Diego', 'latitude': 32.7719, 'longitude': -117.1881},
    {'name': 'Santa Clara', 'full_name': 'Santa Clara University', 'latitude': 37.3496, 'longitude': -121.9390},
    {'name': 'USF', 'full_name': 'University of San Francisco', 'latitude': 37.7765, 'longitude': -122.4506},
    {'name': 'Chapman', 'full_name': 'Chapman University', 'latitude': 33.7930, 'longitude': -117.8514},
    {'name': 'Pomona College', 'full_name': 'Pomona College', 'latitude': 34.0977, 'longitude': -117.7112},
]


class Command(BaseCommand):
    help = 'Seed the universities table with California universities'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for uni_data in UNIVERSITIES:
            uni, created = University.objects.update_or_create(
                name=uni_data['name'],
                defaults={
                    'full_name': uni_data['full_name'],
                    'latitude': uni_data['latitude'],
                    'longitude': uni_data['longitude'],
                    'is_active': True,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f"  Created: {uni.name}")
            else:
                updated_count += 1
                self.stdout.write(f"  Updated: {uni.name}")

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created {created_count}, updated {updated_count} universities.'
        ))
