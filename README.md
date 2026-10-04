# Milind Saxena · portfolio site

A single-page portfolio in plain HTML and CSS: no framework or build step. It has light and dark themes and works on phones.

## Publish on GitHub Pages

1. Create a public repository named `<your-username>.github.io` and push this folder's contents to its `main` branch.
2. On GitHub, go to **Settings → Pages**, set **Source: Deploy from a branch** and **Branch: main / (root)**.
3. The site goes live at `https://<your-username>.github.io` within a minute or two.

## Before publishing

- [ ] Replace every `GITHUB_USERNAME` in `index.html` with the real username.
- [ ] Add the résumé as `assets/Milind_Saxena_Resume.pdf`.
- [ ] Optional: add the Power BI dashboard screenshot to the UPI project card.

## Editing

- Content: `index.html`, with one `<article class="project">` per project.
- Colors and fonts: the tokens at the top of `styles.css`, with light and dark values.
- Project images: `assets/*.webp`, exported from each project's `images/` folder at 1600px wide.
