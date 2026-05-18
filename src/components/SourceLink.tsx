interface SourceLinkProps {
  name: string;
  url: string;
}

export function SourceLink({ name, url }: SourceLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="source-link"
    >
      {name}
    </a>
  );
}
