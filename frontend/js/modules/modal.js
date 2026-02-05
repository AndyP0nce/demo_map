/**
 * modal.js
 * ---------------------------------------------------
 * Full-detail listing modal with image gallery.
 *
 * Opens as a centered overlay when the user clicks a
 * price marker or sidebar card. Shows all listing info
 * in a scrollable panel with prev/next image cycling.
 *
 * Since the demo uses placeholder colors instead of real
 * photos, the gallery generates multiple "slides" with
 * colour variations and room labels.
 * ---------------------------------------------------
 */

export class ListingModal {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this._currentListing = null;
    this._currentSlide = 0;
    this._slides = [];
    this._onClose = null;

    this._render();
    this._bindEvents();
  }

  // ── Public API ──────────────────────────────────────

  /**
   * Open the modal for a listing.
   * @param {object} listing – full listing object from listings.js
   */
  open(listing) {
    this._currentListing = listing;
    this._slides = this._generateSlides(listing);
    this._currentSlide = 0;
    this._populateContent(listing);
    this.container.classList.add('detail-modal--open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.container.classList.remove('detail-modal--open');
    document.body.style.overflow = '';
    this._currentListing = null;
    if (this._onClose) this._onClose();
  }

  isOpen() {
    return this.container.classList.contains('detail-modal--open');
  }

  onClose(cb) {
    this._onClose = cb;
  }

  // ── Slide generation ────────────────────────────────

  /**
   * Build pseudo-gallery slides from a single listing colour.
   * Each slide gets a unique overlay gradient + room label.
   */
  _generateSlides(listing) {
    const base = listing.imageColor;
    return [
      { color: base, label: 'Main Photo', gradient: 'none' },
      { color: base, label: 'Living Area', gradient: 'linear-gradient(135deg, rgba(0,0,0,0.15) 0%, transparent 100%)' },
      { color: base, label: 'Kitchen', gradient: 'linear-gradient(45deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.18) 100%)' },
      { color: base, label: 'Bedroom', gradient: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.22) 100%)' },
      { color: base, label: 'Bathroom', gradient: 'linear-gradient(0deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.12) 100%)' },
    ];
  }

  // ── Render skeleton ─────────────────────────────────

  _render() {
    this.container.innerHTML = `
      <div class="detail-modal__backdrop" id="modal-backdrop"></div>
      <div class="detail-modal__card" id="modal-card">

        <!-- Close button -->
        <button class="detail-modal__close" id="modal-close" aria-label="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Image gallery -->
        <div class="detail-modal__gallery" id="modal-gallery">
          <div class="detail-modal__slide" id="modal-slide"></div>
          <button class="detail-modal__arrow detail-modal__arrow--left" id="modal-prev" aria-label="Previous photo">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button class="detail-modal__arrow detail-modal__arrow--right" id="modal-next" aria-label="Next photo">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 6 15 12 9 18"/>
            </svg>
          </button>
          <div class="detail-modal__slide-counter" id="modal-counter"></div>
          <div class="detail-modal__slide-label" id="modal-label"></div>
        </div>

        <!-- Scrollable body -->
        <div class="detail-modal__body" id="modal-body"></div>
      </div>
    `;
  }

  // ── Populate content ────────────────────────────────

  _populateContent(listing) {
    // Gallery
    this._updateSlide();

    // Body
    const bedLabel = listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bd`;
    const allAmenities = listing.amenities
      .map((a) => `<span class="detail-modal__tag">${a}</span>`)
      .join('');

    document.getElementById('modal-body').innerHTML = `
      <div class="detail-modal__header">
        <div class="detail-modal__price">$${listing.price.toLocaleString()}<span class="detail-modal__price-period">/mo</span></div>
        <span class="detail-modal__type-badge">${listing.type}</span>
      </div>

      <h2 class="detail-modal__title">${listing.title}</h2>

      <div class="detail-modal__specs">
        <span>${bedLabel}</span>
        <span class="detail-modal__dot"></span>
        <span>${listing.bathrooms} ba</span>
        <span class="detail-modal__dot"></span>
        <span>${listing.sqft.toLocaleString()} sqft</span>
      </div>

      <div class="detail-modal__address">${listing.address}</div>

      <div class="detail-modal__section">
        <h3 class="detail-modal__section-title">Description</h3>
        <p class="detail-modal__desc">${listing.description}</p>
      </div>

      <div class="detail-modal__section">
        <h3 class="detail-modal__section-title">Amenities</h3>
        <div class="detail-modal__tags">${allAmenities}</div>
      </div>

      <div class="detail-modal__section">
        <h3 class="detail-modal__section-title">Details</h3>
        <div class="detail-modal__details">
          <div class="detail-modal__detail-row">
            <span class="detail-modal__detail-label">Available</span>
            <span class="detail-modal__detail-value">${listing.available}</span>
          </div>
          <div class="detail-modal__detail-row">
            <span class="detail-modal__detail-label">Distance from ${listing._targetName || 'CSUN'}</span>
            <span class="detail-modal__detail-value">${listing._distanceMi != null ? listing._distanceMi.toFixed(1) + ' mi' : listing.distanceFromCSUN}</span>
          </div>
          <div class="detail-modal__detail-row">
            <span class="detail-modal__detail-label">Property Type</span>
            <span class="detail-modal__detail-value">${listing.type}</span>
          </div>
          <div class="detail-modal__detail-row">
            <span class="detail-modal__detail-label">Square Footage</span>
            <span class="detail-modal__detail-value">${listing.sqft.toLocaleString()} sqft</span>
          </div>
        </div>
      </div>

      <div class="detail-modal__section">
        <h3 class="detail-modal__section-title">Posted By</h3>
        <div class="detail-modal__owner">
          <div class="detail-modal__owner-avatar">${listing.owner.name.charAt(0)}</div>
          <div class="detail-modal__owner-info">
            <div class="detail-modal__owner-name">
              ${listing.owner.name}
              ${listing.owner.verified ? '<span class="detail-modal__verified">&#10003; Verified</span>' : ''}
            </div>
            <div class="detail-modal__owner-role">Property Owner</div>
          </div>
        </div>
      </div>
    `;
  }

  _updateSlide() {
    const slide = this._slides[this._currentSlide];
    const slideEl = document.getElementById('modal-slide');
    slideEl.style.background = slide.gradient !== 'none'
      ? `${slide.gradient}, ${slide.color}`
      : slide.color;

    document.getElementById('modal-counter').textContent =
      `${this._currentSlide + 1} / ${this._slides.length}`;
    document.getElementById('modal-label').textContent = slide.label;
  }

  // ── Events ──────────────────────────────────────────

  _bindEvents() {
    // Close
    document.getElementById('modal-close').addEventListener('click', () => this.close());
    document.getElementById('modal-backdrop').addEventListener('click', () => this.close());

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    // Gallery arrows
    document.getElementById('modal-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      this._currentSlide = (this._currentSlide - 1 + this._slides.length) % this._slides.length;
      this._updateSlide();
    });
    document.getElementById('modal-next').addEventListener('click', (e) => {
      e.stopPropagation();
      this._currentSlide = (this._currentSlide + 1) % this._slides.length;
      this._updateSlide();
    });

    // Keyboard gallery navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      if (e.key === 'ArrowLeft') {
        this._currentSlide = (this._currentSlide - 1 + this._slides.length) % this._slides.length;
        this._updateSlide();
      } else if (e.key === 'ArrowRight') {
        this._currentSlide = (this._currentSlide + 1) % this._slides.length;
        this._updateSlide();
      }
    });
  }
}
