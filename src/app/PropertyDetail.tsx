import { ItemCard } from "../components/ItemCard";
import { SourceLink } from "../components/SourceLink";
import { StatusBadge } from "../components/StatusBadge";
import type { PropertyDetail as PropertyDetailType } from "../lib/api";

interface PropertyDetailProps {
  detail: PropertyDetailType;
  onBack?: () => void;
}

export function PropertyDetail({ detail, onBack }: PropertyDetailProps) {
  const { item, property, source, links, notes } = detail;

  return (
    <div className="property-detail" data-testid="property-detail">
      {onBack && (
        <button className="back-button" onClick={onBack}>
          ← Back to list
        </button>
      )}

      <header className="detail-header">
        <h2>{item.title}</h2>
        <div className="detail-badges">
          {item.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </header>

      {property?.imageUrl && (
        <section className="detail-hero">
          <img
            src={property.imageUrl}
            alt={item.title}
            className="property-hero-image"
            style={{ maxWidth: "100%", borderRadius: "8px" }}
          />
        </section>
      )}

      <section className="detail-fields">
        <dl>
          {item.address && (
            <>
              <dt>Address</dt>
              <dd>{item.address}</dd>
            </>
          )}
          {item.area && (
            <>
              <dt>Area</dt>
              <dd>{item.area}</dd>
            </>
          )}
          {property?.price && (
            <>
              <dt>Price</dt>
              <dd>{property.price}</dd>
            </>
          )}
          {property?.bedrooms != null && (
            <>
              <dt>Bedrooms</dt>
              <dd>{property.bedrooms}</dd>
            </>
          )}
          {property?.bathrooms != null && (
            <>
              <dt>Bathrooms</dt>
              <dd>{property.bathrooms}</dd>
            </>
          )}
          {property?.parking != null && (
            <>
              <dt>Parking</dt>
              <dd>{property.parking}</dd>
            </>
          )}
          {property?.landArea != null && (
            <>
              <dt>Land Area</dt>
              <dd>{property.landArea} m²</dd>
            </>
          )}
          {property?.floorArea != null && (
            <>
              <dt>Floor Area</dt>
              <dd>{property.floorArea} m²</dd>
            </>
          )}
          {property?.suburb && (
            <>
              <dt>Suburb</dt>
              <dd>{property.suburb}</dd>
            </>
          )}
          {property?.platform && (
            <>
              <dt>Platform</dt>
              <dd>{property.platform}</dd>
            </>
          )}
          {property?.listedAt && (
            <>
              <dt>Listed</dt>
              <dd>{new Date(property.listedAt).toLocaleDateString()}</dd>
            </>
          )}
          {property?.watchStatus && (
            <>
              <dt>Watch Status</dt>
              <dd><StatusBadge status={property.watchStatus} /></dd>
            </>
          )}
          {property?.estimatedValueLow != null && (
            <>
              <dt>HomesEstimate</dt>
              <dd>
                ${property.estimatedValueLow.toLocaleString()} – $
                {property.estimatedValueHigh?.toLocaleString()}
                {property.estimatedValueDate && (
                  <> (as of {new Date(property.estimatedValueDate).toLocaleDateString()})</>
                )}
              </dd>
            </>
          )}
          {property?.capitalValue != null && (
            <>
              <dt>CV</dt>
              <dd>
                ${property.capitalValue.toLocaleString()}
                {property.cvDate && (
                  <> (as of {new Date(property.cvDate).toLocaleDateString()})</>
                )}
              </dd>
            </>
          )}
          {property?.landValue != null && (
            <>
              <dt>Land Value</dt>
              <dd>${property.landValue.toLocaleString()}</dd>
            </>
          )}
          {property?.improvementValue != null && (
            <>
              <dt>Improvement Value</dt>
              <dd>${property.improvementValue.toLocaleString()}</dd>
            </>
          )}
          {property?.estimatedRentalLow != null && (
            <>
              <dt>Rental Estimate</dt>
              <dd>
                ${property.estimatedRentalLow} – ${property.estimatedRentalHigh}/wk
                {property.estimatedRentalYield && <> ({property.estimatedRentalYield} yield)</>}
              </dd>
            </>
          )}
          {property?.decadeBuilt && (
            <>
              <dt>Decade Built</dt>
              <dd>{property.decadeBuilt}</dd>
            </>
          )}
          {property?.contour && (
            <>
              <dt>Contour</dt>
              <dd>{property.contour}</dd>
            </>
          )}
          {property?.ownershipType && (
            <>
              <dt>Ownership</dt>
              <dd>{property.ownershipType}</dd>
            </>
          )}
          {property?.legalDescription && (
            <>
              <dt>Legal Description</dt>
              <dd>{property.legalDescription}</dd>
            </>
          )}
          {property?.certificateOfTitle && (
            <>
              <dt>Title</dt>
              <dd>{property.certificateOfTitle}</dd>
            </>
          )}
        </dl>
      </section>

      {property?.openHomeTimes && property.openHomeTimes.length > 0 && (
        <section className="detail-section">
          <h3>Open Homes</h3>
          <ul className="open-home-list">
            {property.openHomeTimes.map((time) => (
              <li key={time}>
                {new Date(time).toLocaleString()}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="detail-section">
        <h3>Source</h3>
        <div className="source-link-group">
          {item.sourceUrl && (
            <SourceLink name="Original listing" url={item.sourceUrl} />
          )}
          {source && <SourceLink name={source.name} url={source.url} />}
        </div>
      </section>

      {notes.length > 0 && (
        <section className="detail-section">
          <h3>Notes</h3>
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
        <section className="detail-section">
          <h3>Linked Items</h3>
          <p>{links.length} link(s) found</p>
        </section>
      )}
    </div>
  );
}
