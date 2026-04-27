# Codex Test Theme

Codex Test Theme is a custom Drupal 10.3+/11 theme built for local frontend testing. The visual direction is modern editorial meets digital agency: sharp typography, hard ink rules, acid-green/cobalt/coral accents, responsive spacing, and progressive enhancement for motion and mobile navigation.

## Install

From the project root:

```bash
ddev drush theme:enable codex_test_theme
ddev drush config:set system.theme default codex_test_theme -y
ddev drush cr
```

You can also enable it from **Appearance** in the Drupal admin UI.

## Structure

- `codex_test_theme.info.yml` declares Drupal compatibility, regions, and global libraries.
- `codex_test_theme.libraries.yml` loads the CSS layers and progressive JavaScript through Drupal's asset library system.
- `codex_test_theme.breakpoints.yml` defines mobile, tablet, desktop, and wide breakpoints for responsive image and layout integrations.
- `codex_test_theme.theme` keeps reusable presentation variables out of Twig.
- `templates/` contains overrides for the HTML shell, page layout, nodes, and blocks.
- `scss/` is the source stylesheet structure, with shared variables and mixins in `scss/abstracts/`.
- `css/` contains the compiled Drupal library assets.
- `js/theme.js` enhances the mobile menu and reveal animation without requiring jQuery.

## SCSS Development

Install the local theme tooling once:

```bash
ddev npm --prefix web/themes/custom/codex_test_theme install
```

Build compiled CSS:

```bash
ddev npm --prefix web/themes/custom/codex_test_theme run build:css
```

Watch during development:

```bash
ddev npm --prefix web/themes/custom/codex_test_theme run watch:css
```

## Development Notes

This theme uses `stable9` as its base theme for Drupal 10.3+ and Drupal 11 compatibility. Clear Drupal caches after template, library, or preprocess changes:

```bash
ddev drush cr
```

For Twig debugging in local development, copy `web/sites/default/default.services.yml` to `web/sites/default/services.yml`, enable Twig debug settings, and clear caches.
