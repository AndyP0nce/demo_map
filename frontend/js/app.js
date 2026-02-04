/**
 * app.js
 * ---------------------------------------------------
 * Entry point – ties the map and card modules together.
 *
 * Data flow:
 *   1. Map initializes centered on CSUN
 *   2. Price markers are placed for every listing
 *   3. On map idle (pan / zoom stops) → visible listings → sidebar cards
 *   4. Hover card  → highlight marker + open info window
 *   5. Hover marker → highlight card + scroll into view
 *   6. Click card   → pan map to that listing
 *
 * This file does NOT contain rendering logic – that lives in
 * map.js and cards.js. This keeps each piece portable.
 * ---------------------------------------------------
 */

import { LISTINGS, CSUN } from './data/listings.js';
import { MapManager } from './modules/map.js';
import { CardRenderer } from './modules/cards.js';

// ── Config ───────────────────────────────────────────
// Default map view: centered on CSUN, zoom 13 shows most of the Valley
const MAP_CENTER = { lat: CSUN.lat, lng: CSUN.lng };
const MAP_ZOOM = 13;

// ── App ──────────────────────────────────────────────
const mapManager = new MapManager();
const cardRenderer = new CardRenderer('listings-container', 'listings-count');

function init() {
  // 1. Create the map
  mapManager.init('map-container', MAP_CENTER, MAP_ZOOM);

  // 2. Add a special marker for CSUN
  mapManager.addUniversityMarker(CSUN);

  // 3. Add price-tag markers for every listing
  mapManager.addListingMarkers(LISTINGS);

  // 4. Connect events between map ↔ cards
  wireEvents();
}

function wireEvents() {
  // Map moved → refresh sidebar with only visible listings
  mapManager.onBoundsChange((visibleListings) => {
    cardRenderer.render(visibleListings);
  });

  // Marker hovered → highlight matching card
  mapManager.onMarkerHover((listingId, isHovering) => {
    if (isHovering) {
      cardRenderer.highlightCard(listingId);
    } else {
      cardRenderer.clearHighlight();
    }
  });

  // Card hovered → highlight matching marker + open info window
  cardRenderer.onCardHover((listingId, isHovering) => {
    if (isHovering) {
      mapManager.highlightMarker(listingId);
    } else {
      mapManager.unhighlightMarker();
    }
  });

  // Card clicked → pan the map to that listing
  cardRenderer.onCardClick((listingId) => {
    const listing = LISTINGS.find((l) => l.id === listingId);
    if (listing) {
      mapManager.map.panTo({ lat: listing.lat, lng: listing.lng });
      mapManager.showInfoWindow(listingId);
    }
  });
}

// ── Start ────────────────────────────────────────────
init();
