# AGENTS.md

Repo-specific guidance for OpenCode sessions working on this Next.js blog.

## Commands

- Install: `pnpm install` (README uses pnpm; a `pnpm-lock.yaml` is present)
- Dev: `pnpm dev` → http://localhost:3000 (note: `basePath` is `/MyBlog`, see below)
- Build: `pnpm build` → static export in `out/`
- Lint: `pnpm lint` (runs `next lint`, ESLint `next/core-web-vitals` + `next/typescript`)
- No test suite exists — there is no `test` script and no test framework configured.

Lockfile: only `pnpm-lock.yaml` is used (`package-lock.json` was removed). The CI workflow (`.github/workflows/nextjs.yml`) installs with `pnpm install --frozen-lockfile` (pnpm v9 via `pnpm/action-setup`). Keep the lockfile in sync when adding dependencies — run `pnpm install` locally after editing `package.json`, and do **not** commit a pnpm-v11–generated `pnpm-workspace.yaml` (it lacks a `packages` field and breaks pnpm v9's frozen install).

## Architecture

Static-export Next.js 14 App Router blog hosted on GitHub Pages.

- `next.config.js`: `output: 'export'`, `basePath: '/MyBlog'`, `assetPrefix: '/MyBlog/'`, images unoptimized. **All internal links and asset paths must account for the `/MyBlog` basePath.** Use `next/link` (auto-prefixes) rather than raw `<a href="/...">`.
- Content is file-based (no DB, no CMS). Markdown files live in `content/`:
  - `content/posts/` — filenames **must** match `YYYY-MM-DD-<slug>.md`; the full `${date}-${slug}` becomes the URL (`/posts/YYYY-MM-DD-<slug>`). Enforced by regex in `src/lib/markdown.ts:74` — invalid names throw at request time, not build time.
  - `content/project/` — `index.md` is the entry.
  - `content/about.md`
- Markdown rendering pipeline (`src/lib/markdown.ts`): remark-parse → `remarkQQMusic` (custom, `[qqmusic:<id>]` tag) → remark-math → remark-gfm → remark-rehype (`allowDangerousHtml: true`) → rehype-prism-plus (line numbers, ignoring missing languages) → **rehypeStripBasePath / rehypeRestoreBasePath (custom)** around rehype-img-size → rehype-katex → rehype-stringify. HTML in posts is passed through.
- **Markdown images**: raw markdown `<img>` is emitted via `dangerouslySetInnerHTML`, so Next does **not** auto-prefix `basePath`. Write image src as `/images/xxx.png` (relative to `public/`); the custom strip/restore plugins let `rehype-img-size` read the file from `public/` for dimensions and then prepend `/MyBlog` to the emitted src. Don't hand-write `/MyBlog/...` and don't use relative paths.
- Site/personal config including `siteUrl` lives in `src/config/self.config.ts`. Change author/url here, not in layout.
- `@/*` path alias → `./src/*` (`tsconfig.json`). Tailwind `darkMode: 'class'` with `@tailwindcss/typography` for prose; custom dark prose palette in `tailwind.config.ts`.

## Conventions

- Named post frontmatter: `title`, `tags`. `tags` may be a YAML list or a single string split on commas/whitespace (`parseTags` in `markdown.ts`).
- Chinese-language content and UI; commit messages / docs are mixed zh/en. Match surrounding tone.
- Adding a new post: drop a `<YYYY-MM-DD>-<slug>.md` file in `content/posts/` with frontmatter and body — no registration step. Sorting is by date descending.

## Deploy

Pushes to `main` trigger `.github/workflows/nextjs.yml`: `pnpm install --frozen-lockfile` → `pnpm next build` → creates `out/.nojekyll` → upload → GitHub Pages. No manual deploy step.