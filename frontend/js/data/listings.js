/**
 * listings.js
 * ---------------------------------------------------
 * Fake rental listing data around the San Fernando Valley.
 * Each listing has the same fields a real Zillow-style card needs:
 *   id, title, price, address, bedrooms, bathrooms, sqft,
 *   lat/lng, type, description, amenities, owner, distance, available.
 *
 * CSUN is the default focal university.
 * imageColor is a placeholder background for the demo (no real photos).
 * ---------------------------------------------------
 */

// Default university center point
export const CSUN = {
  name: 'CSUN',
  fullName: 'California State University, Northridge',
  lat: 34.2381,
  lng: -118.5285,
};

// All major California universities (UC, CSU, and notable private)
export const UNIVERSITIES = [
  // ── UC System ───────────────────────────────────────
  { name: 'UC Berkeley', fullName: 'University of California, Berkeley', lat: 37.8719, lng: -122.2585 },
  { name: 'UC Davis', fullName: 'University of California, Davis', lat: 38.5382, lng: -121.7617 },
  { name: 'UC Irvine', fullName: 'University of California, Irvine', lat: 33.6405, lng: -117.8443 },
  { name: 'UCLA', fullName: 'University of California, Los Angeles', lat: 34.0689, lng: -118.4452 },
  { name: 'UC Merced', fullName: 'University of California, Merced', lat: 37.3661, lng: -120.4242 },
  { name: 'UC Riverside', fullName: 'University of California, Riverside', lat: 33.9737, lng: -117.3281 },
  { name: 'UC San Diego', fullName: 'University of California, San Diego', lat: 32.8801, lng: -117.2340 },
  { name: 'UCSF', fullName: 'University of California, San Francisco', lat: 37.7631, lng: -122.4586 },
  { name: 'UC Santa Barbara', fullName: 'University of California, Santa Barbara', lat: 34.4140, lng: -119.8489 },
  { name: 'UC Santa Cruz', fullName: 'University of California, Santa Cruz', lat: 36.9914, lng: -122.0609 },

  // ── CSU System ──────────────────────────────────────
  { name: 'CSUN', fullName: 'California State University, Northridge', lat: 34.2381, lng: -118.5285 },
  { name: 'CSU Bakersfield', fullName: 'California State University, Bakersfield', lat: 35.3508, lng: -119.1026 },
  { name: 'CSU Channel Islands', fullName: 'California State University, Channel Islands', lat: 34.1622, lng: -119.0442 },
  { name: 'Chico State', fullName: 'California State University, Chico', lat: 39.7285, lng: -121.8463 },
  { name: 'CSU Dominguez Hills', fullName: 'California State University, Dominguez Hills', lat: 33.8634, lng: -118.2560 },
  { name: 'CSU East Bay', fullName: 'California State University, East Bay', lat: 37.6557, lng: -122.0566 },
  { name: 'Fresno State', fullName: 'California State University, Fresno', lat: 36.8134, lng: -119.7483 },
  { name: 'CSU Fullerton', fullName: 'California State University, Fullerton', lat: 33.8829, lng: -117.8854 },
  { name: 'Cal Poly Humboldt', fullName: 'California State Polytechnic University, Humboldt', lat: 40.8757, lng: -124.0786 },
  { name: 'CSU Long Beach', fullName: 'California State University, Long Beach', lat: 33.7838, lng: -118.1141 },
  { name: 'CSU Los Angeles', fullName: 'California State University, Los Angeles', lat: 34.0662, lng: -118.1685 },
  { name: 'CSU Maritime', fullName: 'California State University Maritime Academy', lat: 38.0690, lng: -122.2312 },
  { name: 'CSU Monterey Bay', fullName: 'California State University, Monterey Bay', lat: 36.6536, lng: -121.7985 },
  { name: 'Cal Poly Pomona', fullName: 'California State Polytechnic University, Pomona', lat: 34.0565, lng: -117.8216 },
  { name: 'Sacramento State', fullName: 'California State University, Sacramento', lat: 38.5616, lng: -121.4239 },
  { name: 'Cal Poly SLO', fullName: 'California Polytechnic State University, San Luis Obispo', lat: 35.3050, lng: -120.6625 },
  { name: 'CSU San Bernardino', fullName: 'California State University, San Bernardino', lat: 34.1816, lng: -117.3233 },
  { name: 'SDSU', fullName: 'San Diego State University', lat: 32.7748, lng: -117.0722 },
  { name: 'SFSU', fullName: 'San Francisco State University', lat: 37.7219, lng: -122.4782 },
  { name: 'SJSU', fullName: 'San Jose State University', lat: 37.3352, lng: -121.8811 },
  { name: 'CSU San Marcos', fullName: 'California State University, San Marcos', lat: 33.1284, lng: -117.1597 },
  { name: 'Sonoma State', fullName: 'Sonoma State University', lat: 38.3394, lng: -122.6741 },
  { name: 'CSU Stanislaus', fullName: 'California State University, Stanislaus', lat: 37.5247, lng: -120.8558 },

  // ── Notable Private Universities ────────────────────
  { name: 'Stanford', fullName: 'Stanford University', lat: 37.4275, lng: -122.1697 },
  { name: 'USC', fullName: 'University of Southern California', lat: 34.0224, lng: -118.2851 },
  { name: 'Caltech', fullName: 'California Institute of Technology', lat: 34.1377, lng: -118.1253 },
  { name: 'Pepperdine', fullName: 'Pepperdine University', lat: 34.0367, lng: -118.7120 },
  { name: 'USD', fullName: 'University of San Diego', lat: 32.7716, lng: -117.1881 },
  { name: 'USF', fullName: 'University of San Francisco', lat: 37.7767, lng: -122.4520 },
  { name: 'LMU', fullName: 'Loyola Marymount University', lat: 33.9692, lng: -118.4184 },
  { name: 'Santa Clara', fullName: 'Santa Clara University', lat: 37.3496, lng: -121.9381 },
  { name: 'Chapman', fullName: 'Chapman University', lat: 33.7929, lng: -117.8520 },
  { name: 'Claremont Colleges', fullName: 'The Claremont Colleges', lat: 34.0966, lng: -117.7087 },
];

export const LISTINGS = [
  // ── Northridge (near CSUN) ────────────────────────
  {
    id: 1,
    title: 'Modern Studio Apartment',
    price: 1350,
    address: '9145 Reseda Blvd, Northridge, CA 91324',
    bedrooms: 0,
    bathrooms: 1,
    sqft: 425,
    lat: 34.2320,
    lng: -118.5365,
    type: 'Studio',
    description:
      'Clean and updated studio within walking distance to CSUN. Includes in-unit laundry, AC, and one reserved parking spot.',
    amenities: ['Parking', 'Laundry', 'A/C'],
    owner: { name: 'Sarah Johnson', verified: true },
    distanceFromCSUN: '0.5 mi',
    available: 'Mar 1, 2026',
    imageColor: '#4A90D9',
  },
  {
    id: 2,
    title: 'Spacious 2BR Near Campus',
    price: 2100,
    address: '18345 Plummer St, Northridge, CA 91325',
    bedrooms: 2,
    bathrooms: 2,
    sqft: 900,
    lat: 34.2410,
    lng: -118.5410,
    type: 'Apartment',
    description:
      'Large two-bedroom apartment just minutes from CSUN. Updated kitchen, pool access, and gated parking.',
    amenities: ['Pool', 'Parking', 'Gated', 'Dishwasher'],
    owner: { name: 'Michael Chen', verified: true },
    distanceFromCSUN: '0.8 mi',
    available: 'Apr 1, 2026',
    imageColor: '#50B86C',
  },
  {
    id: 3,
    title: 'Cozy 1BR with Parking',
    price: 1550,
    address: '9400 Zelzah Ave, Northridge, CA 91325',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 580,
    lat: 34.2445,
    lng: -118.5215,
    type: 'Apartment',
    description:
      'Well-maintained one-bedroom close to CSUN campus. Quiet street, recently painted, and pet-friendly.',
    amenities: ['Parking', 'Pet Friendly', 'A/C'],
    owner: { name: 'Lisa Park', verified: false },
    distanceFromCSUN: '0.4 mi',
    available: 'Mar 15, 2026',
    imageColor: '#E8825B',
  },
  {
    id: 4,
    title: 'Renovated Guest House',
    price: 1200,
    address: '17830 Lassen St, Northridge, CA 91325',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 450,
    lat: 34.2485,
    lng: -118.5330,
    type: 'Guest House',
    description:
      'Private guest house with separate entrance. Newly renovated with modern finishes. Utilities included.',
    amenities: ['Utilities Included', 'Private Entrance', 'WiFi'],
    owner: { name: 'David Martinez', verified: true },
    distanceFromCSUN: '0.7 mi',
    available: 'Feb 15, 2026',
    imageColor: '#9B59B6',
  },

  // ── Reseda ────────────────────────────────────────
  {
    id: 5,
    title: 'Bright 2BR Townhouse',
    price: 2300,
    address: '7250 Reseda Blvd, Reseda, CA 91335',
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1050,
    lat: 34.2010,
    lng: -118.5360,
    type: 'Townhouse',
    description:
      'Two-story townhouse with attached garage. Open floor plan, large patio, and washer/dryer hookups.',
    amenities: ['Garage', 'Patio', 'W/D Hookups'],
    owner: { name: 'Karen Williams', verified: true },
    distanceFromCSUN: '2.8 mi',
    available: 'May 1, 2026',
    imageColor: '#2ECC71',
  },
  {
    id: 6,
    title: 'Charming 1BR Apartment',
    price: 1475,
    address: '18120 Sherman Way, Reseda, CA 91335',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 620,
    lat: 34.2050,
    lng: -118.5420,
    type: 'Apartment',
    description:
      'Cozy one-bedroom on a tree-lined street. Features hardwood floors, updated bathroom, and close to shops.',
    amenities: ['Hardwood Floors', 'Parking', 'Laundry'],
    owner: { name: 'James Wilson', verified: false },
    distanceFromCSUN: '2.5 mi',
    available: 'Apr 15, 2026',
    imageColor: '#3498DB',
  },

  // ── Encino ────────────────────────────────────────
  {
    id: 7,
    title: 'Luxury 3BR Condo',
    price: 3500,
    address: '16500 Ventura Blvd, Encino, CA 91436',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1400,
    lat: 34.1590,
    lng: -118.5010,
    type: 'Condo',
    description:
      'Premium condo with mountain views. Granite counters, stainless appliances, community pool and gym.',
    amenities: ['Pool', 'Gym', 'Doorman', 'A/C', 'Balcony'],
    owner: { name: 'Rachel Green', verified: true },
    distanceFromCSUN: '5.8 mi',
    available: 'Jun 1, 2026',
    imageColor: '#E74C3C',
  },

  // ── Tarzana ───────────────────────────────────────
  {
    id: 8,
    title: 'Updated 2BR Flat',
    price: 2450,
    address: '18700 Ventura Blvd, Tarzana, CA 91356',
    bedrooms: 2,
    bathrooms: 1,
    sqft: 850,
    lat: 34.1720,
    lng: -118.5500,
    type: 'Apartment',
    description:
      'Recently updated two-bedroom with quartz countertops, new flooring, and central air. Near Tarzana park.',
    amenities: ['A/C', 'Parking', 'Laundry', 'Storage'],
    owner: { name: 'Tom Anderson', verified: true },
    distanceFromCSUN: '4.6 mi',
    available: 'Mar 1, 2026',
    imageColor: '#F39C12',
  },

  // ── Van Nuys ──────────────────────────────────────
  {
    id: 9,
    title: 'Private Room in Shared Home',
    price: 950,
    address: '14455 Victory Blvd, Van Nuys, CA 91401',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 300,
    lat: 34.1860,
    lng: -118.4490,
    type: 'Room',
    description:
      'Furnished private room in a 3BR house. Shared kitchen and living area. All utilities included. No pets.',
    amenities: ['Furnished', 'Utilities Included', 'WiFi'],
    owner: { name: 'Amy Rodriguez', verified: false },
    distanceFromCSUN: '5.1 mi',
    available: 'Feb 20, 2026',
    imageColor: '#1ABC9C',
  },
  {
    id: 10,
    title: 'Modern 1BR Loft',
    price: 1600,
    address: '6710 Hazeltine Ave, Van Nuys, CA 91405',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 650,
    lat: 34.1920,
    lng: -118.4650,
    type: 'Loft',
    description:
      'Industrial-style loft with high ceilings, exposed brick, and lots of natural light. Walking distance to metro.',
    amenities: ['High Ceilings', 'Metro Nearby', 'Parking'],
    owner: { name: 'Chris Taylor', verified: true },
    distanceFromCSUN: '4.5 mi',
    available: 'Mar 1, 2026',
    imageColor: '#8E44AD',
  },

  // ── Sherman Oaks ──────────────────────────────────
  {
    id: 11,
    title: 'Stylish 2BR Apartment',
    price: 2800,
    address: '14900 Magnolia Blvd, Sherman Oaks, CA 91403',
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1100,
    lat: 34.1510,
    lng: -118.4490,
    type: 'Apartment',
    description:
      'Designer finishes throughout. Open kitchen, in-unit washer/dryer, and rooftop deck with valley views.',
    amenities: ['W/D In-Unit', 'Rooftop', 'A/C', 'Parking'],
    owner: { name: 'Nicole Adams', verified: true },
    distanceFromCSUN: '6.5 mi',
    available: 'Apr 1, 2026',
    imageColor: '#D35400',
  },

  // ── Canoga Park ───────────────────────────────────
  {
    id: 12,
    title: 'Large 3BR House',
    price: 3200,
    address: '21300 Saticoy St, Canoga Park, CA 91304',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    lat: 34.2010,
    lng: -118.5980,
    type: 'House',
    description:
      'Single-family home with large backyard. Hardwood floors, 2-car garage, and updated bathrooms. Pet OK.',
    amenities: ['Garage', 'Backyard', 'Pet Friendly', 'W/D Hookups'],
    owner: { name: 'Robert Kim', verified: true },
    distanceFromCSUN: '4.2 mi',
    available: 'May 1, 2026',
    imageColor: '#27AE60',
  },

  // ── Granada Hills ─────────────────────────────────
  {
    id: 13,
    title: 'Quiet 1BR Near Parks',
    price: 1400,
    address: '16950 Chatsworth St, Granada Hills, CA 91344',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 550,
    lat: 34.2740,
    lng: -118.5010,
    type: 'Apartment',
    description:
      'Peaceful one-bedroom in residential area near parks and trails. Great natural light and ample closet space.',
    amenities: ['Parking', 'A/C', 'Storage'],
    owner: { name: 'Patricia Nguyen', verified: false },
    distanceFromCSUN: '2.8 mi',
    available: 'Mar 1, 2026',
    imageColor: '#2980B9',
  },

  // ── Woodland Hills ────────────────────────────────
  {
    id: 14,
    title: 'Family-Friendly 3BR',
    price: 3100,
    address: '22100 Ventura Blvd, Woodland Hills, CA 91364',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1600,
    lat: 34.1680,
    lng: -118.6050,
    type: 'House',
    description:
      'Spacious home near top-rated schools. Open layout, remodeled kitchen, and large fenced yard. Must see.',
    amenities: ['Backyard', 'Garage', 'A/C', 'Dishwasher'],
    owner: { name: 'Steven Brown', verified: true },
    distanceFromCSUN: '5.9 mi',
    available: 'Jun 1, 2026',
    imageColor: '#C0392B',
  },

  // ── Panorama City ─────────────────────────────────
  {
    id: 15,
    title: 'Affordable Studio',
    price: 1100,
    address: '8700 Van Nuys Blvd, Panorama City, CA 91402',
    bedrooms: 0,
    bathrooms: 1,
    sqft: 380,
    lat: 34.2260,
    lng: -118.4500,
    type: 'Studio',
    description:
      'Budget-friendly studio near shops and transit. Includes fridge, stove, and one parking space. Water paid.',
    amenities: ['Parking', 'Water Included', 'Metro Nearby'],
    owner: { name: 'Maria Gonzalez', verified: true },
    distanceFromCSUN: '4.8 mi',
    available: 'Feb 28, 2026',
    imageColor: '#16A085',
  },
];
