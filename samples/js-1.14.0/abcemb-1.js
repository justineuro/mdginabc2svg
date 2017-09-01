//#javascript
// abc2svg - ABC to SVG translator
// @source: http://moinejf.free.fr/js/abc2svg.tar.gz.php
// Copyright (C) 2014-2017 Jean-Francois Moine
//
// This file is part of abc2svg-core.
//
// abc2svg-core is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg-core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg-core.  If not, see <http://www.gnu.org/licenses/>.
// abcemb-1.js for abc2svg-1.14.0 (2017-08-23)
window.onerror=function(msg){alert("window error: msg");return false};var errtxt="",new_page="",abc,play,abcplay,a_src=[],a_pe=[];var user={errmsg:function(msg,l,c){errtxt+=clean_txt(msg)+"\n"},img_out:function(str){new_page+=str},page_format:true};function clean_txt(txt){return txt.replace(/<|>|&.*?;|&/g,function(c){switch(c){case"<":return"&lt;";case">":return"&gt;"}if(c=="&")return"&amp;";return c})}function endplay(){play=1}function playseq(seq){if(typeof AbcPlay=="undefined")return;if(play==2){abcplay.stop();endplay();return}play=2;if(!a_pe[seq]){if(!abcplay)abcplay=new AbcPlay(endplay,"https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/");var abc=new Abc(user);abcplay.clear();abc.tosvg("play","%%play");try{abc.tosvg("abcemb"+seq,a_src[seq])}catch(e){alert(e.message+"\nabc2svg tosvg bug - stack:\n"+e.stack);play=1;a_pe[seq]=null;return}a_pe[seq]=abcplay.clear()}abcplay.play(0,1e5,a_pe[seq])}var jsdir=document.currentScript.src.match(/.*\//)||[""];function dom_loaded(){var page=document.body.innerHTML;if(typeof Psvg!="function"&&page.indexOf("\n%%beginps")>0){var scr=document.createElement("script");scr.src=jsdir[0]+"psvg-1.js";scr.onload=dom_loaded;document.head.appendChild(scr);return}user.get_abcmodel=function(tsfirst,voice_tb,music_types,info){if(play==2)abcplay.add(tsfirst,voice_tb)};var i=0,j,k,res,src,seq=0,re=/\n%abc|\nX:/g,re_stop=/\n<|\n%.begin/g;abc=new Abc(user);for(;;){res=re.exec(page);if(!res)break;j=re.lastIndex-res[0].length;new_page+=page.slice(i,j);re_stop.lastIndex=++j;while(1){res=re_stop.exec(page);if(!res||res[0]=="\n<")break;k=page.indexOf(res[0].replace("begin","end"),re_stop.lastIndex);if(k<0)break;re_stop.lastIndex=k}if(!res||k<0)k=page.length;else k=re_stop.lastIndex-2;src=page.slice(j,k);if(play){new_page+='<div onclick="playseq('+a_src.length+')">\n';a_src.push(src)}try{abc.tosvg("abcemb",src)}catch(e){alert("abc2svg javascript error: "+e.message+"\nStack:\n"+e.stack)}if(errtxt){i=page.indexOf("\n",j);i=page.indexOf("\n",i+1);alert("Errors in\n"+page.slice(j,i)+"\n...\n\n"+errtxt);errtxt=""}if(play)new_page+="</div>\n";i=k;if(k>=page.length)break;re.lastIndex=i}user.img_out=null;try{document.body.innerHTML=new_page+page.slice(i)}catch(e){alert("abc2svg bad generated SVG: "+e.message+"\nStack:\n"+e.stack)}}if(window.AudioContext||window.webkitAudioContext)play=1;document.addEventListener("DOMContentLoaded",dom_loaded,false);
