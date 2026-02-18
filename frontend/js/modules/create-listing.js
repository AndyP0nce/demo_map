/**
 * create-listing.js
 * ---------------------------------------------------
 * Modal form for creating a new apartment listing.
 *
 * Opens as a centered overlay when the user clicks
 * "+ List Your Place" in the header. Submits to
 * POST /api/listings/ and fires onSuccess() with the
 * parsed listing so app.js can add it to the map.
 *
 * Geocodes the address via Google Maps Geocoding API
 * before submitting so the pin appears on the map.
 * ---------------------------------------------------
 */

const AMENITY_OPTIONS = [
  'WiFi', 'Parking', 'Laundry', 'AC', 'Pool', 'Gym',
  'Furnished', 'Pet Friendly', 'Utilities Included',
  'Bike Storage', 'Backyard', 'Doorman',
];

export class CreateListingModal {
  /**
   * @param {string} containerId – id of the DOM element to render into
   * @param {string} apiBase     – base URL for the API (e.g. http://localhost:8001/api)
   */
  constructor(containerId, apiBase) {
    this.container = document.getElementById(containerId);
    this.apiBase = apiBase;
    this._onSuccess = null;
    this._submitting = false;

    this._render();
    this._bindEvents();
  }

  // ── Public API ──────────────────────────────────────

  open() {
    this.container.classList.add('create-modal--open');
    document.body.style.overflow = 'hidden';
    this._resetForm();
  }

  close() {
    this.container.classList.remove('create-modal--open');
    document.body.style.overflow = '';
  }

  isOpen() {
    return this.container.classList.contains('create-modal--open');
  }

  /** Register a callback fired with the parsed new listing on success. */
  onSuccess(cb) {
    this._onSuccess = cb;
  }

  // ── Render ──────────────────────────────────────────

  _render() {
    const amenityChecks = AMENITY_OPTIONS.map((a) =>
      `<label class="create-modal__check">
        <input type="checkbox" name="amenities" value="${a}"/>
        <span>${a}</span>
      </label>`,
    ).join('');

    this.container.innerHTML = `
      <div class="create-modal__backdrop" id="create-backdrop"></div>
      <div class="create-modal__card">

        <!-- Header -->
        <div class="create-modal__header">
          <h2 class="create-modal__title">List Your Place</h2>
          <button class="create-modal__close" id="create-close" aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Scrollable form body -->
        <div class="create-modal__body">
          <form id="create-listing-form" novalidate>

            <!-- Title -->
            <div class="create-modal__section">
              <label class="create-modal__label" for="cl-title">Listing Title *</label>
              <input type="text" id="cl-title" name="title" class="create-modal__input"
                placeholder="e.g. Bright 2BR near UCLA" required />
            </div>

            <!-- Type + Beds -->
            <div class="create-modal__row">
              <div class="create-modal__field">
                <label class="create-modal__label" for="cl-type">Property Type *</label>
                <select id="cl-type" name="type" class="create-modal__select" required>
                  <option value="">Select type</option>
                  <option value="Apartment">Apartment</option>
                  <option value="House">House</option>
                  <option value="Studio">Studio</option>
                  <option value="Condo">Condo</option>
                  <option value="Private Room">Private Room</option>
                  <option value="Shared Room">Shared Room</option>
                </select>
              </div>
              <div class="create-modal__field">
                <label class="create-modal__label" for="cl-beds">Bedrooms *</label>
                <select id="cl-beds" name="bedrooms" class="create-modal__select" required>
                  <option value="">Select</option>
                  <option value="Studio">Studio</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4+</option>
                </select>
              </div>
            </div>

            <!-- Baths + Price -->
            <div class="create-modal__row">
              <div class="create-modal__field">
                <label class="create-modal__label" for="cl-baths">Bathrooms *</label>
                <select id="cl-baths" name="bathrooms" class="create-modal__select" required>
                  <option value="">Select</option>
                  <option value="1">1</option>
                  <option value="1.5">1.5</option>
                  <option value="2">2</option>
                  <option value="2.5">2.5</option>
                  <option value="3">3+</option>
                </select>
              </div>
              <div class="create-modal__field">
                <label class="create-modal__label" for="cl-price">Monthly Rent ($) *</label>
                <input type="number" id="cl-price" name="price" class="create-modal__input"
                  placeholder="e.g. 1800" min="1" step="50" required />
              </div>
            </div>

            <!-- Square Feet -->
            <div class="create-modal__section">
              <label class="create-modal__label" for="cl-sqft">Square Feet (optional)</label>
              <input type="number" id="cl-sqft" name="sqft" class="create-modal__input create-modal__input--half"
                placeholder="e.g. 750" min="1" step="10" />
            </div>

            <!-- Street Address -->
            <div class="create-modal__section">
              <label class="create-modal__label" for="cl-address">Street Address *</label>
              <input type="text" id="cl-address" name="address" class="create-modal__input"
                placeholder="e.g. 9301 Reseda Blvd" required />
            </div>

            <!-- City / State / Zip -->
            <div class="create-modal__row">
              <div class="create-modal__field create-modal__field--grow">
                <label class="create-modal__label" for="cl-city">City *</label>
                <input type="text" id="cl-city" name="city" class="create-modal__input"
                  placeholder="e.g. Los Angeles" required />
              </div>
              <div class="create-modal__field create-modal__field--sm">
                <label class="create-modal__label" for="cl-state">State</label>
                <input type="text" id="cl-state" name="state" class="create-modal__input"
                  value="CA" maxlength="2" />
              </div>
              <div class="create-modal__field create-modal__field--sm">
                <label class="create-modal__label" for="cl-zip">Zip Code *</label>
                <input type="text" id="cl-zip" name="zip_code" class="create-modal__input"
                  placeholder="e.g. 91324" maxlength="10" required />
              </div>
            </div>

            <!-- Description -->
            <div class="create-modal__section">
              <label class="create-modal__label" for="cl-desc">Description</label>
              <textarea id="cl-desc" name="description" class="create-modal__textarea" rows="3"
                placeholder="Describe the apartment, highlights, nearby transit, etc."></textarea>
            </div>

            <!-- Amenities -->
            <div class="create-modal__section">
              <label class="create-modal__label">Amenities</label>
              <div class="create-modal__checks">${amenityChecks}</div>
            </div>

            <!-- Owner ID (demo only) -->
            <div class="create-modal__section create-modal__section--owner">
              <label class="create-modal__label" for="cl-owner">Owner User ID</label>
              <input type="number" id="cl-owner" name="owner_id" class="create-modal__input create-modal__input--half"
                value="65" min="1" />
              <p class="create-modal__hint">Demo only — authentication will fill this automatically in production.</p>
            </div>

            <!-- Error message -->
            <div id="create-error" class="create-modal__error" style="display:none;"></div>

            <!-- Submit / Cancel -->
            <div class="create-modal__actions">
              <button type="button" id="create-cancel" class="create-modal__btn create-modal__btn--ghost">Cancel</button>
              <button type="submit" id="create-submit" class="create-modal__btn create-modal__btn--primary">Post Listing</button>
            </div>

          </form>
        </div>
      </div>
    `;
  }

  // ── Events ──────────────────────────────────────────

  _bindEvents() {
    document.getElementById('create-close').addEventListener('click', () => this.close());
    document.getElementById('create-backdrop').addEventListener('click', () => this.close());
    document.getElementById('create-cancel').addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    document.getElementById('create-listing-form').addEventListener('submit', (e) => {
      this._handleSubmit(e);
    });
  }

  // ── Form helpers ─────────────────────────────────────

  _resetForm() {
    const form = document.getElementById('create-listing-form');
    if (form) form.reset();
    // Restore defaults that reset() clears
    const stateEl = document.getElementById('cl-state');
    const ownerEl = document.getElementById('cl-owner');
    if (stateEl) stateEl.value = 'CA';
    if (ownerEl) ownerEl.value = '65';
    this._setError('');
    this._setSubmitting(false);
  }

  _setSubmitting(loading) {
    this._submitting = loading;
    const btn = document.getElementById('create-submit');
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? 'Posting...' : 'Post Listing';
    }
  }

  _setError(msg) {
    const el = document.getElementById('create-error');
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
      el.textContent = '';
    }
  }

  // ── Submission ───────────────────────────────────────

  async _handleSubmit(e) {
    e.preventDefault();
    if (this._submitting) return;

    const form = document.getElementById('create-listing-form');

    // Gather values
    const title      = form.title.value.trim();
    const type       = form.type.value;
    const bedrooms   = form.bedrooms.value;
    const bathrooms  = form.bathrooms.value;
    const price      = parseFloat(form.price.value);
    const sqft       = form.sqft.value ? parseInt(form.sqft.value, 10) : null;
    const address    = form.address.value.trim();
    const city       = form.city.value.trim();
    const state      = form.state.value.trim() || 'CA';
    const zip_code   = form.zip_code.value.trim();
    const description = form.description.value.trim();
    const owner_id   = parseInt(form.owner_id.value, 10) || 65;
    const amenities  = [...form.querySelectorAll('input[name="amenities"]:checked')].map((cb) => cb.value);

    // Client-side validation
    if (!title)             return this._setError('Listing title is required.');
    if (!type)              return this._setError('Property type is required.');
    if (!bedrooms)          return this._setError('Bedrooms is required.');
    if (!bathrooms)         return this._setError('Bathrooms is required.');
    if (!price || price <= 0) return this._setError('Monthly rent must be a positive number.');
    if (!address)           return this._setError('Street address is required.');
    if (!city)              return this._setError('City is required.');
    if (!zip_code)          return this._setError('Zip code is required.');

    this._setError('');
    this._setSubmitting(true);

    // Geocode address → lat/lng so the listing appears on the map
    // Round to 6 decimal places to match DB schema (max_digits=9, decimal_places=6)
    let lat = null;
    let lng = null;
    try {
      const coords = await this._geocode(`${address}, ${city}, ${state} ${zip_code}`);
      lat = Math.round(coords.lat * 1000000) / 1000000;
      lng = Math.round(coords.lng * 1000000) / 1000000;
    } catch (geocodeErr) {
      console.warn('[CreateListing] Geocoding failed:', geocodeErr.message,
        '— listing will be saved without coordinates and won\'t appear on the map.');
    }

    // Build POST body
    const body = { title, type, bedrooms, bathrooms, price, address, city, state, zip_code, description, amenities, owner_id };
    if (lat !== null) body.lat = lat;
    if (lng !== null) body.lng = lng;
    if (sqft !== null) body.sqft = sqft;

    try {
      const response = await fetch(`${this.apiBase}/listings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        // DRF returns validation errors as objects or arrays
        const msg = this._formatApiError(errData) || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      const newListing = await response.json();
      this.close();
      if (this._onSuccess) this._onSuccess(newListing);

    } catch (err) {
      this._setError(`Failed to post listing: ${err.message}`);
    } finally {
      this._setSubmitting(false);
    }
  }

  /** Convert DRF error response object to a readable string. */
  _formatApiError(errData) {
    if (!errData || typeof errData !== 'object') return '';
    const lines = [];
    for (const [field, msgs] of Object.entries(errData)) {
      const text = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
      lines.push(field === 'non_field_errors' ? text : `${field}: ${text}`);
    }
    return lines.join(' | ');
  }

  // ── Geocoding ────────────────────────────────────────

  _geocode(address) {
    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results.length > 0) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          reject(new Error(`Geocoder status: ${status}`));
        }
      });
    });
  }
}
