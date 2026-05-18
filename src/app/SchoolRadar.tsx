import { StatusBadge } from "../components/StatusBadge";
import type { SchoolWithEvents } from "../lib/api";

interface SchoolRadarProps {
  schools: SchoolWithEvents[];
}

export function SchoolRadar({ schools }: SchoolRadarProps) {
  if (schools.length === 0) {
    return (
      <div className="school-radar" data-testid="school-radar">
        <p className="empty-state">No schools tracked yet.</p>
      </div>
    );
  }

  return (
    <div className="school-radar" data-testid="school-radar">
      <div className="school-grid">
        {schools.map(({ school, events }) => (
          <article key={school.id} className="school-card">
            <h3>{school.name}</h3>
            <dl className="school-fields">
              <dt>Type</dt>
              <dd>{school.schoolType} ({school.years})</dd>
              <dt>Gender</dt>
              <dd>{school.gender}</dd>
              <dt>Authority</dt>
              <dd>{school.authority}</dd>
              {school.hasZone !== null && (
                <>
                  <dt>Zone</dt>
                  <dd>{school.hasZone ? "Has zone" : "No zone"}</dd>
                </>
              )}
              <dt>Area</dt>
              <dd>{school.area}</dd>
              {school.commuteFromParaparaumu && (
                <>
                  <dt>Commute</dt>
                  <dd>{school.commuteFromParaparaumu}</dd>
                </>
              )}
              <dt>Status</dt>
              <dd>
                <StatusBadge status={school.watchStatus} />
              </dd>
            </dl>
            {school.website && (
              <a
                href={school.website}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link"
              >
                Website
              </a>
            )}
            {events.length > 0 && (
              <section className="school-events">
                <h4>Events ({events.length})</h4>
                <ul>
                  {events.map((event) => (
                    <li key={event.id}>
                      <span className="event-type">{event.eventType.replace(/_/g, " ")}</span>
                      {event.startsAt && (
                        <time dateTime={event.startsAt}>
                          {" "}
                          {new Date(event.startsAt).toLocaleDateString()}
                        </time>
                      )}
                      {event.deadline && (
                        <span className="event-deadline">
                          {" "}
                          Deadline: {new Date(event.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {event.enrolmentYear && (
                        <span> (Enrolment {event.enrolmentYear})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
