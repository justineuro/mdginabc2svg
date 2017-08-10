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
// play-1.js for abc2svg-1.13.6 (2017-08-08)
function AbcPlay(i_onend,sf,i_onnote){var audio=new Audio,audio5=new Audio5(i_onend,sf,i_onnote);return{clear:audio.clear,add:audio.add,play:audio5.play,stop:audio5.stop,get_sft:audio5.get_sft,get_sfu:audio5.get_sfu,get_vol:audio5.get_vol,set_sft:audio5.set_sft,set_sfu:audio5.set_sfu,set_vol:audio5.set_vol,set_follow:audio5.set_follow}}function Audio(){var BAR=0,CLEF=1,GRACE=4,KEY=5,NOTE=8,TEMPO=14,BASE_LEN=1536,scale=new Uint8Array([0,2,4,5,7,9,11]),a_e,p_time,abc_time,play_factor;this.clear=function(){var a_pe=a_e;a_e=null;return a_pe};this.add=function(s,voice_tb){var bmap=new Int8Array(7),map=new Int8Array(70),i,n,dt,d,rep_st_i,rep_st_t,rep_en_i,rep_en_t,rep_en_map=new Int8Array(7),transp;function set_voices(){var v,s;transp=new Int8Array(voice_tb.length);for(v=0;v<voice_tb.length;v++){s=voice_tb[v].clef;transp[s.v]=!s.clef_octave||s.clef_oct_transp?0:s.clef_octave}}function bar_map(){for(var j=0;j<10;j++)for(var i=0;i<7;i++)map[j*7+i]=bmap[i]}function key_map(s){for(var i=0;i<7;i++)bmap[i]=0;switch(s.k_sf){case 7:bmap[6]=1;case 6:bmap[2]=1;case 5:bmap[5]=1;case 4:bmap[1]=1;case 3:bmap[4]=1;case 2:bmap[0]=1;case 1:bmap[3]=1;break;case-7:bmap[3]=-1;case-6:bmap[0]=-1;case-5:bmap[4]=-1;case-4:bmap[1]=-1;case-3:bmap[5]=-1;case-2:bmap[2]=-1;case-1:bmap[6]=-1;break}bar_map()}function pit2mid(s,i){var n,oct,p=s.notes[i].pit+12,a=s.notes[i].acc;if(transp[s.v])p+=transp[s.v];if(a)map[p]=a==3?0:a;return(p/7|0)*12+scale[p%7]+map[p]}function play_dup(s){var i,n,en_t,dt,e;dt=p_time-rep_st_t;for(i=rep_st_i;i<rep_en_i;i++){e=a_e[i];a_e.push([e[0],e[1]+dt,e[2],e[3],e[4]])}}function do_tie(s,i,d){var j,n,s2,pit,end_time,note=s.notes[i],tie=note.ti1;pit=note.pit;end_time=s.time+s.dur;for(s2=s.next;;s2=s2.next){if(!s2||s2.time!=end_time)return d;if(s2.type==NOTE)break}n=s2.notes.length;for(j=0;j<n;j++){note=s2.notes[j];if(note.pit==pit){d+=s2.dur/play_factor;note.ti2=true;return note.ti1?do_tie(s2,j,d):d}}return d}function gen_grace(s){var g,i,n,t,d=BASE_LEN/16,next=s.next;if(next.type!=NOTE){for(g=s.extra;g;g=g.next){if(g.type!=NOTE)continue;for(i=0;i<=g.nhd;i++)pit2mid(g,i)}return}if(next.dur>BASE_LEN/4)d*=2;else if(next.dur<BASE_LEN/8)d=next.dur/2;n=0;for(g=s.extra;g;g=g.next)if(g.type==NOTE)n++;next.time+=d;next.dur-=d;d/=n*play_factor;t=p_time;for(g=s.extra;g;g=g.next){if(g.type!=NOTE)continue;gen_notes(g,t,d);t+=d}}function gen_notes(s,t,d){for(var i=0;i<=s.nhd;i++){if(s.notes[i].ti2)continue;a_e.push([s.istart,t,s.p_v.instr,pit2mid(s,i),s.notes[i].ti1?do_tie(s,i,d):d])}}set_voices();key_map(voice_tb[0].key);if(!a_e){a_e=[];abc_time=rep_st_t=p_time=rep_st_i=rep_en_i=0;play_factor=BASE_LEN/4*120/60}else if(s.time<abc_time){abc_time=rep_st_t=s.time}while(s){if(s.type==TEMPO&&s.tempo){d=0;n=s.tempo_notes.length;for(i=0;i<n;i++)d+=s.tempo_notes[i];play_factor=d*s.tempo/60}dt=s.time-abc_time;if(dt>0){p_time+=dt/play_factor;abc_time=s.time}switch(s.type){case BAR:if(s.v!=0)break;if(s.bar_type[0]==":"){if(rep_en_i==0){rep_en_i=a_e.length;rep_en_t=p_time}else{for(i=0;i<7;i++)bmap[i]=rep_en_map[i]}play_dup(s);p_time+=rep_en_t-rep_st_t}if(s.bar_type[s.bar_type.length-1]==":"){rep_st_i=a_e.length;rep_st_t=p_time;rep_en_i=0;rep_en_t=0}else if(s.text&&s.text[0]=="1"){rep_en_i=a_e.length;rep_en_t=p_time;bar_map();for(i=0;i<7;i++)rep_en_map[i]=bmap[i];break}bar_map();break;case CLEF:transp[s.v]=!s.clef_octave||s.clef_oct_transp?0:s.clef_octave;break;case GRACE:gen_grace(s);break;case KEY:if(s.st!=0)break;key_map(s);break;case NOTE:gen_notes(s,p_time,s.dur/play_factor);break}s=s.ts_next}}}if(typeof module=="object")exports.Audio=Audio;function Audio5(i_onend,sf,i_onnote){var instr_tb=["acoustic_grand_piano","bright_acoustic_piano","electric_grand_piano","honky-tonk_piano","electric_piano_1","electric_piano_2","harpsichord","clavinet","celesta","glockenspiel","music_box","vibraphone","marimba","xylophone","tubular_bells","dulcimer","drawbar_organ","percussive_organ","rock_organ","church_organ","reed_organ","accordion","harmonica","tango_accordion","acoustic_guitar_nylon","acoustic_guitar_steel","electric_guitar_jazz","electric_guitar_clean","electric_guitar_muted","overdriven_guitar","distortion_guitar","guitar_harmonics","acoustic_bass","electric_bass_finger","electric_bass_pick","fretless_bass","slap_bass_1","slap_bass_2","synth_bass_1","synth_bass_2","violin","viola","cello","contrabass","tremolo_strings","pizzicato_strings","orchestral_harp","timpani","string_ensemble_1","string_ensemble_2","synth_strings_1","synth_strings_2","choir_aahs","voice_oohs","synth_choir","orchestra_hit","trumpet","trombone","tuba","muted_trumpet","french_horn","brass_section","synth_brass_1","synth_brass_2","soprano_sax","alto_sax","tenor_sax","baritone_sax","oboe","english_horn","bassoon","clarinet","piccolo","flute","recorder","pan_flute","blown_bottle","shakuhachi","whistle","ocarina","lead_1_square","lead_2_sawtooth","lead_3_calliope","lead_4_chiff","lead_5_charang","lead_6_voice","lead_7_fifths","lead_8_bass__lead","pad_1_new_age","pad_2_warm","pad_3_polysynth","pad_4_choir","pad_5_bowed","pad_6_metallic","pad_7_halo","pad_8_sweep","fx_1_rain","fx_2_soundtrack","fx_3_crystal","fx_4_atmosphere","fx_5_brightness","fx_6_goblins","fx_7_echoes","fx_8_sci-fi","sitar","banjo","shamisen","koto","kalimba","bagpipe","fiddle","shanai","tinkle_bell","agogo","steel_drums","woodblock","taiko_drum","melodic_tom","synth_drum","reverse_cymbal","guitar_fret_noise","breath_noise","seashore","bird_tweet","telephone_ring","helicopter","applause","gunshot"],nn=["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"],no="012345678";var onend=i_onend,ac,gain,gain_val=.7,a_e,onnote=i_onnote,follow,sfu="https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM",sft="js",sounds=[],w_instr=0,note_q=[],w_note=0,geval=eval,evt_idx,iend,stime;function decode_note(instr,mi){function data2bin(dataURI){var i,base64Index=dataURI.indexOf(",")+1,base64=dataURI.substring(base64Index),raw=window.atob(base64),rawl=raw.length,ab=new ArrayBuffer(rawl),array=new Uint8Array(ab);for(i=0;i<rawl;i++)array[i]=raw.charCodeAt(i);return ab}function audio_dcod(snd){ac.decodeAudioData(snd,function(b){sounds[instr][mi]=b;w_note--},function(e){alert("Decode audio data error "+(e?e.err:"???"));w_note--;iend=0;if(onend)onend()})}w_note++;var p=nn[mi%12]+no[mi/12|0];if(sft=="js"){audio_dcod(data2bin(MIDI.Soundfont[instr_tb[instr]][p]))}else{var url=sfu+"/"+instr_tb[instr]+"-"+sft+"/"+p+"."+sft,req=new XMLHttpRequest;req.open("GET",url);req.overrideMimeType("application/octet-stream; charset=x-user-defined");req.onload=function(){var l=this.responseText.length,a=new ArrayBuffer(l),b=new Uint8Array(a);for(var i=0;i<l;i++)b[i]=this.responseText.charCodeAt(i)&255;audio_dcod(a)};req.onerror=function(){alert("Error while loading\n"+url);w_note--;iend=0;if(onend)onend()};req.send()}}function load_instr(instr){if(sft!="js")return;w_instr++;var url=sfu+"/"+instr_tb[instr]+"-ogg.js",script=document.createElement("script");script.src=url;script.onload=function(){w_instr--};document.head.appendChild(script)}function load_res(){var i,e,instr,mi;for(i=evt_idx;;i++){e=a_e[i];if(!e||e[0]>iend)break;instr=e[2];if(!sounds[instr]){sounds[instr]=[];load_instr(instr)}mi=e[3];if(!sounds[instr][mi]){sounds[instr][mi]=true;note_q.push([instr,mi])}}}function play_next(){var t,e,e2,maxt,o;e=a_e[evt_idx];if(!e||e[0]>iend){if(onend)onend();return}maxt=e[1]+3;do{o=ac.createBufferSource();o.buffer=sounds[e[2]][e[3]];o.connect(gain);o.start(e[1]+stime,0,e[4]);if(follow&&onnote){var st=(e[1]+stime-ac.currentTime)*1e3,i=e[0];setTimeout(onnote,st,i,true);setTimeout(onnote,st+e[4]*1e3,i,false)}t=e[1];e=a_e[++evt_idx]}while(e&&e[1]<=maxt);setTimeout(play_next,(t+stime-ac.currentTime)*1e3-300)}function play_start(){if(iend==0)return;if(w_instr!=0){setTimeout(function(){play_start()},300);return}if(note_q.length!=0){while(1){var e=note_q.shift();if(!e)break;decode_note(e[0],e[1])}}if(w_note!=0){setTimeout(function(){play_start()},300);return}stime=ac.currentTime+.2;play_next()}this.play=function(istart,i_iend,a_pe){if(a_pe)a_e=a_pe;if(!a_e||!a_e.length){if(onend)onend();return}iend=i_iend;evt_idx=0;while(a_e[evt_idx]&&a_e[evt_idx][0]<istart)evt_idx++;if(!a_e[evt_idx]){if(onend)onend();return}load_res();play_start()};this.stop=function(){iend=0};this.get_sft=function(){return sft};this.get_sfu=function(){return sfu};this.get_vol=function(){if(gain)return gain.gain.value;return gain_val};this.set_sft=function(v){sft=v};this.set_sfu=function(v){sfu=v};this.set_vol=function(v){if(gain)gain.gain.value=v;else gain_val=v};this.set_follow=function(v){follow=v};if(!ac){ac=new(window.AudioContext||window.webkitAudioContext);gain=ac.createGain();gain.gain.value=gain_val;gain.connect(ac.destination)}if(sf){if(typeof sf==="object"){if(sf.url)sfu=sf.url;if(sf.type)sft=sf.type}else{sfu=sf;sft="js"}}if(typeof MIDI=="object")sounds[0]=[];else MIDI={}}
