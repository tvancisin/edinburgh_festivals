# Background map loading

Updated November 25, 2026.

The Leaflet map uses the existing MapLibre/OpenFreeMap background layer. Its
live style URL is `https://tiles.openfreemap.org/styles/positron`; the style
requests further resources, including `https://tiles.openfreemap.org/planet`.
These resources are requested at runtime, separately from the local festival
CSVs. There is no local download date or pinned provider export version.

`net::ERR_BLOCKED_BY_CLIENT` indicates that a browser-side client blocked a
request. Common causes include content-blocking extensions and browser privacy
features. Allowing `tiles.openfreemap.org` for this site in the relevant blocker
and reloading can restore the background. Connection and provider failures can
also prevent background resources from loading, with different browser errors.

`observeBaseMapLoad` in `baseMapLoad.ts` reports distinct loaded and error states.
The app requires a successful background-map load before showing Enter. An error
keeps the initial screen visible, leaves the map's loading-progress contribution
incomplete, and displays an explanation. A later `load` event does not override
an earlier resource error; some background resources may still be missing.
After correcting the blocker or connection, reload to attempt initialization
again. Listeners are removed when the component is destroyed.

The existing festival datasets, event selection, Leaflet event layers, fixed
calendar, and country summaries are prepared independently of background tiles,
but entering the app requires the background map to load successfully as well
as the other existing startup requirements. This handling does not change
providers or route around a browser block.
