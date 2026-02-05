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
    this._onSearchChange = null;
    this._searchDebounceTimer = null;

    // Derive unique values from listings
    this.allTypes = [...new Set(listings.map((l) => l.type))].sort();
    this.allAmenities = [...new Set(listings.flatMap((l) => l.amenities))].sort();
    this.allCities = [...new Set(listings.map((l) => this._parseCity(l.address)))].sort();
    this.allZips = [...new Set(listings.map((l) => this._parseZip(l.address)))].sort();

    // Build autocomplete suggestion catalog
    this._suggestions = this._buildSuggestions();

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

  // ── Autocomplete catalog ─────────────────────────────

  /**
   * Build a flat array of suggestion objects from listings data.
   * Each has { text, type, icon, searchValue }.
   */
  _buildSuggestions() {
    const suggestions = [];

    // Campus
    suggestions.push({
      text: 'CSUN - California State University, Northridge',
      type: 'Campus',
      icon: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9l-11-6z', // graduation cap simplified
      searchValue: 'northridge',
    });

    // Cities – with listing count
    this.allCities.forEach((city) => {
      const count = this.listings.filter((l) => this._parseCity(l.address) === city).length;
      suggestions.push({
        text: city,
        type: `City · ${count} listing${count !== 1 ? 's' : ''}`,
        icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z', // pin
        searchValue: city.toLowerCase(),
      });
    });

    // Zip codes – with city name
    this.allZips.forEach((zip) => {
      const sample = this.listings.find((l) => this._parseZip(l.address) === zip);
      const city = sample ? this._parseCity(sample.address) : '';
      suggestions.push({
        text: zip,
        type: `Zip Code · ${city}`,
        icon: 'M20 6H10v2h10V6zm0 4H10v2h10v-2zm0 4H10v2h10v-2zM4 6h4v12H4z', // list
        searchValue: zip,
      });
    });

    // Addresses (street + city) – one per listing
    this.listings.forEach((l) => {
      suggestions.push({
        text: l.address,
        type: 'Address',
        icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z', // house
        searchValue: l.address.toLowerCase(),
      });
    });

    return suggestions;
  }

  /**
   * Return up to `limit` suggestions matching the query string.
   */
  _matchSuggestions(query, limit = 6) {
    if (!query) return [];
    const q = query.toLowerCase();
    return this._suggestions
      .filter((s) => s.text.toLowerCase().includes(q) || s.searchValue.includes(q))
      .slice(0, limit);
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
          <div class="filter-bar__dropdown" id="filter-dropdown"></div>
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
    // Search input + autocomplete
    const searchInput = document.getElementById('filter-search');
    const dropdown = document.getElementById('filter-dropdown');
    this._activeDropdownIndex = -1;

    searchInput.addEventListener('input', () => {
      this.state.searchQuery = searchInput.value.trim().toLowerCase();
      this._showDropdown(searchInput.value.trim());
      this._emitChange();
      this._emitSearchChange();
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) {
        this._showDropdown(searchInput.value.trim());
      }
    });

    // Keyboard navigation inside dropdown
    searchInput.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.filter-bar__dropdown-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._activeDropdownIndex = Math.min(this._activeDropdownIndex + 1, items.length - 1);
        this._highlightDropdownItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._activeDropdownIndex = Math.max(this._activeDropdownIndex - 1, 0);
        this._highlightDropdownItem(items);
      } else if (e.key === 'Enter' && this._activeDropdownIndex >= 0) {
        e.preventDefault();
        items[this._activeDropdownIndex].click();
      } else if (e.key === 'Escape') {
        this._hideDropdown();
        searchInput.blur();
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.querySelector('.filter-bar__search').contains(e.target)) {
        this._hideDropdown();
      }
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

  // ── Autocomplete dropdown ────────────────────────────

  _showDropdown(query) {
    const dropdown = document.getElementById('filter-dropdown');
    const matches = this._matchSuggestions(query);
    this._activeDropdownIndex = -1;

    if (!matches.length) {
      this._hideDropdown();
      return;
    }

    dropdown.innerHTML = matches
      .map(
        (s, i) => `
        <div class="filter-bar__dropdown-item" data-index="${i}" data-value="${s.searchValue}">
          <svg class="filter-bar__dropdown-icon" viewBox="0 0 24 24" width="16" height="16">
            <path d="${s.icon}" fill="currentColor"/>
          </svg>
          <div class="filter-bar__dropdown-text">
            <span class="filter-bar__dropdown-name">${this._highlightMatch(s.text, query)}</span>
            <span class="filter-bar__dropdown-type">${s.type}</span>
          </div>
        </div>`,
      )
      .join('');

    dropdown.style.display = 'block';

    // Bind click on each suggestion
    dropdown.querySelectorAll('.filter-bar__dropdown-item').forEach((item) => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep focus on input
        this._selectSuggestion(item.dataset.value);
      });
    });
  }

  _hideDropdown() {
    const dropdown = document.getElementById('filter-dropdown');
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    this._activeDropdownIndex = -1;
  }

  _highlightDropdownItem(items) {
    items.forEach((el, i) => {
      el.classList.toggle('filter-bar__dropdown-item--active', i === this._activeDropdownIndex);
    });
  }

  /** Bold the portion of `text` that matches `query`. */
  _highlightMatch(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return `${before}<strong>${match}</strong>${after}`;
  }

  _selectSuggestion(value) {
    const searchInput = document.getElementById('filter-search');
    searchInput.value = value;
    this.state.searchQuery = value.toLowerCase();
    this._hideDropdown();
    this._emitChange();
    this._emitSearchChange();
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
    this._emitSearchChange();
  }

  // ── Filtering logic ─────────────────────────────────

  /**
   * Filter a set of listings through all active filters.
   * @param {Array} listings – listings to filter (usually the map-visible ones)
   * @returns {Array} – subset that passes all filters
   */
  applyFilters(listings) {
    return listings.filter((listing) => {
      // Search by city, zip, or address
      if (this.state.searchQuery) {
        const city = this._parseCity(listing.address).toLowerCase();
        const zip = this._parseZip(listing.address);
        const addr = listing.address.toLowerCase();
        const query = this.state.searchQuery;
        if (!city.includes(query) && !zip.includes(query) && !addr.includes(query)) {
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

  // ── Search helpers ───────────────────────────────────

  /**
   * Return all listings whose city or zip matches the current search query.
   * This ignores other filters – it's used to decide where the map should pan.
   */
  getSearchMatches() {
    if (!this.state.searchQuery) return [];
    const query = this.state.searchQuery;
    return this.listings.filter((listing) => {
      const city = this._parseCity(listing.address).toLowerCase();
      const zip = this._parseZip(listing.address);
      const addr = listing.address.toLowerCase();
      return city.includes(query) || zip.includes(query) || addr.includes(query);
    });
  }

  // ── Change notification ─────────────────────────────

  _emitChange() {
    this._updateBadge();
    if (this._onChange) this._onChange();
  }

  /** Debounced search-specific callback (400ms) so the map doesn't jump on every keystroke. */
  _emitSearchChange() {
    clearTimeout(this._searchDebounceTimer);
    this._searchDebounceTimer = setTimeout(() => {
      if (this._onSearchChange) {
        this._onSearchChange(this.getSearchMatches());
      }
    }, 400);
  }

  onChange(cb) {
    this._onChange = cb;
  }

  /** Register a callback for search-specific changes (debounced). */
  onSearchChange(cb) {
    this._onSearchChange = cb;
  }
}
