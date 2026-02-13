/**
 * app.js
 * ---------------------------------------------------
 * Entry point – ties the map, card, filter, and modal modules together.
 *
 * Data flow:
 *   1. Fetch listings and universities from the API
 *   2. Map initializes centered on target university (default CSUN)
 *   3. Price markers are placed for every listing
 *   4. Filters render above the card list
 *   5. On map idle (pan / zoom stops) → visible + filtered listings → sidebar cards
 *   6. On filter change → visible + filtered listings → sidebar cards + marker visibility
 *   7. Hover card  → highlight marker + open info window
 *   8. Hover marker → highlight card + scroll into view
 *   9. Click marker or card → open full-detail modal
 *  10. Search address → drop temp pin on map
 *  11. Target university change → recalculate distances, pan map
 *
 * This file does NOT contain rendering logic – that lives in
 * map.js, cards.js, filters.js, and modal.js.
 * ---------------------------------------------------
 */

import { MapManager } from './modules/map.js';
import { CardRenderer } from './modules/cards.js';
import { FilterManager } from './modules/filters.js';
import { ListingModal } from './modules/modal.js';

// ── API Configuration ─────────────────────────────────
const API_BASE = 'http://localhost:8001/api';

// ── Data (loaded from API) ────────────────────────────
let LISTINGS = [];
let UNIVERSITIES = [];

// ── Config ───────────────────────────────────────────
const DEFAULT_CENTER = { lat: 34.2381, lng: -118.5285 }; // CSUN as fallback
const MAP_ZOOM = 13;

// ── Distance calculation (Haversine) ─────────────────

/**
 * Compute the great-circle distance in miles between two lat/lng points.
 */
function haversineDistanceMi(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Recompute distances for every listing relative to a target university.
 * Attaches `_distanceMi` (number) and `_targetName` (string) to each listing.
 */
function recomputeDistances(targetUni) {
  LISTINGS.forEach((listing) => {
    listing._distanceMi = haversineDistanceMi(
      listing.lat,
      listing.lng,
      targetUni.lat,
      targetUni.lng,
    );
    listing._targetName = targetUni.name;
  });
}

// ── API Fetch Functions ───────────────────────────────

/**
 * Fetch all listings from the backend API.
 */
async function fetchListings() {
  try {
    const response = await fetch(`${API_BASE}/listings/`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // Convert string lat/lng to numbers (API returns strings for decimals)
    return data.map((listing) => ({
      ...listing,
      lat: parseFloat(listing.lat),
      lng: parseFloat(listing.lng),
      price: parseFloat(listing.price),
      sqft: listing.sqft ? parseInt(listing.sqft, 10) : null,
    }));
  } catch (error) {
    console.error('Failed to fetch listings:', error);
    return [];
  }
}

/**
 * Fetch all universities from the backend API.
 */
async function fetchUniversities() {
  try {
    const response = await fetch(`${API_BASE}/universities/`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // Convert string lat/lng to numbers
    return data.map((uni) => ({
      ...uni,
      lat: parseFloat(uni.lat),
      lng: parseFloat(uni.lng),
    }));
  } catch (error) {
    console.error('Failed to fetch universities:', error);
    return [];
  }
}

// ── App ──────────────────────────────────────────────
let mapManager;
let cardRenderer;
let filterManager;
let modal;

async function init() {
  // 0. Fetch data from API
  console.log('Fetching data from API...');
  [LISTINGS, UNIVERSITIES] = await Promise.all([
    fetchListings(),
    fetchUniversities(),
  ]);
  console.log(`Loaded ${LISTINGS.length} listings and ${UNIVERSITIES.length} universities`);

  // 1. Initialize modules with fetched data
  mapManager = new MapManager();
  cardRenderer = new CardRenderer('listings-container', 'listings-count');
  filterManager = new FilterManager('filter-container', LISTINGS, UNIVERSITIES);
  modal = new ListingModal('detail-modal');

  // 2. Compute initial distances from default target (CSUN)
  const defaultTarget = filterManager.getTargetUniversity();
  if (defaultTarget) recomputeDistances(defaultTarget);

  // 3. Determine map center
  const mapCenter = defaultTarget
    ? { lat: defaultTarget.lat, lng: defaultTarget.lng }
    : DEFAULT_CENTER;

  // 4. Create the map
  mapManager.init('map-container', mapCenter, MAP_ZOOM);

  // 5. Add pill markers for all California universities
  UNIVERSITIES.forEach((uni) => mapManager.addUniversityMarker(uni));

  // 6. Highlight the default target university marker
  if (defaultTarget) mapManager.setTargetUniversity(defaultTarget.name);

  // 7. Add price-tag markers for every listing
  mapManager.addListingMarkers(LISTINGS);

  // 8. Connect events between map ↔ cards ↔ filters ↔ modal
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

/**
 * Open the detail modal for a listing by id.
 */
function openModal(listingId) {
  const listing = LISTINGS.find((l) => l.id === listingId);
  if (listing) {
    modal.open(listing);
  }
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

  // Target university changed → recalculate distances, pan map, refresh
  filterManager.onTargetChange((university) => {
    recomputeDistances(university);
    mapManager.setTargetUniversity(university.name);
    mapManager.panTo(university.lat, university.lng, 13);
    refreshView();
  });

  // Search query changed (debounced) → pan map + highlight + temp pin
  filterManager.onSearchChange(async (matchingListings) => {
    if (matchingListings.length > 0) {
      mapManager.fitBoundsToListings(matchingListings);
      mapManager.showSearchHighlight(matchingListings);

      // If exactly one listing matches (address-level search), drop a pin
      if (matchingListings.length === 1) {
        const l = matchingListings[0];
        mapManager.showSearchPin(l.lat, l.lng, l.address);
      } else {
        mapManager.clearSearchPin();
      }
    } else {
      const query = filterManager.state.searchQuery;
      if (query) {
        // Check university match first
        const uniMatch = UNIVERSITIES.find(
          (u) =>
            u.name.toLowerCase().includes(query) ||
            u.fullName.toLowerCase().includes(query),
        );
        if (uniMatch) {
          mapManager.clearSearchHighlight();
          mapManager.clearSearchPin();
          mapManager.panTo(uniMatch.lat, uniMatch.lng, 14);
          return;
        }
        // Fallback: geocode the free-text query (any city, zip, address)
        mapManager.clearSearchHighlight();
        mapManager.clearSearchPin();
        await mapManager.geocodeQueryAndHighlight(query);
      } else {
        mapManager.clearSearchHighlight();
        mapManager.clearSearchPin();
      }
    }
  });

  // Google Place selected from autocomplete → geocode by placeId and pan
  filterManager.onPlaceSelect(async (placeId) => {
    await mapManager.geocodePlaceAndHighlight(placeId);
  });

  // University marker double-clicked → set as target
  mapManager.onUniversityDblClick((university) => {
    filterManager.setTargetUniversity(university);
    recomputeDistances(university);
    mapManager.setTargetUniversity(university.name);
    refreshView();
  });

  // Marker hovered → highlight matching card
  mapManager.onMarkerHover((listingId, isHovering) => {
    if (isHovering) {
      cardRenderer.highlightCard(listingId);
    } else {
      cardRenderer.clearHighlight();
    }
  });

  // Marker clicked → open detail modal
  mapManager.onMarkerClick((listingId) => {
    openModal(listingId);
  });

  // Card hovered → highlight matching marker + open info window
  cardRenderer.onCardHover((listingId, isHovering) => {
    if (isHovering) {
      mapManager.highlightMarker(listingId);
    } else {
      mapManager.unhighlightMarker();
    }
  });

  // Card clicked → open detail modal
  cardRenderer.onCardClick((listingId) => {
    openModal(listingId);
  });
}

// ── Start ────────────────────────────────────────────

/**
 * Wait for Google Maps API to be loaded before initializing.
 */
function waitForGoogleMaps() {
  return new Promise((resolve) => {
    if (window.google && window.google.maps) {
      resolve();
    } else {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    }
  });
}

// Wait for Google Maps, then initialize the app
waitForGoogleMaps().then(() => init());
