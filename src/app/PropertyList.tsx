import { StatusBadge } from "../components/StatusBadge";
import type { PropertyWithItem } from "../lib/api";

interface PropertyListProps {
  properties: PropertyWithItem[];
  onSelectProperty?: (id: string) => void;
}

export function PropertyList({ properties, onSelectProperty }: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <div className="property-list" data-testid="property-list">
        <p className="empty-state">No properties yet. Refresh a source to see listings.</p>
      </div>
    );
  }

  return (
    <div className="property-list" data-testid="property-list">
      <table className="property-table">
        <thead>
          <tr>
            <th>Address</th>
            <th>Price</th>
            <th>Beds</th>
            <th>Baths</th>
            <th>Open Home</th>
            <th>Platform</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {properties.map(({ item, property }) => (
            <tr
              key={item.id}
              className={`property-row ${onSelectProperty ? "property-row-clickable" : ""}`}
              onClick={() => onSelectProperty?.(item.id)}
            >
              <td className="property-address">{item.address ?? property?.address ?? "Unknown"}</td>
              <td>{property?.price ?? "-"}</td>
              <td>{property?.bedrooms ?? "-"}</td>
              <td>{property?.bathrooms ?? "-"}</td>
              <td>
                {property?.openHomeTimes?.[0]
                  ? new Date(property.openHomeTimes[0]).toLocaleDateString()
                  : "-"}
              </td>
              <td>{property?.platform ?? "-"}</td>
              <td>
                {property && <StatusBadge status={property.watchStatus} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
