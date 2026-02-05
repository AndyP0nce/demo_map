/**
 * filters.js
 * ---------------------------------------------------
 * Renders a collapsible filter / search bar above the
 * listing cards in the sidebar panel.
 *
 * Features:
 *   - Search by city name or zip code
 *   - Property type checkboxes
 *   - Bedrooms & bathrooms min selectors
 *   - Price range (min / max)
 *   - Sqft range (min / max)
 *   - Amenity checkboxes
 *
 * Reads the LISTINGS data to dynamically populate
 * filter options (types, amenities, cities, zips).
 * ---------------------------------------------------
 */

export class FilterManager {
  /**
   * @param {string} containerId – id of the DOM element to render filters into
   * @param {Array}  listings    – full LISTINGS array to derive filter options
   */
  constructor(containerId, listings) {
    this.container = document.getElementById(containerId);
    this.listings = listings;
    this._onChange = null;

    // Derive unique values from listings
    this.allTypes = [...new Set(listings.map((l) => l.type))].sort();
    this.allAmenities = [...new Set(listings.flatMap((l) => l.amenities))].sort();
    this.allCities = [...new Set(listings.map((l) => this._parseCity(l.address)))].sort();
    this.allZips = [...new Set(listings.map((l) => this._parseZip(l.address)))].sort();

    // Current filter state
    this.state = {
      searchQuery: '',
      types: new Set(),        // empty = all
      minBeds: 0,
      minBaths: 0,
      priceMin: 0,
      priceMax: Infinity,
      sqftMin: 0,
      sqftMax: Infinity,
      amenities: new Set(),    // empty = any
    };

    this._render();
    this._bindEvents();
  }

  // ── Parsing helpers ─────────────────────────────────

  /** Extract city name from address like "9145 Reseda Blvd, Northridge, CA 91324" */
  _parseCity(address) {
    const parts = address.split(',');
    return parts.length >= 2 ? parts[1].trim() : '';
  }

  /** Extract zip code from address */
  _parseZip(address) {
    const match = address.match(/\d{5}$/);
    return match ? match[0] : '';
  }

  // ── Render ──────────────────────────────────────────

  _render() {
    this.container.innerHTML = `
      <div class="filter-bar">
        <!-- Search -->
        <div class="filter-bar__search">
          <input
            type="text"
            id="filter-search"
            class="filter-bar__input"
            placeholder="Search by city or zip code..."
            autocomplete="off"
          />
          <svg class="filter-bar__search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>

        <!-- Toggle button for advanced filters -->
        <button class="filter-bar__toggle" id="filter-toggle">
          <span class="filter-bar__toggle-text">Filters</span>
          <span class="filter-bar__badge" id="filter-badge" style="display:none;">0</span>
          <svg class="filter-bar__chevron" id="filter-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <!-- Collapsible filter panel -->
        <div class="filter-bar__panel" id="filter-panel" style="display:none;">

          <!-- Property Type -->
          <div class="filter-bar__section">
            <div class="filter-bar__label">Property Type</div>
            <div class="filter-bar__checks" id="filter-types">
              ${this.allTypes
                .map(
                  (t) => `
                <label class="filter-bar__check">
                  <input type="checkbox" value="${t}" data-filter="type" />
                  <span>${t}</span>
                </label>`,
                )
                .join('')}
            </div>
          </div>

          <!-- Bedrooms -->
          <div class="filter-bar__section">
            <div class="filter-bar__label">Bedrooms</div>
            <div class="filter-bar__range-row">
              <select id="filter-beds" class="filter-bar__select">
                <option value="0">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </select>
            </div>
          </div>

          <!-- Bathrooms -->
          <div class="filter-bar__section">
            <div class="filter-bar__label">Bathrooms</div>
            <div class="filter-bar__range-row">
              <select id="filter-baths" class="filter-bar__select">
                <option value="0">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
              </select>
            </div>
          </div>

          <!-- Price Range -->
          <div class="filter-bar__section">
            <div class="filter-bar__label">Price Range</div>
            <div class="filter-bar__range-row">
              <input type="number" id="filter-price-min" class="filter-bar__number" placeholder="Min" min="0" step="50" />
              <span class="filter-bar__range-sep">–</span>
              <input type="number" id="filter-price-max" class="filter-bar__number" placeholder="Max" min="0" step="50" />
            </div>
          </div>

          <!-- Sqft Range -->
          <div class="filter-bar__section">
            <div class="filter-bar__label">Square Feet</div>
            <div class="filter-bar__range-row">
              <input type="number" id="filter-sqft-min" class="filter-bar__number" placeholder="Min" min="0" step="50" />
              <span class="filter-bar__range-sep">–</span>
              <input type="number" id="filter-sqft-max" class="filter-bar__number" placeholder="Max" min="0" step="50" />
            </div>
          </div>

          <!-- Amenities -->
          <div class="filter-bar__section">
            <div class="filter-bar__label">Amenities</div>
            <div class="filter-bar__checks filter-bar__checks--wrap" id="filter-amenities">
              ${this.allAmenities
                .map(
                  (a) => `
                <label class="filter-bar__check">
                  <input type="checkbox" value="${a}" data-filter="amenity" />
                  <span>${a}</span>
                </label>`,
                )
                .join('')}
            </div>
          </div>

          <!-- Reset button -->
          <button class="filter-bar__reset" id="filter-reset">Reset All Filters</button>
        </div>
      </div>
    `;
  }

  // ── Events ──────────────────────────────────────────

  _bindEvents() {
    // Search input
    const searchInput = document.getElementById('filter-search');
    searchInput.addEventListener('input', () => {
      this.state.searchQuery = searchInput.value.trim().toLowerCase();
      this._emitChange();
    });

    // Filter toggle
    const toggleBtn = document.getElementById('filter-toggle');
    const panel = document.getElementById('filter-panel');
    const chevron = document.getElementById('filter-chevron');
    toggleBtn.addEventListener('click', () => {
      const isOpen = panel.style.display !== 'none';
      panel.style.display = isOpen ? 'none' : 'block';
      chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
      toggleBtn.classList.toggle('filter-bar__toggle--active', !isOpen);
    });

    // Type checkboxes
    this.container.querySelectorAll('[data-filter="type"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          this.state.types.add(cb.value);
        } else {
          this.state.types.delete(cb.value);
        }
        this._emitChange();
      });
    });

    // Amenity checkboxes
    this.container.querySelectorAll('[data-filter="amenity"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          this.state.amenities.add(cb.value);
        } else {
          this.state.amenities.delete(cb.value);
        }
        this._emitChange();
      });
    });

    // Bedrooms select
    document.getElementById('filter-beds').addEventListener('change', (e) => {
      this.state.minBeds = parseInt(e.target.value, 10);
      this._emitChange();
    });

    // Bathrooms select
    document.getElementById('filter-baths').addEventListener('change', (e) => {
      this.state.minBaths = parseInt(e.target.value, 10);
      this._emitChange();
    });

    // Price range
    const priceMin = document.getElementById('filter-price-min');
    const priceMax = document.getElementById('filter-price-max');
    priceMin.addEventListener('input', () => {
      this.state.priceMin = priceMin.value ? parseInt(priceMin.value, 10) : 0;
      this._emitChange();
    });
    priceMax.addEventListener('input', () => {
      this.state.priceMax = priceMax.value ? parseInt(priceMax.value, 10) : Infinity;
      this._emitChange();
    });

    // Sqft range
    const sqftMin = document.getElementById('filter-sqft-min');
    const sqftMax = document.getElementById('filter-sqft-max');
    sqftMin.addEventListener('input', () => {
      this.state.sqftMin = sqftMin.value ? parseInt(sqftMin.value, 10) : 0;
      this._emitChange();
    });
    sqftMax.addEventListener('input', () => {
      this.state.sqftMax = sqftMax.value ? parseInt(sqftMax.value, 10) : Infinity;
      this._emitChange();
    });

    // Reset
    document.getElementById('filter-reset').addEventListener('click', () => {
      this._resetAll();
    });
  }

  _resetAll() {
    this.state = {
      searchQuery: '',
      types: new Set(),
      minBeds: 0,
      minBaths: 0,
      priceMin: 0,
      priceMax: Infinity,
      sqftMin: 0,
      sqftMax: Infinity,
      amenities: new Set(),
    };

    // Reset DOM
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-beds').value = '0';
    document.getElementById('filter-baths').value = '0';
    document.getElementById('filter-price-min').value = '';
    document.getElementById('filter-price-max').value = '';
    document.getElementById('filter-sqft-min').value = '';
    document.getElementById('filter-sqft-max').value = '';
    this.container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });

    this._emitChange();
  }

  // ── Filtering logic ─────────────────────────────────

  /**
   * Filter a set of listings through all active filters.
   * @param {Array} listings – listings to filter (usually the map-visible ones)
   * @returns {Array} – subset that passes all filters
   */
  applyFilters(listings) {
    return listings.filter((listing) => {
      // Search by city or zip
      if (this.state.searchQuery) {
        const city = this._parseCity(listing.address).toLowerCase();
        const zip = this._parseZip(listing.address);
        const query = this.state.searchQuery;
        if (!city.includes(query) && !zip.includes(query)) {
          return false;
        }
      }

      // Property type
      if (this.state.types.size > 0 && !this.state.types.has(listing.type)) {
        return false;
      }

      // Bedrooms (0 = studio counts as 0)
      if (listing.bedrooms < this.state.minBeds) {
        return false;
      }

      // Bathrooms
      if (listing.bathrooms < this.state.minBaths) {
        return false;
      }

      // Price range
      if (listing.price < this.state.priceMin) {
        return false;
      }
      if (listing.price > this.state.priceMax) {
        return false;
      }

      // Sqft range
      if (listing.sqft < this.state.sqftMin) {
        return false;
      }
      if (listing.sqft > this.state.sqftMax) {
        return false;
      }

      // Amenities – listing must have ALL selected amenities
      if (this.state.amenities.size > 0) {
        for (const amenity of this.state.amenities) {
          if (!listing.amenities.includes(amenity)) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Returns the set of listing IDs that pass all filters
   * (tested against the FULL listings array, ignoring map bounds).
   * Used to toggle marker visibility on the map.
   */
  getPassingIds() {
    const passing = this.applyFilters(this.listings);
    return new Set(passing.map((l) => l.id));
  }

  // ── Active filter count (for badge) ─────────────────

  _getActiveFilterCount() {
    let count = 0;
    if (this.state.searchQuery) count++;
    if (this.state.types.size > 0) count++;
    if (this.state.minBeds > 0) count++;
    if (this.state.minBaths > 0) count++;
    if (this.state.priceMin > 0) count++;
    if (this.state.priceMax < Infinity) count++;
    if (this.state.sqftMin > 0) count++;
    if (this.state.sqftMax < Infinity) count++;
    if (this.state.amenities.size > 0) count++;
    return count;
  }

  _updateBadge() {
    const badge = document.getElementById('filter-badge');
    const count = this._getActiveFilterCount();
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Change notification ─────────────────────────────

  _emitChange() {
    this._updateBadge();
    if (this._onChange) this._onChange();
  }

  onChange(cb) {
    this._onChange = cb;
  }
}
