export function SkipLink({ target = "main-content" }: { target?: string }) {
  return <a className="skipLink" href={`#${target}`}>Skip to main content</a>;
}
