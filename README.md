# QTPI - Quest Tree Progression Interface

See `qtpi_overview.md` for the full spec, decisions, and development plan.

## Scripts

- `npm run dev` - start the dev server
- `npm run build` - typecheck and build for production
- `npm test` - run the test suite (Vitest)
- `npm run lint` - run ESLint

## Deployment

QTPI is a static site (no backend) and is set up to deploy to GitHub Pages via `.github/workflows/deploy.yml`, which builds and publishes `dist/` on every push to `main`. To turn it on for a given GitHub repo:

1. Push this repo to GitHub.
2. In the repo's Settings > Pages, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the "Deploy to GitHub Pages" workflow manually from the Actions tab) - the site will be published at `https://<user>.github.io/<repo>/`.

`vite.config.ts` uses a relative `base` so the build works from any subpath without repo-specific configuration.
