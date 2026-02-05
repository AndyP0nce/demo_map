/**
 * map.js
 * ---------------------------------------------------
 * Handles all Google Maps interactions:
 *   - Map initialization (centered on CSUN by default)
 *   - Custom overlay markers (price tags + university pills)
 *   - InfoWindows: Zillow-style detail popup on marker hover
 *   - Tracks which listings are visible in the current viewport
 *   - Exposes callbacks so app.js can sync the sidebar cards
 *
 * Key classes:
 *   MapManager              – public API, used by app.js
 *   MarkerOverlay           – shared base for all custom overlays
 *   PriceMarkerOverlay      – Zillow-style price tag pill
 *   UniversityMarkerOverlay – campus pill with graduation-cap icon
 * ---------------------------------------------------
 */

// ─── MarkerOverlay (base class) ──────────────────────
// Shared logic for all custom OverlayView markers:
//   draw(), onRemove(), setActive(), and mouse event wiring.
// Subclasses implement _createDiv() and _getActiveClass().

class MarkerOverlay extends google.maps.OverlayView {
  constructor(position) {
    super();
    this.position = position;
    this.div = null;
    this.onMouseOver = null;
    this.onMouseOut = null;
    this.onClick = null;
    // Subclasses call this.setMap(map) after setting their own properties
  }

  onAdd() {
    this.div = this._createDiv();
    this.div.addEventListener('mouseover', () => { if (this.onMouseOver) this.onMouseOver(); });
    this.div.addEventListener('mouseout', () => { if (this.onMouseOut) this.onMouseOut(); });
    this.div.addEventListener('click', () => { if (this.onClick) this.onClick(); });
    this.getPanes().overlayMouseTarget.appendChild(this.div);
  }

  draw() {
    const pos = this.getProjection().fromLatLngToDivPixel(this.position);
    if (this.div) {
      this.div.style.left = pos.x + 'px';
      this.div.style.top = pos.y + 'px';
    }
  }

  onRemove() {
    if (this.div && this.div.parentNode) {
      this.div.parentNode.removeChild(this.div);
      this.div = null;
    }
  }

  setActive(active) {
    if (this.div) this.div.classList.toggle(this._getActiveClass(), active);
  }

  /** @abstract – subclass returns the DOM element to render */
  _createDiv() { throw new Error('Subclass must implement _createDiv'); }

  /** @abstract – subclass returns the CSS class toggled by setActive() */
  _getActiveClass() { return 'marker--active'; }
}

// ─── PriceMarkerOverlay ──────────────────────────────
// Renders a small price-tag div on the map (like Zillow's $X,XXX pills).

class PriceMarkerOverlay extends MarkerOverlay {
  constructor(position, price, id, map) {
    super(position);
    this.price = price;
    this.id = id;
    this.setMap(map);
  }

  _createDiv() {
    const div = document.createElement('div');
    div.className = 'price-marker';
    div.dataset.listingId = this.id;
    div.textContent = `$${this.price.toLocaleString()}`;
    return div;
  }

  _getActiveClass() { return 'price-marker--active'; }
}

// ─── UniversityMarkerOverlay ─────────────────────────
// Renders a named pill on the map for the university.

class UniversityMarkerOverlay extends MarkerOverlay {
  constructor(position, name, fullName, map) {
    super(position);
    this.name = name;
    this.fullName = fullName;
    this.onDblClick = null;
    this.setMap(map);
  }

  onAdd() {
    super.onAdd();
    this.div.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (this.onDblClick) this.onDblClick();
    });
  }

  _createDiv() {
    const div = document.createElement('div');
    div.className = 'uni-marker';
    div.innerHTML = `
      <svg class="uni-marker__icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9l-11-6z"/>
      </svg>
      <span class="uni-marker__name">${this.name}</span>`;
    return div;
  }

  _getActiveClass() { return 'uni-marker--active'; }
}

// ─── MapManager (public API) ─────────────────────────

export class MapManager {
  constructor() {
    this.map = null;
    this.priceMarkers = []; // { overlay, infoWindow, listing }
    this.activeInfoWindow = null;
    this.activeMarkerId = null;
    this._searchHighlight = null; // google.maps.Rectangle for search area
    this._searchPin = null;       // google.maps.Marker for address search
    this._uniMarkers = [];        // { overlay, infoWindow, isOpen, position }

    // Callbacks set by app.js
    this._onBoundsChange = null;
    this._onMarkerHover = null;
    this._onMarkerClick = null;
    this._onUniDblClick = null;
  }

  /**
   * Create the Google Map inside a container element.
   * @param {string} containerId  – id of the <div> to hold the map
   * @param {object} center       – { lat, lng }
   * @param {number} zoom         – initial zoom level
   */
  init(containerId, center, zoom) {
    this.map = new google.maps.Map(document.getElementById(containerId), {
      center: center,
      zoom: zoom,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_TOP,
      },
      // Subtle style tweaks – hide POI labels and transit to reduce clutter
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    // When the map stops moving (pan / zoom), tell the app which listings are visible
    this.map.addListener('idle', () => {
      if (this._onBoundsChange) {
        this._onBoundsChange(this.getVisibleListings());
      }
    });
  }

  // ── University marker ──────────────────────────────

  /**
   * Drop a distinctive marker for a university.
   * Supports multiple universities – each gets its own pill marker
   * with hover preview and click-to-pin behavior.
   * @param {object} university – { name, fullName, lat, lng }
   */
  addUniversityMarker(university) {
    const pos = new google.maps.LatLng(university.lat, university.lng);
    const overlay = new UniversityMarkerOverlay(pos, university.name, university.fullName, this.map);

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding:10px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <strong style="font-size:14px;color:#2a2a2a;">${university.fullName}</strong><br>
          <span style="color:#666;font-size:12px;">${university.name} — Main Campus</span>
        </div>`,
      pixelOffset: new google.maps.Size(0, -44),
      disableAutoPan: true,
    });

    const entry = { overlay, infoWindow, isOpen: false, position: pos };
    this._uniMarkers.push(entry);

    // Hover → show info preview
    overlay.onMouseOver = () => {
      if (!entry.isOpen) {
        overlay.setActive(true);
        infoWindow.setPosition(pos);
        infoWindow.open(this.map);
      }
    };
    overlay.onMouseOut = () => {
      if (!entry.isOpen) {
        overlay.setActive(false);
        infoWindow.close();
      }
    };

    // Click → toggle pinned open / closed
    overlay.onClick = () => {
      this.hideInfoWindow(); // close any listing popup

      if (entry.isOpen) {
        // Close it
        infoWindow.close();
        overlay.setActive(false);
        entry.isOpen = false;
      } else {
        // Close any other open university popup first
        this._closeAllUniPopups();
        // Pin this one open
        infoWindow.setPosition(pos);
        infoWindow.open(this.map);
        overlay.setActive(true);
        entry.isOpen = true;
      }
    };

    // Double-click → set as target university
    overlay.onDblClick = () => {
      if (this._onUniDblClick) this._onUniDblClick(university);
    };
  }

  /** Close all pinned-open university popups. */
  _closeAllUniPopups() {
    this._uniMarkers.forEach((entry) => {
      if (entry.isOpen) {
        entry.infoWindow.close();
        entry.overlay.setActive(false);
        entry.isOpen = false;
      }
    });
  }

  // ── Listing markers ────────────────────────────────

  /**
   * Create a PriceMarkerOverlay + InfoWindow for every listing.
   * @param {Array} listings
   */
  addListingMarkers(listings) {
    listings.forEach((listing) => {
      // Price-tag overlay
      const overlay = new PriceMarkerOverlay(
        new google.maps.LatLng(listing.lat, listing.lng),
        listing.price,
        listing.id,
        this.map,
      );

      // Zillow-style detail popup
      const infoWindow = new google.maps.InfoWindow({
        content: this._buildInfoWindowHTML(listing),
        pixelOffset: new google.maps.Size(0, -40),
        disableAutoPan: true,
      });

      // Wire overlay mouse events
      overlay.onMouseOver = () => {
        this.showInfoWindow(listing.id);
        if (this._onMarkerHover) this._onMarkerHover(listing.id, true);
      };
      overlay.onMouseOut = () => {
        this.hideInfoWindow();
        if (this._onMarkerHover) this._onMarkerHover(listing.id, false);
      };
      overlay.onClick = () => {
        if (this._onMarkerClick) this._onMarkerClick(listing.id);
      };

      this.priceMarkers.push({ overlay, infoWindow, listing });
    });
  }

  // ── Info-window helpers ────────────────────────────

  /**
   * Build the HTML that goes inside a Google Maps InfoWindow.
   * Mirrors Zillow: image area → price → bed/bath/sqft → address → owner.
   */
  _buildInfoWindowHTML(listing) {
    const bedLabel = listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bd`;
    return `
      <div class="info-window">
        <div class="info-window__img" style="background:${listing.imageColor};">
          <span class="info-window__type">${listing.type}</span>
        </div>
        <div class="info-window__body">
          <div class="info-window__price">$${listing.price.toLocaleString()}/mo</div>
          <div class="info-window__specs">${bedLabel} | ${listing.bathrooms} ba | ${listing.sqft.toLocaleString()} sqft</div>
          <div class="info-window__address">${listing.address}</div>
          <div class="info-window__owner">
            Posted by ${listing.owner.name}${listing.owner.verified ? ' &#10003;' : ''}
          </div>
        </div>
      </div>`;
  }

  /** Open the InfoWindow for a listing and highlight its price marker. */
  showInfoWindow(listingId) {
    this.hideInfoWindow(); // close any existing one first

    // Also close any open university popup
    this._closeAllUniPopups();

    const entry = this.priceMarkers.find((m) => m.listing.id === listingId);
    if (!entry) return;

    entry.infoWindow.setPosition({ lat: entry.listing.lat, lng: entry.listing.lng });
    entry.infoWindow.open(this.map);
    entry.overlay.setActive(true);

    this.activeInfoWindow = entry.infoWindow;
    this.activeMarkerId = listingId;
  }

  /** Close the active InfoWindow and un-highlight the marker. */
  hideInfoWindow() {
    if (this.activeInfoWindow) {
      this.activeInfoWindow.close();

      const old = this.priceMarkers.find((m) => m.listing.id === this.activeMarkerId);
      if (old) old.overlay.setActive(false);

      this.activeInfoWindow = null;
      this.activeMarkerId = null;
    }
  }

  // ── Marker highlight (called from card hover) ──────

  highlightMarker(listingId) {
    this.showInfoWindow(listingId);
  }

  unhighlightMarker() {
    this.hideInfoWindow();
  }

  // ── Search-driven map pan & highlight ───────────────

  /**
   * Pan and zoom the map to fit a set of listings.
   * Adds padding so markers aren't flush against the edge.
   * @param {Array} listings
   */
  fitBoundsToListings(listings) {
    if (!listings.length) return;

    const bounds = new google.maps.LatLngBounds();
    listings.forEach((l) => bounds.extend({ lat: l.lat, lng: l.lng }));

    // For a single listing, just pan + zoom rather than fitBounds (which over-zooms)
    if (listings.length === 1) {
      this.map.panTo(bounds.getCenter());
      if (this.map.getZoom() < 14) this.map.setZoom(14);
    } else {
      this.map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }

  /**
   * Draw a translucent blue rectangle around the bounding box of the given listings.
   * If a previous highlight exists it is removed first.
   * @param {Array} listings
   */
  showSearchHighlight(listings) {
    this.clearSearchHighlight();
    if (!listings.length) return;

    const lats = listings.map((l) => l.lat);
    const lngs = listings.map((l) => l.lng);
    const PAD = 0.004; // ~400 m of padding around the edges

    this._searchHighlight = this._createHighlightRect({
      north: Math.max(...lats) + PAD,
      south: Math.min(...lats) - PAD,
      east: Math.max(...lngs) + PAD,
      west: Math.min(...lngs) - PAD,
    });
  }

  /** Remove the search highlight rectangle from the map. */
  clearSearchHighlight() {
    if (this._searchHighlight) {
      this._searchHighlight.setMap(null);
      this._searchHighlight = null;
    }
  }

  /**
   * Drop a temporary red pin marker at a specific location.
   * Used when the user selects an address from the search autocomplete.
   * @param {number} lat
   * @param {number} lng
   * @param {string} title – tooltip label
   */
  showSearchPin(lat, lng, title) {
    this.clearSearchPin();
    this._searchPin = new google.maps.Marker({
      position: { lat, lng },
      map: this.map,
      title: title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#e53935',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2.5,
      },
      zIndex: 999,
      animation: google.maps.Animation.DROP,
    });
  }

  /** Remove the temporary search pin from the map. */
  clearSearchPin() {
    if (this._searchPin) {
      this._searchPin.setMap(null);
      this._searchPin = null;
    }
  }

  // ── Marker visibility (filter integration) ─────────

  /**
   * Show or hide price markers based on which listing IDs pass the filters.
   * Filtered-out markers become semi-transparent; passing markers stay normal.
   * @param {Set<number>} passingIds – set of listing ids that pass all filters
   */
  updateMarkerVisibility(passingIds) {
    this.priceMarkers.forEach(({ overlay, listing }) => {
      if (overlay.div) {
        const passes = passingIds.has(listing.id);
        overlay.div.classList.toggle('price-marker--filtered', !passes);
      }
    });
  }

  // ── Viewport helpers ───────────────────────────────

  /** Return only listings whose coordinates are inside the current map bounds. */
  getVisibleListings() {
    const bounds = this.map.getBounds();
    if (!bounds) return [];

    return this.priceMarkers
      .filter(({ listing }) => bounds.contains(new google.maps.LatLng(listing.lat, listing.lng)))
      .map(({ listing }) => listing);
  }

  // ── Target university ──────────────────────────────

  /**
   * Pan the map to a location.
   * @param {number} lat
   * @param {number} lng
   * @param {number} [zoom] – set zoom only if current zoom is lower
   */
  panTo(lat, lng, zoom) {
    this.map.panTo({ lat, lng });
    if (zoom && this.map.getZoom() < zoom) this.map.setZoom(zoom);
  }

  /**
   * Visually highlight the target university marker with a distinct border.
   * @param {string} name – university short name (e.g. "UCLA")
   */
  setTargetUniversity(name) {
    this._uniMarkers.forEach((entry) => {
      if (entry.overlay.div) {
        entry.overlay.div.classList.toggle('uni-marker--target', entry.overlay.name === name);
      }
    });
  }

  // ── Geocoding (unrestricted location search) ──────

  /** @returns {google.maps.Geocoder} */
  _getGeocoder() {
    if (!this._geocoder) this._geocoder = new google.maps.Geocoder();
    return this._geocoder;
  }

  /**
   * Geocode a place by its Google Place ID, pan the map, and draw the
   * blue highlight rectangle around the result area.
   * @param {string} placeId
   * @returns {Promise<boolean>} true if a result was found
   */
  async geocodePlaceAndHighlight(placeId) {
    return this._geocodeAndHighlight({ placeId });
  }

  /**
   * Geocode a free-text query, pan the map, and draw the
   * blue highlight rectangle around the result area.
   * @param {string} query
   * @returns {Promise<boolean>} true if a result was found
   */
  async geocodeQueryAndHighlight(query) {
    return this._geocodeAndHighlight({ address: query });
  }

  /**
   * Shared geocode + highlight logic.
   * @param {object} request – geocode request ({ placeId } or { address })
   * @returns {Promise<boolean>} true if a result was found
   */
  async _geocodeAndHighlight(request) {
    try {
      const { results } = await this._getGeocoder().geocode(request);
      if (results && results[0]) {
        this._showGeocodedResult(results[0]);
        return true;
      }
    } catch (_) { /* ZERO_RESULTS or error */ }
    return false;
  }

  /**
   * Given a geocoder result, pan + zoom the map and draw the highlight box.
   * @param {google.maps.GeocoderResult} result
   */
  _showGeocodedResult(result) {
    this.clearSearchHighlight();
    this.clearSearchPin();

    const bounds = result.geometry.viewport || result.geometry.bounds;
    if (bounds) {
      this.map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      this._searchHighlight = this._createHighlightRect({
        north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng(),
      });
    } else {
      // Point result – just pan and drop a pin
      const loc = result.geometry.location;
      this.map.panTo(loc);
      if (this.map.getZoom() < 14) this.map.setZoom(14);
      this.showSearchPin(loc.lat(), loc.lng(), result.formatted_address || '');
    }
  }

  /**
   * Create a translucent blue highlight rectangle on the map.
   * @param {object} bounds – { north, south, east, west }
   * @returns {google.maps.Rectangle}
   */
  _createHighlightRect(bounds) {
    return new google.maps.Rectangle({
      bounds,
      map: this.map,
      fillColor: '#006aff',
      fillOpacity: 0.08,
      strokeColor: '#006aff',
      strokeOpacity: 0.50,
      strokeWeight: 2,
      clickable: false,
      zIndex: 0,
    });
  }

  // ── Event registration (called by app.js) ──────────

  onBoundsChange(cb) {
    this._onBoundsChange = cb;
  }
  onMarkerHover(cb) {
    this._onMarkerHover = cb;
  }
  onMarkerClick(cb) {
    this._onMarkerClick = cb;
  }
  onUniversityDblClick(cb) {
    this._onUniDblClick = cb;
  }
}
