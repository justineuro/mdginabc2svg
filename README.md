# 



## mdginabc2svg.sh

[**mdginacb2svg.sh**](https://github.com/justineuro/mdginabc2svg) is a [Bash](https://www.gnu.org/software/bash/) script [(see Wikipedia:Bash_(Unix_shell)](https://en.wikipedia.org/wiki/Bash_%28Unix_shell%29) for more info) that can be used for creating an XHTML file containing the score of a particular [Musical Dice Game (MDG)](https://en.wikipedia.org/wiki/Musikalisches_W%C3%BCrfelspiel) minuet, generated based on the rules given in  [Musikalisches Würfelspiel, K.516f (Mozart, Wolfgang Amadeus)](http://imslp.org/wiki/Musikalisches_W%C3%BCrfelspiel,_K.516f_(Mozart,_Wolfgang_Amadeus)).  The generated XHTML file contains the musical score for an MDG written in [ABC](http://www.abcnotation.com) music notation and is rendered using [Jeff Moine's `abc2svg` javascripts (v. 1.13.6; 2017-08-08)](http://moinejf.free.fr/js/index.html).  To view the generated musical score, open it in a javascript-enabled web browser; to listen to the corresponding music, simply click (or tap, for mobiles) on the image of the musical score inside the browser (reload the page to prematurely stop).

This directory includes:

- [`mdginabc2svg.sh`](./mdginabc2svg.sh) - a Bash script for generating the MDG minuets corresponding to any sequence of 16 tosses of a pair of dice
- [`mdginac2svg-sm.sh`](./mdginabc2svg-sm.sh) - similar to `mdginabc2svg.sh` but smaller SVG images are created
- [`mdginac2svg-tab2.sh`](./mdginabc2svg-tab2.sh) - similar to `mdginabc2svg.sh` but coded with tabs of width 2 instead of 8 spaces
- [`samples`](./samples) - also accessible at [`samples`](https://justineuro.github.io/mdginabc2svg/samples/); a folder containing samples of generated MDG minuets as XHTML files and a sub-folder containing the needed javascripts for rendering the minuet written in ABC notation as SVG images
- [`res`](./res) - also accessible at [`res`](https://justineuro.github.io/mdginabc2svg/res/); a folder containing the measures of *Musikalisches Würfelspiel, K.516f* written in ABC notation and other related files 

To use the Bash script, at the command line type:

```
/path/to/mdginabc2svg.sh n1 n2 n3 n4 n5 n6 n7 n8 n9 n10 n11 n12 n13 n14 n15 n16
```
    
where `n1, n2, ..., n16` are any of the 11 possible outcomes of the toss of two ordinary six-sided dice, e.g., are 16 integers, not necessarily unique, chosen from the set {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}.  For example, if the script is located in the present working directory and each outcome of the 16 dice tosses was a 3:

```
./mdginabc2svg.sh 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3
```
The output will be the file `K516f-3-3-3-3-3-3-3-3-3-3-3-3-3-3-3-3.xhtml`, containing the score of the MDG minuet corresponding to the 16 outcomes given at the command line (all tosses came up a 3), and will be created under the current working directory.  Please see the [`samples`](./samples/index.md) folder in this directory for more sample XHTML files.

## Acknowledgements
My sincerest gratitude to Jeff Moine for [abcm2ps](http://moinejf.free.fr/), [abc2svg](http://moinejf.free.fr/js/index.html), and the accompanying useful javascripts, examples, templates, and pointers for the appropriate use of these resources. Guido Gonzato for the [ABC Plus Project](http://abcplus.sourceforge.net/) and the [abcmidi resources](http://abcplus.sourceforge.net/#abcMIDI) available there, more especially for the ABC resource book *Making Music with ABC 2*.  Special thanks also to the [International Music Score Library Project (IMSLP)](http://imslp.org/) for making available the score for *Musikalisches Würfelspiel, K.516f* and to Chris Walshaw et al. for the [ABC music notation](http://www.abcnotation.com).  Ditto to Machtelt Garrels for the book [Bash Guide for Beginners](http://tldp.org/LDP/Bash-Beginners-Guide/html/Bash-Beginners-Guide.html) and Vivek Gite for the book [Linux Script Shell Tutorial](http://www.freeos.com/guides/lsst/).

## License
<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/80x15.png" /></a><br /><span xmlns:dct="http://purl.org/dc/terms/" property="dct:title"><b>mdginabc2svg</b></span> by <a xmlns:cc="http://creativecommons.org/ns#" href="https://github.com/justineuro/mdginabc2svg" property="cc:attributionName" rel="cc:attributionURL">Justine Leon A. Uro</a> is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.<br />Based on a work at <a xmlns:dct="http://purl.org/dc/terms/" href="https://github.com/justineuro/mdginabc2svg" rel="dct:source">https://github.com/justineuro/mdginabc2svg</a>.
