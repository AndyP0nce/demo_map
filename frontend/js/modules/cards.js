/**
 * cards.js
 * ---------------------------------------------------
 * Renders listing cards inside the sidebar panel.
 *
 * Responsibilities:
 *   - Build a Zillow-style card for each listing
 *   - Re-render whenever the map viewport changes
 *     (only cards for visible markers are shown)
 *   - Highlight / scroll-to a card when its map marker is hovered
 *   - Expose hover & click callbacks so app.js can sync the map
 *
 * BEM-style class names (listing-card, listing-card__body, etc.)
 * keep the markup easy to restyle or port to another project.
 * ---------------------------------------------------
 */

export class CardRenderer {
  /**
   * @param {string} containerId – id of the scrollable list wrapper
   * @param {string} countId     – id of the element showing "X Rentals"
   */
  constructor(containerId, countId) {
    this.container = document.getElementById(containerId);
    this.countEl = document.getElementById(countId);

    this._onCardHover = null;
    this._onCardClick = null;
    this.activeCardId = null;
  }

  // ── Render ─────────────────────────────────────────

  /**
   * Replace all cards with a new set (called on every map bounds change).
   * @param {Array} listings – only the listings visible on the map
   */
  render(listings) {
    // Update the header count
    this.countEl.textContent = `${listings.length} Rental${listings.length !== 1 ? 's' : ''}`;

    // Clear old cards
    this.container.innerHTML = '';

    if (listings.length === 0) {
      this.container.innerHTML =
        '<p class="listings-panel__empty">No listings in this area. Try zooming out or panning the map.</p>';
      return;
    }

    // Sort cheapest first (like Zillow default)
    const sorted = [...listings].sort((a, b) => a.price - b.price);

    sorted.forEach((listing) => {
      this.container.appendChild(this._createCard(listing));
    });
  }

  // ── Card builder ───────────────────────────────────

  /**
   * Build one card element for a listing.
   * Layout mirrors Zillow:
   *   [ colored image placeholder ]
   *   [ price + type badge        ]
   *   [ bed / bath / sqft         ]
   *   [ address                   ]
   *   [ description (2-line clip) ]
   *   [ amenity tags              ]
   *   [ owner name | distance     ]
   */
  _createCard(listing) {
    const card = document.createElement('div');
    card.className = 'listing-card';
    card.dataset.listingId = listing.id;

    const bedLabel = listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bd`;

    const amenityHTML = listing.amenities
      .slice(0, 3)
      .map((a) => `<span class="listing-card__amenity">${a}</span>`)
      .join('');

    card.innerHTML = `
      <div class="listing-card__img" style="background:${listing.imageColor};">
        <span class="listing-card__price">$${listing.price.toLocaleString()}/mo</span>
        <span class="listing-card__type">${listing.type}</span>
      </div>
      <div class="listing-card__body">
        <div class="listing-card__title">${listing.title}</div>
        <div class="listing-card__specs">
          ${bedLabel} | ${listing.bathrooms} ba | ${listing.sqft.toLocaleString()} sqft
        </div>
        <div class="listing-card__address">${listing.address}</div>
        <div class="listing-card__desc">${listing.description}</div>
        <div class="listing-card__amenities">${amenityHTML}</div>
        <div class="listing-card__meta">
          <span class="listing-card__available">Available ${listing.available}</span>
        </div>
        <div class="listing-card__footer">
          <span class="listing-card__owner">
            ${listing.owner.name}
            ${listing.owner.verified ? '<span class="listing-card__verified">&#10003; Verified</span>' : ''}
          </span>
          <span class="listing-card__distance">${listing.distanceFromCSUN} from CSUN</span>
        </div>
      </div>`;

    // ── Card events ──
    card.addEventListener('mouseenter', () => {
      if (this._onCardHover) this._onCardHover(listing.id, true);
    });
    card.addEventListener('mouseleave', () => {
      if (this._onCardHover) this._onCardHover(listing.id, false);
    });
    card.addEventListener('click', () => {
      if (this._onCardClick) this._onCardClick(listing.id);
    });

    return card;
  }

  // ── Highlight ──────────────────────────────────────

  /** Highlight a card and scroll it into view (marker hover → card). */
  highlightCard(listingId) {
    this.clearHighlight();
    const card = this.container.querySelector(`[data-listing-id="${listingId}"]`);
    if (card) {
      card.classList.add('listing-card--active');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      this.activeCardId = listingId;
    }
  }

  /** Remove highlight from the current card. */
  clearHighlight() {
    if (this.activeCardId !== null) {
      const card = this.container.querySelector(`[data-listing-id="${this.activeCardId}"]`);
      if (card) card.classList.remove('listing-card--active');
      this.activeCardId = null;
    }
  }

  // ── Event registration ─────────────────────────────

  onCardHover(cb) {
    this._onCardHover = cb;
  }
  onCardClick(cb) {
    this._onCardClick = cb;
  }
}
