/**
 * app.js
 * ---------------------------------------------------
 * Entry point – ties the map, card, and filter modules together.
 *
 * Data flow:
 *   1. Map initializes centered on CSUN
 *   2. Price markers are placed for every listing
 *   3. Filters render above the card list
 *   4. On map idle (pan / zoom stops) → visible + filtered listings → sidebar cards
 *   5. On filter change → visible + filtered listings → sidebar cards + marker visibility
 *   6. Hover card  → highlight marker + open info window
 *   7. Hover marker → highlight card + scroll into view
 *   8. Click card   → pan map to that listing
 *
 * This file does NOT contain rendering logic – that lives in
 * map.js, cards.js, and filters.js. This keeps each piece portable.
 * ---------------------------------------------------
 */

import { LISTINGS, CSUN } from './data/listings.js';
import { MapManager } from './modules/map.js';
import { CardRenderer } from './modules/cards.js';
import { FilterManager } from './modules/filters.js';

// ── Config ───────────────────────────────────────────
const MAP_CENTER = { lat: CSUN.lat, lng: CSUN.lng };
const MAP_ZOOM = 13;

// ── App ──────────────────────────────────────────────
const mapManager = new MapManager();
const cardRenderer = new CardRenderer('listings-container', 'listings-count');
const filterManager = new FilterManager('filter-container', LISTINGS);

function init() {
  // 1. Create the map
  mapManager.init('map-container', MAP_CENTER, MAP_ZOOM);

  // 2. Add a special marker for CSUN
  mapManager.addUniversityMarker(CSUN);

  // 3. Add price-tag markers for every listing
  mapManager.addListingMarkers(LISTINGS);

  // 4. Connect events between map ↔ cards ↔ filters
  wireEvents();
}

/**
 * Get the listings that are both visible on the map AND pass all filters.
 */
function getFilteredVisibleListings() {
  const visible = mapManager.getVisibleListings();
  return filterManager.applyFilters(visible);
}

/**
 * Refresh the sidebar cards and marker visibility.
 */
function refreshView() {
  const filtered = getFilteredVisibleListings();
  cardRenderer.render(filtered);

  // Show/hide price markers based on filter match
  const passingIds = filterManager.getPassingIds();
  mapManager.updateMarkerVisibility(passingIds);
}

function wireEvents() {
  // Map moved → refresh sidebar with only visible + filtered listings
  mapManager.onBoundsChange(() => {
    refreshView();
  });

  // Filter changed → re-filter and update sidebar + markers
  filterManager.onChange(() => {
    refreshView();
  });

  // Search query changed (debounced) → pan map to matching area + draw highlight
  filterManager.onSearchChange((matchingListings) => {
    if (matchingListings.length > 0) {
      mapManager.fitBoundsToListings(matchingListings);
      mapManager.showSearchHighlight(matchingListings);
    } else {
      mapManager.clearSearchHighlight();
    }
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
