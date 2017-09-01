`abc2svg-1.js`, `abcemb-1.js`, and `play-1.js` in this folder were obtained from the [Jeff Moines' site](http://moinejf.free.fr/js/).
These javascripts are used to render ABC in xhtml files.  See http://moinejf.free.fr/abcm2ps-doc/au_clair.xhtml for an example and template.

The following descriptions are from [abc2svg site](https://github.com/moinejf/abc2svg) at GitHub.

- `abc2svg-1.js`
  This script is the **abc2svg** core.  
  It contains the ABC parser and the SVG generation engine.  
  It must be included in the (X)HTML header of the pages
  where ABC rendering is needed (in `<script src=` tags).
- `abcemb-1.js`
  This script is to be used in (X)HTML pages with the core.  
  It replaces the ABC sequences by SVG images of the music
  (the ABC sequences start on `X:` or `%abc` at start of line,
  and stop on any ML tag).  
  See the
  [%%beginml documentation](http://moinejf.free.fr/abcm2ps-doc/beginml.xhtml)
  for an example.
- `play-1.js`
  This script may be used with `abcemb-1.js` for playing the
  rendered ABC music.  
  See [this page](http://moinejf.free.fr/abcm2ps-doc/au_clair.xhtml)
  for an example.
