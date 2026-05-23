import { SourceLink } from "../components/SourceLink";
import { StatusBadge } from "../components/StatusBadge";
import type { PropertyDetail as PropertyDetailType } from "../lib/api";

interface PropertyDetailProps {
  detail: PropertyDetailType;
  onBack?: () => void;
}

export function PropertyDetail({ detail, onBack }: PropertyDetailProps) {
  const { item, property, source, links, notes } = detail;

  const hasFinancials =
    property?.estimatedValueLow != null ||
    property?.capitalValue != null ||
    property?.estimatedRentalLow != null;

  const hasSpecs =
    property?.bedrooms != null ||
    property?.bathrooms != null ||
    property?.parking != null ||
    property?.landArea != null ||
    property?.floorArea != null;

  const hasCouncil =
    property?.decadeBuilt ||
    property?.contour ||
    property?.ownershipType ||
    property?.legalDescription ||
    property?.certificateOfTitle;

  return (
    <div className="property-detail" data-testid="property-detail">
      {onBack && (
        <button className="back-button" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3L5 7l4 4" />
          </svg>
          Back to list
        </button>
      )}

      {property?.imageUrl ? (
        <div className="detail-hero">
          <img
            src={property.imageUrl}
            alt={item.title}
            className="detail-hero-image"
          />
          <div className="detail-hero-overlay">
            <h2 className="detail-hero-title">{item.title}</h2>
            {item.address && (
              <p className="detail-hero-address">{item.address}</p>
            )}
          </div>
        </div>
      ) : (
        <header className="detail-header">
          <h2>{item.title}</h2>
          {item.address && <p className="detail-header-address">{item.address}</p>}
        </header>
      )}

      <div className="detail-badges">
        {property?.watchStatus && <StatusBadge status={property.watchStatus} />}
        {property?.platform && <span className="detail-platform">{property.platform}</span>}
        {item.tags.filter(t => t !== "needs_manual_address_check").map((tag) => (
          <span key={tag} className="tag">{tag.replace(/_/g, " ")}</span>
        ))}
      </div>

      {hasSpecs && property && (
        <div className="detail-specs">
          {property.bedrooms != null && (
            <div className="spec-chip">
              <span className="spec-value">{property.bedrooms}</span>
              <span className="spec-label">Beds</span>
            </div>
          )}
          {property.bathrooms != null && (
            <div className="spec-chip">
              <span className="spec-value">{property.bathrooms}</span>
              <span className="spec-label">Baths</span>
            </div>
          )}
          {property.parking != null && (
            <div className="spec-chip">
              <span className="spec-value">{property.parking}</span>
              <span className="spec-label">Park</span>
            </div>
          )}
          {property.landArea != null && (
            <div className="spec-chip">
              <span className="spec-value">{property.landArea}</span>
              <span className="spec-label">m² land</span>
            </div>
          )}
          {property.floorArea != null && (
            <div className="spec-chip">
              <span className="spec-value">{property.floorArea}</span>
              <span className="spec-label">m² floor</span>
            </div>
          )}
        </div>
      )}

      {property?.price && (
        <div className="detail-price-block">
          <span className="detail-price">{property.price}</span>
          {property.listedAt && (
            <span className="detail-listed">
              Listed {new Date(property.listedAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      )}

      {hasFinancials && property && (
        <section className="detail-card">
          <h3 className="detail-card-title">Valuation & Returns</h3>
          <div className="detail-card-grid">
            {property.estimatedValueLow != null && (
              <div className="financial-item">
                <span className="financial-label">HomesEstimate</span>
                <span className="financial-value">
                  ${property.estimatedValueLow.toLocaleString()} – ${property.estimatedValueHigh?.toLocaleString()}
                </span>
                {property.estimatedValueDate && (
                  <span className="financial-date">
                    {new Date(property.estimatedValueDate).toLocaleDateString("en-NZ", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            )}
            {property.capitalValue != null && (
              <div className="financial-item">
                <span className="financial-label">Capital Value</span>
                <span className="financial-value">${property.capitalValue.toLocaleString()}</span>
                {property.cvDate && (
                  <span className="financial-date">
                    {new Date(property.cvDate).toLocaleDateString("en-NZ", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            )}
            {property.landValue != null && (
              <div className="financial-item">
                <span className="financial-label">Land Value</span>
                <span className="financial-value">${property.landValue.toLocaleString()}</span>
              </div>
            )}
            {property.improvementValue != null && (
              <div className="financial-item">
                <span className="financial-label">Improvement</span>
                <span className="financial-value">${property.improvementValue.toLocaleString()}</span>
              </div>
            )}
            {property.estimatedRentalLow != null && (
              <div className="financial-item">
                <span className="financial-label">Rental Est.</span>
                <span className="financial-value">
                  ${property.estimatedRentalLow} – ${property.estimatedRentalHigh}/wk
                </span>
                {property.estimatedRentalYield && (
                  <span className="financial-date">{property.estimatedRentalYield} yield</span>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {item.address && (
        <section className="detail-card detail-map">
          <iframe
            title="Property location"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(`${item.address}, ${property?.suburb ?? item.area ?? ""}, New Zealand`)}&output=embed&z=15`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </section>
      )}

      {hasCouncil && property && (
        <section className="detail-card">
          <h3 className="detail-card-title">Council & Property Data</h3>
          <div className="detail-card-grid">
            {property.decadeBuilt && (
              <div className="detail-field">
                <span className="detail-field-label">Decade Built</span>
                <span className="detail-field-value">{property.decadeBuilt}</span>
              </div>
            )}
            {property.contour && (
              <div className="detail-field">
                <span className="detail-field-label">Contour</span>
                <span className="detail-field-value">{property.contour}</span>
              </div>
            )}
            {property.ownershipType && (
              <div className="detail-field">
                <span className="detail-field-label">Ownership</span>
                <span className="detail-field-value">{property.ownershipType}</span>
              </div>
            )}
            {property.buildingConstruction && (
              <div className="detail-field">
                <span className="detail-field-label">Construction</span>
                <span className="detail-field-value">{property.buildingConstruction}</span>
              </div>
            )}
            {property.legalDescription && (
              <div className="detail-field detail-field--wide">
                <span className="detail-field-label">Legal Description</span>
                <span className="detail-field-value">{property.legalDescription}</span>
              </div>
            )}
            {property.certificateOfTitle && (
              <div className="detail-field">
                <span className="detail-field-label">Title</span>
                <span className="detail-field-value">{property.certificateOfTitle}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {property?.openHomeTimes && property.openHomeTimes.length > 0 && (
        <section className="detail-card">
          <h3 className="detail-card-title">Open Homes</h3>
          <div className="open-home-grid">
            {property.openHomeTimes.map((time) => {
              const d = new Date(time);
              return (
                <div key={time} className="open-home-chip">
                  <span className="open-home-day">
                    {d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  <span className="open-home-time">
                    {d.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="detail-card">
        <h3 className="detail-card-title">Source</h3>
        <div className="source-link-group">
          {item.sourceUrl && (
            <SourceLink name="Original listing" url={item.sourceUrl} />
          )}
          {source && <SourceLink name={source.name} url={source.url} />}
        </div>
      </section>

      {notes.length > 0 && (
        <section className="detail-card">
          <h3 className="detail-card-title">Notes</h3>
          {notes.map((note) => (
            <div key={note.id} className="note-card">
              <p>{note.body}</p>
              <time dateTime={note.createdAt}>
                {new Date(note.createdAt).toLocaleDateString()}
              </time>
            </div>
          ))}
        </section>
      )}

      {links.length > 0 && (
        <section className="detail-card">
          <h3 className="detail-card-title">Linked Items</h3>
          <p className="detail-muted">{links.length} link(s) found</p>
        </section>
      )}
    </div>
  );
}
