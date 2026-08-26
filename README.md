# April Gong Portfolio

This is a responsive, single-page portfolio built with plain HTML, CSS, and a
small amount of JavaScript. Keeping the stack simple makes it easy to maintain
and add new projects throughout the semester.

## How it works

- `index.html` contains the semantic page structure and all portfolio content.
- `styles.css` uses CSS variables, a responsive grid, and a mobile breakpoint.
- `scripts.js` powers the accessible light/dark theme toggle and remembers the
  selected theme in the browser.
- `assets/` contains all site images, so project visuals do not rely on external
  image hosts at runtime.

## AI usage

An AI coding assistant helped draft the initial HTML, CSS, and dark-mode toggle.
April supplied the content and assets, selected the projects, and directed the
revisions. Inline comments in `index.html` and `scripts.js` identify this use.

## Image and text credits

- Header photo: supplied by April Gong.
- Bobtutor photo: [bobtutor.org](https://bobtutor.org/).
- Game artwork: [April Gong’s itch.io page](https://aprilg.itch.io/).
- Organization descriptions: [ACF](https://acfpcc.org/),
  [IFA](https://cmuifa.com/), and [CMIMC](https://cmimc.math.cmu.edu/).

## GitHub Pages deployment

The intended live URL is https://agongster.github.io/. A deployment workflow is
included in `.github/workflows/deploy-pages.yml`. After pushing to `main`, open
the repository’s **Settings → Pages** and select **GitHub Actions** as the build
and deployment source. GitHub will then publish the site at the URL above.
