let nextId = 0;

// IDs for client-side form rows and AI session entries. These never serve as
// authentication tokens or database IDs, and work on an HTTP S3 website.
export function createUiId(): string {
  nextId += 1;
  return `spoonful-ui-${nextId}`;
}
