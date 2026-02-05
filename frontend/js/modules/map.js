/**
 * map.js
 * ---------------------------------------------------
 * Handles all Google Maps interactions:
 *   - Map initialization (centered on CSUN by default)
 *   - PriceMarkerOverlay: custom overlay that renders a Zillow-style
 *     price tag on the map for each listing
 *   - InfoWindows: Zillow-style detail popup on marker hover
 *   - Tracks which listings are visible in the current viewport
 *   - Exposes callbacks so app.js can sync the sidebar cards
 *
 * Key classes:
 *   MapManager          – public API, used by app.js
 *   PriceMarkerOverlay  – internal, extends google.maps.OverlayView
 * ---------------------------------------------------
 */

// ─── PriceMarkerOverlay ──────────────────────────────
// Renders a small price-tag div on the map (like Zillow's $X,XXX pills).
// Extends google.maps.OverlayView so it moves/scales with the map.

class PriceMarkerOverlay extends google.maps.OverlayView {
  /**
   * @param {google.maps.LatLng} position
   * @param {number} price      – monthly rent
   * @param {number} id         – listing id
   * @param {google.maps.Map} map
   */
  constructor(position, price, id, map) {
    super();
    this.position = position;
    this.price = price;
    this.id = id;
    this.div = null;

    // Callbacks – set by MapManager after construction
    this.onMouseOver = null;
    this.onMouseOut = null;
    this.onClick = null;

    // Attach to map (triggers onAdd → draw)
    this.setMap(map);
  }

  /** Called once when the overlay is added to the map. Creates the DOM. */
  onAdd() {
    this.div = document.createElement('div');
    this.div.className = 'price-marker';
    this.div.dataset.listingId = this.id;
    this.div.textContent = `$${this.price.toLocaleString()}`;

    // Forward DOM events to callbacks
    this.div.addEventListener('mouseover', () => {
      if (this.onMouseOver) this.onMouseOver();
    });
    this.div.addEventListener('mouseout', () => {
      if (this.onMouseOut) this.onMouseOut();
    });
    this.div.addEventListener('click', () => {
      if (this.onClick) this.onClick();
    });

    // overlayMouseTarget pane receives mouse events (above the map tiles)
    const panes = this.getPanes();
    panes.overlayMouseTarget.appendChild(this.div);
  }

  /** Called every frame the map redraws. Positions the div. */
  draw() {
    const projection = this.getProjection();
    const pos = projection.fromLatLngToDivPixel(this.position);
    if (this.div) {
      this.div.style.left = pos.x + 'px';
      this.div.style.top = pos.y + 'px';
    }
  }

  /** Cleanup when overlay is removed from the map. */
  onRemove() {
    if (this.div && this.div.parentNode) {
      this.div.parentNode.removeChild(this.div);
      this.div = null;
    }
  }

  /** Toggle the --active visual state (highlighted price tag). */
  setActive(active) {
    if (this.div) {
      this.div.classList.toggle('price-marker--active', active);
    }
  }
}

// ─── UniversityMarkerOverlay ─────────────────────────
// Renders a named pill on the map for the university.
// Same OverlayView approach as PriceMarkerOverlay but
// with distinct styling and a graduation-cap icon.

class UniversityMarkerOverlay extends google.maps.OverlayView {
  constructor(position, name, fullName, map) {
    super();
    this.position = position;
    this.name = name;
    this.fullName = fullName;
    this.div = null;
    this.onMouseOver = null;
    this.onMouseOut = null;
    this.onClick = null;
    this.setMap(map);
  }

  onAdd() {
    this.div = document.createElement('div');
    this.div.className = 'uni-marker';
    this.div.innerHTML = `
      <svg class="uni-marker__icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9l-11-6z"/>
      </svg>
      <span class="uni-marker__name">${this.name}</span>`;

    this.div.addEventListener('mouseover', () => { if (this.onMouseOver) this.onMouseOver(); });
    this.div.addEventListener('mouseout', () => { if (this.onMouseOut) this.onMouseOut(); });
    this.div.addEventListener('click', () => { if (this.onClick) this.onClick(); });

    const panes = this.getPanes();
    panes.overlayMouseTarget.appendChild(this.div);
  }

  draw() {
    const projection = this.getProjection();
    const pos = projection.fromLatLngToDivPixel(this.position);
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
    if (this.div) {
      this.div.classList.toggle('uni-marker--active', active);
    }
  }
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
    this._csunInfoWindow = null;  // keep reference so we can close it

    // Callbacks set by app.js
    this._onBoundsChange = null;
    this._onMarkerHover = null;
    this._onMarkerClick = null;
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
   * Drop a distinctive marker for the university itself.
   * @param {object} university – { name, fullName, lat, lng }
   */
  addUniversityMarker(university) {
    const pos = new google.maps.LatLng(university.lat, university.lng);
    const overlay = new UniversityMarkerOverlay(pos, university.name, university.fullName, this.map);

    this._csunOverlay = overlay;
    this._csunInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding:10px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <strong style="font-size:14px;color:#2a2a2a;">${university.fullName}</strong><br>
          <span style="color:#666;font-size:12px;">${university.name} — Main Campus</span>
        </div>`,
      pixelOffset: new google.maps.Size(0, -44),
      disableAutoPan: true,
    });
    this._csunInfoOpen = false;

    // Hover → show info preview
    overlay.onMouseOver = () => {
      if (!this._csunInfoOpen) {
        overlay.setActive(true);
        this._csunInfoWindow.setPosition(pos);
        this._csunInfoWindow.open(this.map);
      }
    };
    overlay.onMouseOut = () => {
      if (!this._csunInfoOpen) {
        overlay.setActive(false);
        this._csunInfoWindow.close();
      }
    };

    // Click → toggle pinned open / closed
    overlay.onClick = () => {
      this.hideInfoWindow(); // close any listing popup

      if (this._csunInfoOpen) {
        // Close it
        this._csunInfoWindow.close();
        overlay.setActive(false);
        this._csunInfoOpen = false;
      } else {
        // Pin it open
        this._csunInfoWindow.setPosition(pos);
        this._csunInfoWindow.open(this.map);
        overlay.setActive(true);
        this._csunInfoOpen = true;
      }
    };
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

    // Also close CSUN popup if open
    if (this._csunInfoOpen) {
      this._csunInfoWindow.close();
      this._csunOverlay.setActive(false);
      this._csunInfoOpen = false;
    }

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

    // Build the bounding box
    const lats = listings.map((l) => l.lat);
    const lngs = listings.map((l) => l.lng);
    const PAD = 0.004; // ~400 m of padding around the edges

    this._searchHighlight = new google.maps.Rectangle({
      bounds: {
        north: Math.max(...lats) + PAD,
        south: Math.min(...lats) - PAD,
        east: Math.max(...lngs) + PAD,
        west: Math.min(...lngs) - PAD,
      },
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
}
