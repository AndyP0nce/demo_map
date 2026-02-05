/**
 * filters.js
 * ---------------------------------------------------
 * Horizontal filter toolbar that sits above the map.
 *
 * Features:
 *   - Search bar with autocomplete (city, zip, address, campus)
 *   - Dropdown filter buttons (Property Type, Beds, Baths, Price, Sqft, Amenities)
 *   - Active filter chips below the buttons with × to remove
 *
 * Each filter category is a button that opens a small
 * dropdown panel. Only one panel open at a time.
 * ---------------------------------------------------
 */

export class FilterManager {
  /**
   * @param {string} containerId  – id of the DOM element to render filters into
   * @param {Array}  listings     – full LISTINGS array to derive filter options
   * @param {Array}  universities – full UNIVERSITIES array for target selector + search
   */
  constructor(containerId, listings, universities) {
    this.container = document.getElementById(containerId);
    this.listings = listings;
    this.universities = universities || [];
    this._onChange = null;
    this._onSearchChange = null;
    this._onTargetChange = null;
    this._searchDebounceTimer = null;
    this._currentPanel = null; // currently open dropdown name

    // Default target university (CSUN)
    this._targetUniversity = this.universities.find((u) => u.name === 'CSUN') || this.universities[0] || null;

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
      types: new Set(),
      minBeds: 0,
      minBaths: 0,
      priceMin: 0,
      priceMax: Infinity,
      sqftMin: 0,
      sqftMax: Infinity,
      amenities: new Set(),
    };

    this._render();
    this._bindEvents();
  }

  // ── Parsing helpers ─────────────────────────────────

  _parseCity(address) {
    const parts = address.split(',');
    return parts.length >= 2 ? parts[1].trim() : '';
  }

  _parseZip(address) {
    const match = address.match(/\d{5}$/);
    return match ? match[0] : '';
  }

  // ── Autocomplete catalog ────────────────────────────

  _buildSuggestions() {
    const suggestions = [];

    // All universities as campus suggestions
    this.universities.forEach((uni) => {
      suggestions.push({
        text: `${uni.name} – ${uni.fullName}`,
        type: 'Campus',
        icon: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9l-11-6z',
        searchValue: `${uni.name.toLowerCase()} ${uni.fullName.toLowerCase()}`,
        uniName: uni.name,
      });
    });

    this.allCities.forEach((city) => {
      const count = this.listings.filter((l) => this._parseCity(l.address) === city).length;
      suggestions.push({
        text: city,
        type: `City · ${count} listing${count !== 1 ? 's' : ''}`,
        icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
        searchValue: city.toLowerCase(),
      });
    });

    this.allZips.forEach((zip) => {
      const sample = this.listings.find((l) => this._parseZip(l.address) === zip);
      const city = sample ? this._parseCity(sample.address) : '';
      suggestions.push({
        text: zip,
        type: `Zip Code · ${city}`,
        icon: 'M20 6H10v2h10V6zm0 4H10v2h10v-2zm0 4H10v2h10v-2zM4 6h4v12H4z',
        searchValue: zip,
      });
    });

    this.listings.forEach((l) => {
      suggestions.push({
        text: l.address,
        type: 'Address',
        icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
        searchValue: l.address.toLowerCase(),
      });
    });

    return suggestions;
  }

  _matchSuggestions(query, limit = 6) {
    if (!query) return [];
    const q = query.toLowerCase();
    return this._suggestions
      .filter((s) => s.text.toLowerCase().includes(q) || s.searchValue.includes(q))
      .slice(0, limit);
  }

  // ── Render ──────────────────────────────────────────

  _render() {
    const chevron = '<svg class="ftb__chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';

    const uniOptions = this.universities
      .slice().sort((a, b) => a.name.localeCompare(b.name))
      .map((u) => `<option value="${u.name}"${u.name === (this._targetUniversity ? this._targetUniversity.name : '') ? ' selected' : ''}>${u.name}</option>`)
      .join('');

    this.container.innerHTML = `
      <div class="ftb">
        <!-- Row 1: Target school + Search bar -->
        <div class="ftb__row ftb__search-row">
          <div class="ftb__target" title="Target university – distances are calculated from this school">
            <svg class="ftb__target-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9l-11-6z"/>
            </svg>
            <select class="ftb__target-select" id="filter-target">${uniOptions}</select>
          </div>
          <div class="ftb__search">
            <svg class="ftb__search-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" id="filter-search" class="ftb__search-input" placeholder="Search by city, zip, address, or university..." autocomplete="off" />
            <div class="ftb__autocomplete" id="filter-dropdown"></div>
          </div>
        </div>

        <!-- Row 2: Filter dropdown buttons -->
        <div class="ftb__row ftb__buttons">
          ${this._renderBtn('type', 'Property Type', chevron)}
          ${this._renderBtn('beds', 'Beds', chevron)}
          ${this._renderBtn('baths', 'Baths', chevron)}
          ${this._renderBtn('price', 'Price', chevron)}
          ${this._renderBtn('sqft', 'Sqft', chevron)}
          ${this._renderBtn('amenities', 'Amenities', chevron)}
        </div>

        <!-- Dropdown panels (positioned absolutely below their button) -->
        ${this._renderTypePanel()}
        ${this._renderBedsPanel()}
        ${this._renderBathsPanel()}
        ${this._renderPricePanel()}
        ${this._renderSqftPanel()}
        ${this._renderAmenitiesPanel()}

        <!-- Row 3: Active filter chips -->
        <div class="ftb__chips" id="filter-chips"></div>
      </div>
    `;
  }

  _renderBtn(name, label, chevron) {
    return `
      <div class="ftb__btn-wrap" data-panel="${name}">
        <button class="ftb__btn" data-panel="${name}">
          <span>${label}</span>${chevron}
        </button>
      </div>`;
  }

  _renderTypePanel() {
    const checks = this.allTypes.map((t) => `
      <label class="ftb__check"><input type="checkbox" value="${t}" data-filter="type"/><span>${t}</span></label>`).join('');
    return `<div class="ftb__panel" id="panel-type">${checks}</div>`;
  }

  _renderBedsPanel() {
    return `<div class="ftb__panel" id="panel-beds">
      <select id="filter-beds" class="ftb__select">
        <option value="0">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option>
      </select>
    </div>`;
  }

  _renderBathsPanel() {
    return `<div class="ftb__panel" id="panel-baths">
      <select id="filter-baths" class="ftb__select">
        <option value="0">Any</option><option value="1">1+</option><option value="2">2+</option>
      </select>
    </div>`;
  }

  _renderPricePanel() {
    return `<div class="ftb__panel" id="panel-price">
      <div class="ftb__range">
        <input type="number" id="filter-price-min" class="ftb__num" placeholder="Min $" min="0" step="50"/>
        <span class="ftb__range-sep">&ndash;</span>
        <input type="number" id="filter-price-max" class="ftb__num" placeholder="Max $" min="0" step="50"/>
      </div>
    </div>`;
  }

  _renderSqftPanel() {
    return `<div class="ftb__panel" id="panel-sqft">
      <div class="ftb__range">
        <input type="number" id="filter-sqft-min" class="ftb__num" placeholder="Min" min="0" step="50"/>
        <span class="ftb__range-sep">&ndash;</span>
        <input type="number" id="filter-sqft-max" class="ftb__num" placeholder="Max" min="0" step="50"/>
      </div>
    </div>`;
  }

  _renderAmenitiesPanel() {
    const checks = this.allAmenities.map((a) => `
      <label class="ftb__check"><input type="checkbox" value="${a}" data-filter="amenity"/><span>${a}</span></label>`).join('');
    return `<div class="ftb__panel ftb__panel--wide" id="panel-amenities">${checks}</div>`;
  }

  // ── Events ──────────────────────────────────────────

  _bindEvents() {
    // ─ Target university selector ─
    document.getElementById('filter-target').addEventListener('change', (e) => {
      const uni = this.universities.find((u) => u.name === e.target.value);
      if (uni) {
        this._targetUniversity = uni;
        if (this._onTargetChange) this._onTargetChange(uni);
      }
    });

    // ─ Search input + autocomplete ─
    const searchInput = document.getElementById('filter-search');
    const acDropdown = document.getElementById('filter-dropdown');
    this._activeDropdownIndex = -1;

    searchInput.addEventListener('input', () => {
      this.state.searchQuery = searchInput.value.trim().toLowerCase();
      this._showAutocomplete(searchInput.value.trim());
      this._emitChange();
      this._emitSearchChange();
    });

    searchInput.addEventListener('focus', () => {
      this._closeAllPanels();
      if (searchInput.value.trim()) this._showAutocomplete(searchInput.value.trim());
    });

    searchInput.addEventListener('keydown', (e) => {
      const items = acDropdown.querySelectorAll('.ftb__ac-item');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._activeDropdownIndex = Math.min(this._activeDropdownIndex + 1, items.length - 1);
        this._highlightAcItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._activeDropdownIndex = Math.max(this._activeDropdownIndex - 1, 0);
        this._highlightAcItem(items);
      } else if (e.key === 'Enter' && this._activeDropdownIndex >= 0) {
        e.preventDefault();
        items[this._activeDropdownIndex].click();
      } else if (e.key === 'Escape') {
        this._hideAutocomplete();
        searchInput.blur();
      }
    });

    // ─ Dropdown button toggles ─
    this.container.querySelectorAll('.ftb__btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._hideAutocomplete();
        const name = btn.dataset.panel;
        if (this._currentPanel === name) {
          this._closeAllPanels();
        } else {
          this._showPanel(name);
        }
      });
    });

    // ─ Close panels / autocomplete on outside click ─
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this._closeAllPanels();
        this._hideAutocomplete();
      }
    });

    // Prevent panel clicks from closing themselves
    this.container.querySelectorAll('.ftb__panel').forEach((panel) => {
      panel.addEventListener('click', (e) => e.stopPropagation());
    });

    // ─ Filter controls inside panels ─
    // Type checkboxes
    this.container.querySelectorAll('[data-filter="type"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        cb.checked ? this.state.types.add(cb.value) : this.state.types.delete(cb.value);
        this._updateChips();
        this._updateButtonStates();
        this._emitChange();
      });
    });

    // Amenity checkboxes
    this.container.querySelectorAll('[data-filter="amenity"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        cb.checked ? this.state.amenities.add(cb.value) : this.state.amenities.delete(cb.value);
        this._updateChips();
        this._updateButtonStates();
        this._emitChange();
      });
    });

    // Beds
    document.getElementById('filter-beds').addEventListener('change', (e) => {
      this.state.minBeds = parseInt(e.target.value, 10);
      this._updateChips();
      this._updateButtonStates();
      this._emitChange();
    });

    // Baths
    document.getElementById('filter-baths').addEventListener('change', (e) => {
      this.state.minBaths = parseInt(e.target.value, 10);
      this._updateChips();
      this._updateButtonStates();
      this._emitChange();
    });

    // Price
    document.getElementById('filter-price-min').addEventListener('input', (e) => {
      this.state.priceMin = e.target.value ? parseInt(e.target.value, 10) : 0;
      this._updateChips();
      this._updateButtonStates();
      this._emitChange();
    });
    document.getElementById('filter-price-max').addEventListener('input', (e) => {
      this.state.priceMax = e.target.value ? parseInt(e.target.value, 10) : Infinity;
      this._updateChips();
      this._updateButtonStates();
      this._emitChange();
    });

    // Sqft
    document.getElementById('filter-sqft-min').addEventListener('input', (e) => {
      this.state.sqftMin = e.target.value ? parseInt(e.target.value, 10) : 0;
      this._updateChips();
      this._updateButtonStates();
      this._emitChange();
    });
    document.getElementById('filter-sqft-max').addEventListener('input', (e) => {
      this.state.sqftMax = e.target.value ? parseInt(e.target.value, 10) : Infinity;
      this._updateChips();
      this._updateButtonStates();
      this._emitChange();
    });
  }

  // ── Dropdown panel management ───────────────────────

  _showPanel(name) {
    this._closeAllPanels();
    const panel = document.getElementById(`panel-${name}`);
    const btn = this.container.querySelector(`.ftb__btn-wrap[data-panel="${name}"]`);
    if (panel && btn) {
      panel.classList.add('ftb__panel--open');
      btn.querySelector('.ftb__btn').classList.add('ftb__btn--active');

      // Position the panel below its button
      const btnRect = btn.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      panel.style.top = (btnRect.bottom - containerRect.top) + 'px';
      panel.style.left = (btnRect.left - containerRect.left) + 'px';
    }
    this._currentPanel = name;
  }

  _closeAllPanels() {
    this.container.querySelectorAll('.ftb__panel').forEach((p) => p.classList.remove('ftb__panel--open'));
    this.container.querySelectorAll('.ftb__btn').forEach((b) => b.classList.remove('ftb__btn--active'));
    this._currentPanel = null;
  }

  // ── Button active states ────────────────────────────

  _updateButtonStates() {
    const setActive = (name, active) => {
      const wrap = this.container.querySelector(`.ftb__btn-wrap[data-panel="${name}"]`);
      if (wrap) wrap.querySelector('.ftb__btn').classList.toggle('ftb__btn--has-value', active);
    };
    setActive('type', this.state.types.size > 0);
    setActive('beds', this.state.minBeds > 0);
    setActive('baths', this.state.minBaths > 0);
    setActive('price', this.state.priceMin > 0 || this.state.priceMax < Infinity);
    setActive('sqft', this.state.sqftMin > 0 || this.state.sqftMax < Infinity);
    setActive('amenities', this.state.amenities.size > 0);
  }

  // ── Chips ───────────────────────────────────────────

  _updateChips() {
    const chips = this._getActiveChips();
    const container = document.getElementById('filter-chips');
    if (!chips.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = chips.map((c) =>
      `<span class="ftb__chip" data-key="${c.key}" data-value="${c.value || ''}">
        ${c.label}
        <button class="ftb__chip-x" aria-label="Remove">&times;</button>
      </span>`
    ).join('') +
    `<button class="ftb__chip ftb__chip--reset" id="chip-reset-all">Clear all</button>`;

    // Bind chip remove buttons
    container.querySelectorAll('.ftb__chip-x').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chip = btn.parentElement;
        this._removeFilter(chip.dataset.key, chip.dataset.value);
      });
    });

    const resetBtn = document.getElementById('chip-reset-all');
    if (resetBtn) resetBtn.addEventListener('click', () => this._resetAll());
  }

  _getActiveChips() {
    const chips = [];

    for (const type of this.state.types) {
      chips.push({ label: type, key: 'type', value: type });
    }
    if (this.state.minBeds > 0) {
      chips.push({ label: `${this.state.minBeds}+ Beds`, key: 'beds' });
    }
    if (this.state.minBaths > 0) {
      chips.push({ label: `${this.state.minBaths}+ Baths`, key: 'baths' });
    }
    if (this.state.priceMin > 0 && this.state.priceMax < Infinity) {
      chips.push({ label: `$${this.state.priceMin.toLocaleString()} – $${this.state.priceMax.toLocaleString()}`, key: 'price' });
    } else if (this.state.priceMin > 0) {
      chips.push({ label: `$${this.state.priceMin.toLocaleString()}+`, key: 'price' });
    } else if (this.state.priceMax < Infinity) {
      chips.push({ label: `Up to $${this.state.priceMax.toLocaleString()}`, key: 'price' });
    }
    if (this.state.sqftMin > 0 && this.state.sqftMax < Infinity) {
      chips.push({ label: `${this.state.sqftMin} – ${this.state.sqftMax} sqft`, key: 'sqft' });
    } else if (this.state.sqftMin > 0) {
      chips.push({ label: `${this.state.sqftMin}+ sqft`, key: 'sqft' });
    } else if (this.state.sqftMax < Infinity) {
      chips.push({ label: `Up to ${this.state.sqftMax} sqft`, key: 'sqft' });
    }
    for (const amenity of this.state.amenities) {
      chips.push({ label: amenity, key: 'amenity', value: amenity });
    }

    return chips;
  }

  _removeFilter(key, value) {
    switch (key) {
      case 'type':
        this.state.types.delete(value);
        this.container.querySelector(`[data-filter="type"][value="${value}"]`).checked = false;
        break;
      case 'beds':
        this.state.minBeds = 0;
        document.getElementById('filter-beds').value = '0';
        break;
      case 'baths':
        this.state.minBaths = 0;
        document.getElementById('filter-baths').value = '0';
        break;
      case 'price':
        this.state.priceMin = 0;
        this.state.priceMax = Infinity;
        document.getElementById('filter-price-min').value = '';
        document.getElementById('filter-price-max').value = '';
        break;
      case 'sqft':
        this.state.sqftMin = 0;
        this.state.sqftMax = Infinity;
        document.getElementById('filter-sqft-min').value = '';
        document.getElementById('filter-sqft-max').value = '';
        break;
      case 'amenity':
        this.state.amenities.delete(value);
        this.container.querySelector(`[data-filter="amenity"][value="${value}"]`).checked = false;
        break;
    }
    this._updateChips();
    this._updateButtonStates();
    this._emitChange();
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

    document.getElementById('filter-search').value = '';
    document.getElementById('filter-beds').value = '0';
    document.getElementById('filter-baths').value = '0';
    document.getElementById('filter-price-min').value = '';
    document.getElementById('filter-price-max').value = '';
    document.getElementById('filter-sqft-min').value = '';
    document.getElementById('filter-sqft-max').value = '';
    this.container.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });

    this._updateChips();
    this._updateButtonStates();
    this._emitChange();
    this._emitSearchChange();
  }

  // ── Autocomplete dropdown ───────────────────────────

  _showAutocomplete(query) {
    const dropdown = document.getElementById('filter-dropdown');
    const matches = this._matchSuggestions(query);
    this._activeDropdownIndex = -1;

    if (!matches.length) { this._hideAutocomplete(); return; }

    dropdown.innerHTML = matches.map((s, i) => `
      <div class="ftb__ac-item" data-index="${i}" data-value="${s.searchValue}" data-uni="${s.uniName || ''}">
        <svg class="ftb__ac-icon" viewBox="0 0 24 24" width="16" height="16"><path d="${s.icon}" fill="currentColor"/></svg>
        <div class="ftb__ac-text">
          <span class="ftb__ac-name">${this._highlightMatch(s.text, query)}</span>
          <span class="ftb__ac-type">${s.type}</span>
        </div>
      </div>`).join('');

    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.ftb__ac-item').forEach((item) => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const uniName = item.dataset.uni;
        if (uniName) {
          // University selected → set as target
          this._selectUniversitySuggestion(uniName);
        } else {
          this._selectSuggestion(item.dataset.value);
        }
      });
    });
  }

  _hideAutocomplete() {
    const dropdown = document.getElementById('filter-dropdown');
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    this._activeDropdownIndex = -1;
  }

  _highlightAcItem(items) {
    items.forEach((el, i) => {
      el.classList.toggle('ftb__ac-item--active', i === this._activeDropdownIndex);
    });
  }

  _highlightMatch(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return `${text.slice(0, idx)}<strong>${text.slice(idx, idx + query.length)}</strong>${text.slice(idx + query.length)}`;
  }

  _selectSuggestion(value) {
    const searchInput = document.getElementById('filter-search');
    searchInput.value = value;
    this.state.searchQuery = value.toLowerCase();
    this._hideAutocomplete();
    this._emitChange();
    this._emitSearchChange();
  }

  /** When a university is selected from autocomplete, set it as target and clear search. */
  _selectUniversitySuggestion(uniName) {
    const uni = this.universities.find((u) => u.name === uniName);
    if (!uni) return;

    // Update target
    this._targetUniversity = uni;
    document.getElementById('filter-target').value = uni.name;

    // Clear search (university isn't a listing filter)
    const searchInput = document.getElementById('filter-search');
    searchInput.value = '';
    this.state.searchQuery = '';
    this._hideAutocomplete();
    this._emitChange();

    // Notify app.js of the target change
    if (this._onTargetChange) this._onTargetChange(uni);
  }

  // ── Filtering logic ─────────────────────────────────

  applyFilters(listings) {
    return listings.filter((listing) => {
      if (this.state.searchQuery) {
        const city = this._parseCity(listing.address).toLowerCase();
        const zip = this._parseZip(listing.address);
        const addr = listing.address.toLowerCase();
        const query = this.state.searchQuery;
        if (!city.includes(query) && !zip.includes(query) && !addr.includes(query)) return false;
      }
      if (this.state.types.size > 0 && !this.state.types.has(listing.type)) return false;
      if (listing.bedrooms < this.state.minBeds) return false;
      if (listing.bathrooms < this.state.minBaths) return false;
      if (listing.price < this.state.priceMin) return false;
      if (listing.price > this.state.priceMax) return false;
      if (listing.sqft < this.state.sqftMin) return false;
      if (listing.sqft > this.state.sqftMax) return false;
      if (this.state.amenities.size > 0) {
        for (const amenity of this.state.amenities) {
          if (!listing.amenities.includes(amenity)) return false;
        }
      }
      return true;
    });
  }

  getPassingIds() {
    const passing = this.applyFilters(this.listings);
    return new Set(passing.map((l) => l.id));
  }

  // ── Search helpers ──────────────────────────────────

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
    if (this._onChange) this._onChange();
  }

  _emitSearchChange() {
    clearTimeout(this._searchDebounceTimer);
    this._searchDebounceTimer = setTimeout(() => {
      if (this._onSearchChange) this._onSearchChange(this.getSearchMatches());
    }, 400);
  }

  onChange(cb) { this._onChange = cb; }
  onSearchChange(cb) { this._onSearchChange = cb; }
  onTargetChange(cb) { this._onTargetChange = cb; }
  getTargetUniversity() { return this._targetUniversity; }
}
