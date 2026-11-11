# Reza Saadati Fard — personal website

A single-page site built with plain HTML, CSS and JavaScript. No build step,
no framework: upload the folder anywhere that serves static files.

```
index.html                       all page content
css/styles.css                   layout, type and colors (light + dark mode)
js/game.js                       "Career run", the jumping game in the hero
js/sky.js                        the dithered cloud background at the top
js/main.js                       side navigation highlight, local clock, timeline scroll
blog/index.html                  the blog page (lists every post)
blog/posts.js                    the list of posts: edit this to publish one
blog/blog.js                     draws the table of posts on the blog page
blog/posts/_template.html        copy this to start a new post
blog/posts/jev-vs-llms.html      first post
assets/Reza-Saadati-Fard-CV.pdf  the CV behind every "Download CV" link
assets/favicon.svg               browser tab icon (plus favicon-32.png and
                                 apple-touch-icon.png for older browsers and phones)
assets/logos/web/                logos used in the game backgrounds and next to your roles
.nojekyll                        tells GitHub Pages to serve files as-is
```

## Preview it

Double-click `index.html`. It opens in your browser. Fonts load from Google
Fonts, so you need to be online for the page to look right.

## Before you publish

- [ ] Replace `assets/Reza-Saadati-Fard-CV.pdf` with a CV that includes the
      Centific internship (keep the same file name so the links keep working).
- [ ] In `index.html`, search for `Healthcare AI research at a company` and
      describe what you work on at Centific (one or two lines, nothing
      confidential).
- [ ] In `index.html`, search for `LinkedIn`, paste your profile URL and remove
      the `<!--` and `-->` lines around it.
- [ ] Delete `js/tissue.js` if it is still in the folder; the page no longer
      uses it.
- [ ] Logos. The site uses small web copies in `assets/logos/web`: colour
      versions for the Centific and WPI tiles at the top (`centific.png`,
      `wpi-seal.png`) and faded watermark versions for the game backgrounds
      (Chamran, Isfahan University of Technology, Ortho BioMed, the WPI goat,
      Centific). The large originals in `assets/logos` are not used by the
      page; keep them as source files or leave them out when you upload. Vesis
      is shown as a pixel developer icon with its name.

## Add a blog post

1. Copy `blog/posts/_template.html` and rename the copy, for example
   `blog/posts/vlms-for-wound-care.html` (lowercase, hyphens, no spaces).
2. Open it and replace everything marked `TODO`: the title (it appears three
   times at the top), the summary, the date and the post itself. Write the post
   with plain tags: `<h2>` for headings, `<p>` for paragraphs, `<ul><li>` for
   lists, `<a href="...">` for links.
3. Open `blog/posts.js` and add an entry at the top of the list:

   ```js
   {
     title: 'Your post title',
     url: 'posts/vlms-for-wound-care.html',
     date: '2026-11-15',
     readingTime: '5 min read',
     summary: 'One or two sentences that make people want to read it.'
   },
   ```

The blog page lists every post in a table, newest first. Visitors reach it from
the Blog link in the top menu and the left panel. Nothing else needs to change.

## Put it online with GitHub Pages (free)

You already have a GitHub account (`reza-sf9`), so this is the quickest route.

1. On GitHub, create a new **public** repository named exactly
   `reza-sf9.github.io`.
2. Click **Add file → Upload files**, drag in everything in this folder
   (including the `css`, `js` and `assets` folders), and commit.
3. Go to **Settings → Pages**. Under *Build and deployment*, choose
   **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute or two the site is live at **https://reza-sf9.github.io**.

To update the site later, upload the changed files to the same repository.

## Use your own domain (optional, about $10–15 a year)

A name like `rezasaadatifard.com` or `saadatifard.com` looks better on a CV and
in an email signature than a github.io address.

1. Buy the domain from a registrar such as Cloudflare Registrar, Porkbun or
   Namecheap.
2. In the GitHub repository, go to **Settings → Pages → Custom domain**, type
   the domain and save. GitHub adds a `CNAME` file to the repository.
3. At the registrar, add these DNS records:

   | Type  | Name | Value                |
   |-------|------|----------------------|
   | A     | @    | 185.199.108.153      |
   | A     | @    | 185.199.109.153      |
   | A     | @    | 185.199.110.153      |
   | A     | @    | 185.199.111.153      |
   | CNAME | www  | reza-sf9.github.io   |

4. Wait for DNS to update (minutes to a few hours), then tick
   **Enforce HTTPS** in the Pages settings.

Other hosts that work with this folder unchanged: Netlify (drag the folder onto
app.netlify.com/drop), Cloudflare Pages and Vercel.

## Notes on the design

- Light mode takes its colors from an H&E-stained tissue slide; dark mode from
  a fluorescence image. The page follows the visitor's system setting.
- Type is Atkinson Hyperlegible Next and Mono, typefaces designed by the
  Braille Institute for low-vision readers.
- The game only moves after a visitor presses Start, and pauses itself when it
  scrolls off screen or the tab is hidden. Space, the up arrow or a tap jumps;
  holding jumps higher.
- To change the game's stages, obstacles or jokes, edit the `MILESTONES` and
  `ERAS` lists at the top of `js/game.js`.
- The top of the homepage sits on dithered pixel clouds in the site's pink,
  purple and blue, drawn by `js/sky.js`. Text on the clouds gets a solid chip
  so it stays readable. The retro "New on the blog" window always shows the
  newest post from `blog/posts.js`.
- The left panel lists every section and highlights the one on screen; on
  phones it turns into a sticky bar of links at the top.
