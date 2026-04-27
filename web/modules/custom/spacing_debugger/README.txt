Spacing Debugger
================

Spacing Debugger is a development-only Drupal module that helps visualize CSS
spacing directly on rendered pages. It draws a browser overlay for the CSS box
model so front-end styling issues are easier to inspect while building a site.

Features
--------

- Visualizes margin, padding, border, content, and flex/grid gap areas.
- Provides an on-page legend with per-layer visibility toggles.
- Supports a hover-only mode for inspecting one element at a time.
- Uses keyboard toggles so the overlay can be enabled only when needed.
- Stores the browser toggle state and display settings in localStorage.
- Loads assets only for users with the "use spacing debugger" permission.
- Does not provide configuration in the MVP; enable it only in local
  development environments, for example with Config Split.

Color Legend
------------

- Orange: margin.
- Green: padding.
- Blue: border.
- Light blue: content box.
- Purple: flex/grid gap.

Usage
-----

1. Enable the module.
2. Grant the "use spacing debugger" permission to the development role.
3. Visit a page while logged in as a permitted user.
4. Press Alt+C to show or hide the spacing overlay.
5. Use the on-page panel to toggle individual layers or enable Hover only.

The toggle state is saved per browser with the localStorage key
"spacingDebugger.enabled". Layer and hover-only settings are saved with
"spacingDebugger.settings".

Keyboard Shortcuts
------------------

- Alt+C: show or hide the spacing overlay.
- Alt+Shift+C: enable or disable hover-only mode.

Recommended Development Workflow
--------------------------------

This module should not be enabled in production. Keep it enabled only for local
or development environments. If Config Split is used, add spacing_debugger to a
local-only split so the module is not enabled in shared production
configuration.

Drush Example
-------------

Enable the module and clear caches:

  ddev drush en spacing_debugger -y
  ddev drush cr

After enabling the module, assign the permission from the Drupal permissions
page:

  /admin/people/permissions/module/spacing_debugger