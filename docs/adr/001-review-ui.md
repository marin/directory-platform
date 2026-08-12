# Review UI write mechanism

## Decision

Use a loopback-only Node HTTP server (`127.0.0.1:3847`) for the review UI.

## Rationale

Static HTML opened from disk cannot write approval files. A localhost-bound server with CSRF tokens and path traversal checks provides write capability without becoming a general application server.
