// abc2svg - ABC to SVG translator
// @source: https://chiselapp.com/user/moinejf/repository/abc2svg
// Copyright (C) 2014-2024 Jean-Francois Moine - LGPL3+
// snd-1.js - file to include in html pages with abc2svg-1.js for playing
//
// Copyright (C) 2015-2021 Jean-Francois Moine
//
// This file is part of abc2svg.
//
// abc2svg is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg.  If not, see <http://www.gnu.org/licenses/>.

// This file is a wrapper around
// - ToAudio (sndgen.js): generate the play data
// - Audio5 (sndaud.js): play with HTML5 audio API and SF2
// - Midi5 (sndmid.js): play with HTML5 MIDI api
// old version:
// - ToAudio (toaudio.js - convert ABC to audio sequences)
// - Audio5 (toaudio5.js - play the audio sequences with webaudio and SF2)
// - Midi5 (tomidi5.js - play the audio sequences with webmidi)

// AbcPlay methods:
//
// set_sfu() - get/set the soundfont URL
// @url: URL - undefined = return current value
//
// set_speed() - get/set the play speed
// @speed: < 1 slower, > 1 faster - undefined = return current value
//
// set_vol() - get/set the current sound volume
// @volume: range [0..1] - undefined = return current value

function AbcPlay(i_conf) {
    var	conf = i_conf,
	init = {},
	audio = ToAudio(),
	audio5, midi5, current,
	abcplay = {				// returned object (only instance)
		clear: audio.clear,
		add: audio.add,
		set_sfu: function(v) {
			if (v == undefined)
				return conf.sfu
			conf.sfu = v
		},
		set_speed: function(v) {
			if (v == undefined)
				return conf.speed
			conf.new_speed = v
		},
		set_vol: function(v) {
			if (v == undefined)
				return conf.gain;
			conf.gain = v
			if (current && current.set_vol)
				current.set_vol(v)
		},
		play: play,
		stop: vf
	}

	function vf() {}			// void function

	// start playing when no defined output
	function play(istart, i_iend, a_e) {
		init.istart = istart;
		init.i_iend = i_iend;
		init.a_e = a_e
		if (midi5)
			midi5.get_outputs(play2) // get the MIDI ports
		else
			play2()
	} // play()

	// if set, out contains an array of the MIDI output ports
	function play2(out) {
	    var o

		if (!out)
			out = []
		o = audio5.get_outputs()	// get the HTML5 audio port
		if (o)
			Array.prototype.push.apply(out, o)
		if (out.length == 0) {
			if (conf.onend)		// no output port
				conf.onend()
			return
		}
		if (out.length == 1) {
			o = 0			// only one port
		} else {
			o = -1			// ask which port?
			var pr = "Use"
			for (var i = 0; i < out.length; i++)
				pr += "\n " + i + ": " + out[i]
			var res = window.prompt(pr, '0')
			if (res) {
				o = Number(res)
				if (isNaN(o) || o < 0 || o >= out.length)
					o = -1
			}
			if (!res || o < 0) {
				if (conf.onend)
					conf.onend()
				return
			}
		}

		// set the current output changing the play functions
		current = out[o] == 'sf2' ? audio5 : midi5;
		abcplay.play = current.play;
		abcplay.stop = current.stop
		if (current.set_output)
			current.set_output(out[o]);
		abcplay.play(init.istart, init.i_iend, init.a_e);
	} // play2()

	// set default configuration values
	conf.gain = 0.7;
	conf.speed = 1;

	// get the play parameters from localStorage
	(function() {
	    var	v
		try {
			if (!localStorage)
				return
		} catch (e) {
			return
		}
	    if (!conf.sfu) {
		v = localStorage.getItem("sfu")
		if (v)
			conf.sfu = v;
	    }
		v = localStorage.getItem("volume")
		if (v)
			conf.gain = Number(v)
	})()

	// initialize the playing engines
	if (typeof Midi5 == "function")
		midi5 = Midi5(conf)
	if (typeof Audio5 == "function")
		audio5 = Audio5(conf);

	return abcplay
} // AbcPlay

// nodejs
if (typeof module == 'object' && typeof exports == 'object')
	exports.AbcPlay = AbcPlay
// sndgen.js - sound generation
//
// Copyright (C) 2019-2024 Jean-Francois Moine
//
// This file is part of abc2svg.
//
// abc2svg is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg.  If not, see <http://www.gnu.org/licenses/>.

// This script generates the play data which are stored in the music symbols:
// - in all symbols
//	s.ptim = play time
// - in BAR
//	rep_p = on a right repeat bar, pointer to the left repeat symbol
//	rep_s = on the first repeat variant, array of pointers to the next symbols,
//						indexed by the repeat number
// - in NOTE and REST
//	s.pdur = play duration
// - in the notes[] of NOTE
//	s.notes[i].midi

if (!abc2svg)
    var	abc2svg = {}

function ToAudio() {
 return {

   // generate the play data of a tune
   add: function(first,		// starting symbol
		voice_tb,	// voice table
		cfmt) {		// tune parameters
    var	toaud = this,
	C = abc2svg.C,
	p_time = 0,		// last playing time
	abc_time = 0,		// last ABC time
	play_fac = C.BLEN / 4 * 120 / 60, // play time factor - default: Q:1/4=120
	i, n, dt, d, v,
	s = first,
	rst = s,		// left repeat (repeat restart)
	rst_fac,		// play factor on repeat restart
	rsk = [],		// repeat variant array (repeat skip)
	b_tim,			// time of last measure bar
	b_typ			// type of last measure bar

	function get_beat() {
	    var	s = first.p_v.meter

		if (!s.a_meter[0])
			return C.BLEN / 4
		if (!s.a_meter[0].bot)
			return (s.a_meter[1]
				&& s.a_meter[1].top == '|')	// (cut time)
					? C.BLEN / 2 : C.BLEN / 4
		if (s.a_meter[0].bot == "8"
		 && s.a_meter[0].top % 3 == 0)
			return C.BLEN / 8 * 3
		return C.BLEN / s.a_meter[0].bot | 0
	} // get_beat()

	// create the starting beats
	function def_beats() {
	    var	i, s2, s3, tim,
		beat = get_beat(),		// time between two beats
		d = first.p_v.meter.wmeasure,	// duration of a measure
		nb = d / beat | 0,		// number of beats in a measure
		v = voice_tb.length,		// beat voice number
		p_v = {				// voice for the beats
			id: "_beats",
			v: v,
//			time:
			sym: {
				type: C.BLOCK,
				v: v,
//				p_v: p_v,
				subtype: "midiprog",
				chn: 9,			// percussion channel
				instr: 16384,	// percussion bank
//				time:
//				next:
				ts_prev: first
//				ts_next: 
			}
//			vol:
		},
		s = {
			type: C.NOTE,
			v: v,
			p_v: p_v,
//			time:
			dur: beat,
			nhd: 0,
			notes: [{
				midi: 37	// Side Stick
			}]
		}

		abc_time = -d			// start time of the beat ticks

		// check for an anacrusis
		for (s2 = first; s2; s2 = s2.ts_next) {
			if (s2.bar_type && s2.time) {
				nb = (2 * d - s2.time) / beat | 0
				abc_time -= d - s2.time
				break
			}
		}

		// add the tempo
		s2 = p_v.sym			// midiprog
		for (s3 = first; s3 && !s3.time; s3 = s3.ts_next) {
			if (s3.type == C.TEMPO) {
				s3 = Object.create(s3)	// new tempo
				s3.v = v
				s3.p_v = p_v
				s3.prev =
					s3.ts_prev = s2
				s2.next =
					s2.ts_next = s3
				s2 = s3
				play_fac = set_tempo(s2)
				break
			}
		}

		voice_tb[v] = p_v
		p_v.sym.p_v = p_v
		first.time = s2.time = tim = abc_time
		if (s3)
			p_v.sym.time = tim
		for (i = 0; i < nb; i++) {
			s3 = Object.create(s)	// new beat tick
			s3.time = tim
			s3.prev = s2
			s2.next = s3
			s3.ts_prev = s2
			s2.ts_next = s3
			s2 = s3
			tim += beat
		}
		s2.ts_next = first.ts_next
		s2.ts_next.ts_prev = s2
		first.ts_next = p_v.sym
		rst = s2.ts_next
	} // def_beats()

	// build the information about the parts (P:)
	function build_parts(first) {
	    var	i, j, c, n, v,
		s = first,
		p = s.parts,
		st = [],
		r = ""

		// build a linear string of the parts
		for (i = 0; i < p.length; i++) {
			c = p[i]
			switch (c) {
			case '.':
				continue
			case '(':
				st.push(r.length)
				continue
			case ')':
				j = st.pop()
				if (j == undefined)
					j = r.length
				continue
			}
			if (c >= 'A' && c <= 'Z') {
				j = r.length
				r += c
				continue
			}
			n = Number(c)
//fixme:one digit is enough!
//			while (1) {
//				c = p[i + 1]
//				if (c < '0' || c > '9')
//					break
//				n = n * 10 + Number(c)
//				i++
//			}
			if (isNaN(n))
				break
			v = r.slice(j)
			if (r.length + v.length * n > 128)
				continue
			while (--n > 0)
				r += v
		}
		s.parts = r

		// build the part table in the first symbol
		// and put the reverse pointers in the P: symbols
		s.p_s = []			// pointers to the parts
		while (1) {
			if (!s.ts_next) {
				s.part1 = first	// end of tune = end of part
				break
			}
			s = s.ts_next
			if (s.part) {
				s.part1 = first		// reverse pointer
				v = s.part.text[0]	// 1st letter only
				for (i = 0; i < first.parts.length; i++) {
					if (first.parts[i] == v)
						first.p_s[i] = s
				}
			}
		}
	} // build_parts()

	// generate the grace notes
	function gen_grace(s) {
	    var	g, i, n, t, d, s2,
		next = s.next

		// before beat
		if (s.sappo) {
			d = C.BLEN / 16
		} else if ((!next || next.type != C.NOTE)
			&& s.prev && s.prev.type == C.NOTE) {
			d = s.prev.dur / 2

		// on beat
		} else {
			d = next.dur / 12
			if (!(d & (d - 1)))
				d = next.dur / 2	// no dot
			else
				d = next.dur / 3
			if (s.p_v.key.k_bagpipe)
				d /= 2
			next.time += d
			next.dur -= d
		}
//fixme: assume the grace notes in the sequence have the same duration
		n = 0
		for (g = s.extra; g; g = g.next)
			n++
		d /= n * play_fac
		t = p_time
		for (g = s.extra; g; g = g.next) {
			g.ptim = t
			g.pdur = d
			t += d
		}
	} // gen_grace()

	// change the tempo
	function set_tempo(s) {
	    var	i,
		d = 0,
		n = s.tempo_notes.length

		for (i = 0; i < n; i++)
			d += s.tempo_notes[i]
		return d * s.tempo / 60
	} // set_tempo()

	function set_variant(s) {
	    var	d,
		n = s.text.match(/[1-8]-[2-9]|[1-9,.]|[^\s]+$/g)

		while (1) {
			d = n.shift()
			if (!d)
				break
			if (d[1] == '-')
				for (i = d[0]; i <= d[2]; i++)
					rsk[i] = s
			else if (d >= '1' && d <= '9')
				rsk[Number(d)] = s
			else if (d != ',')
				rsk.push(s)	// last
		}
	} // set_variant()

	// add() main

	// if some chord stuff, set the accompaniment data
	if (cfmt.chord)
		abc2svg.chord(first, voice_tb, cfmt)

	// if %%playbeats, create the sounds
	if (cfmt.playbeats)
		def_beats()

	if (s.parts)
		build_parts(s)

	// set the time parameters
	rst_fac = play_fac
	while (s) {
		if (s.noplay) {			// in display macro sequence
			s = s.ts_next
			continue
		}

		dt = s.time - abc_time
		if (dt != 0) {		// may go backwards after grace notes
			p_time += dt / play_fac
			abc_time = s.time
		}
		s.ptim = p_time

		if (s.part) {			// new part
			rst = s			// new possible restart
			rst_fac = play_fac
		}
		switch (s.type) {
		case C.BAR:
			if (s.time != b_tim) {
				b_tim = s.time
				b_typ = 0
			}
			if (s.text			// if new variant
			 && rsk.length > 1
			 && s.text[0] != '1') {
				if (b_typ & 1)
					break
				b_typ |= 1
				set_variant(s)
				play_fac = rst_fac
				rst = rsk[0]		// reinit the restart
			}

			// right repeat
			if (s.bar_type[0] == ':') {
				if (b_typ & 2)
					break
				b_typ |= 2
				s.rep_p = rst		// :| to |:
				if (rst == rsk[0])
					s.rep_v = rsk	// to know the number of variants
			}

			// 1st time repeat
			if (s.text) {
			    if (s.text[0] == '1') {
				if (b_typ & 1)
					break
				b_typ |= 1
				s.rep_s = rsk = [rst]	// repeat skip
							// and memorize the restart
				if (rst.bar_type
				 && rst.bar_type.slice(-1) != ':')
					rst.bar_type += ':' // restart confirmed
				set_variant(s)
				rst_fac = play_fac
			    }

			// left repeat
			} else if (s.bar_type.slice(-1) == ':') {
				if (b_typ & 4)
					break
				b_typ |= 4
				rst = s			// new possible restart
				rst_fac = play_fac
// fixme: does not work when |1 split at end of line
//			} else if (s.rbstop == 2) {
//				if (b_typ & 8)
//					break
//				b_typ |= 8
//				rst = s			// new possible restart
//				rst_fac = play_fac
			}
			break
		case C.GRACE:
			if (s.time == 0		// if before beat at start time
			 && abc_time == 0) {
				dt = 0
				if (s.sappo)
					dt = C.BLEN / 16
				else if (!s.next || s.next.type != C.NOTE)
					dt = d / 2
				abc_time -= dt
			}
			gen_grace(s)
			break
		case C.REST:
		case C.NOTE:
			d = s.dur
			if (s.next && s.next.type == C.GRACE) {
				dt = 0
				if (s.next.sappo)
					dt = C.BLEN / 16
				else if (!s.next.next || s.next.next.type != C.NOTE)
					dt = d / 2
				s.next.time -= dt
				d -= dt
			}
			d /= play_fac
			s.pdur = d
			v = s.v
			break
		case C.TEMPO:
			if (s.tempo)
				play_fac = set_tempo(s)
			break
		}
		s = s.ts_next
	} // loop
   } // add()
 } // return
} // ToAudio()

// play some next symbols
//
// This function is called to start playing.
// Playing is stopped on either
// - reaching the 'end' symbol (not played) or
// - reaching the end of tune or
// - seeing the 'stop' flag (user request).
//
// The po object (Play Object) contains the following items:
// - variables
//  - stop: stop flag
//		set by the user to stop playing
//  - s_cur: current symbol (next to play)
//		must be set to the first symbol to be played at startup time
//  - s_end: stop playing on this symbol
//		this symbol is not played. It may be null.
//  - conf
//    - speed: current speed factor
//		must be set to 1 at startup time
//    - new_speed: new speed factor
//		set by the user
// - internal variables
//  - stim: start time
//  - repn: don't repeat
//  - repv: variant number
//  - timouts: array of the current timeouts
//		this array may be used by the upper function in case of hard stop
//  - p_v: voice table used for MIDI control
// - methods
//  - onend: (optional)
//  - onnote: (optional)
//  - note_run: start playing a note
//  - get_time: return the time of the underlaying sound system
abc2svg.play_next = function(po) {

	// handle a tie
	function do_tie(not_s, d) {
	    var	i,
		s = not_s.s,
		C = abc2svg.C,
		v = s.v,
		end_time = s.time + s.dur,
		repv = po.repv

		// search the end of the tie
		while (1) {
			s = s.ts_next
			if (!s || s.time > end_time)
				break
			if (s.type == C.BAR) {
				if (s.rep_p) {
					if (!po.repn) {
						s = s.rep_p
						end_time = s.time
					}
				}
				if (s.rep_s) {
					if (!s.rep_s[repv])
						break
					s = s.rep_s[repv++]
					end_time = s.time
				}
				while (s.ts_next && !s.ts_next.dur)
					s = s.ts_next
				continue
			}
			if (s.time < end_time
			 || !s.ti2)			// if not end of tie
				continue

			i = s.notes.length
			while (--i >= 0) {
				note = s.notes[i]
				if (note.tie_s == not_s) {
					d += s.pdur / po.conf.speed
					return note.tie_e ? do_tie(note, d) : d
				}
			}
		}

		return d
	} // do_tie()

	// set the MIDI controls up to now
	function set_ctrl(po, s2, t) {
	    var	i,
		p_v = s2.p_v,
		s = {
			subtype: "midictl",
			p_v: p_v,
			v: s2.v
		}

		for (i in p_v.midictl) { // MIDI controls at voice start time
			s.ctrl = Number(i)
			s.val = p_v.midictl[i]
			po.midi_ctrl(po, s, t)
		}
		for (s = p_v.sym; s != s2; s = s.next) {
			if (s.subtype == "midictl")
				po.midi_ctrl(po, s, t)
			else if (s.subtype == 'midiprog')
				po.midi_prog(po, s)
		}

		// if no %%MIDI, set 'grand acoustic piano' as the instrument
		i = po.v_c[s2.v]
		if (i == undefined)
			po.v_c[s2.v] = i = s2.v < 9 ? s2.v : s2.v + 1
		if (po.c_i[i] == undefined)
			po.c_i[i] = 0	// piano

		po.p_v[s2.v] = true	// synchronization done
	} // set_ctrl()

    // start and continue to play
    function play_cont(po) {
    var	d, i, st, m, note, g, s2, t, maxt, now,
	C = abc2svg.C,
	s = po.s_cur

	// search the end of a sequence of variants
	function var_end(s) {
	    var	i, s2, s3,
		a = s.rep_v || s.rep_s
		ti = 0

		for (i = 1; i < a.length; i++) {
			s2 = a[i]
			if (s2.time > ti) {
				ti = s2.time
				s3 = s2
			}
		}
		for (s = s3; s != po.s_end; s = s.ts_next) {
			if (s.time == ti)
				continue
			if (s.rbstop == 2)
				break
		}
		po.repv = 1		// repeat end
		return s
	} // var_end()

	if (po.stop) {
		if (po.onend)
			po.onend(po.repv)
		return
	}

	while (s.noplay) {
		s = s.ts_next
		if (!s || s == po.s_end) {
			if (po.onend)
				po.onend(po.repv)
			return
		}
	}
	t = po.stim + s.ptim / po.conf.speed	// start time
	now = po.get_time(po)

	// if speed change, shift the start time
	if (po.conf.new_speed) {
		po.stim = now - (now - po.stim) *
					po.conf.speed / po.conf.new_speed
		po.conf.speed = po.conf.new_speed
		po.conf.new_speed = 0
		t = po.stim + s.ptim / po.conf.speed
	}

	maxt = t + po.tgen		// max time = now + 'tgen' seconds
	po.timouts = []
	while (1) {
		if (!po.p_v[s.v])		// if new voice
			set_ctrl(po, s, t)	// set the MIDI controls
		switch (s.type) {
		case C.BAR:
			s2 = null
			if (s.rep_p) {		// right repeat
				po.repv++
				if (!po.repn	// if repeat a first time
				 && (!s.rep_v	// and no variant (anymore)
				  || po.repv <= s.rep_v.length)) {
					s2 = s.rep_p	// left repeat
					po.repn = true
				} else {
					if (s.rep_v)
						s2 = var_end(s)
					po.repn = false
				}
			}
			if (s.rep_s) {			// first variant
				s2 = s.rep_s[po.repv]	// next variant
				if (s2) {
					po.repn = false
					if (s2 == s)
						s2 = null
				} else {		// end of variants
					s2 = var_end(s)
					if (s2 == po.s_end)
						break
				}
			}
			if (s.bar_type.slice(-1) == ':' // left repeat
			 && s.bar_type[0] != ':')	// but not ::
				po.repv = 1

			if (s2) {			// if skip
				po.stim += (s.ptim - s2.ptim) / po.conf.speed
				s = s2
				while (s && !s.dur)
					s = s.ts_next
				if (!s)
					break		// no ending variant
				t = po.stim + s.ptim / po.conf.speed
				break
			}

		    if (!s.part1) {
			while (s.ts_next && !s.ts_next.seqst) {
				s = s.ts_next
				if (s.part1)
					break
			}
			if (!s.part1)
				break
		    }
			// fall thru
		default:
			if (s.part1				// if end of part
			 && po.i_p != undefined) {
				s2 = s.part1.p_s[++po.i_p]	// next part
				if (s2) {
					po.stim += (s.ptim - s2.ptim) / po.conf.speed
					s = s2
					t = po.stim + s.ptim / po.conf.speed
				} else {
					s = po.s_end
				}
				po.repv = 1
			}
			break
		}
	    if (s && s != po.s_end && !s.noplay) {
		switch (s.type) {
		case C.BAR:
			break
		case C.BLOCK:
			if (s.subtype == "midictl")
				po.midi_ctrl(po, s, t)
			else if (s.subtype == 'midiprog')
				po.midi_prog(po, s)
			break
		case C.GRACE:
			for (g = s.extra; g; g = g.next) {
				d = g.pdur / po.conf.speed
				for (m = 0; m <= g.nhd; m++) {
					note = g.notes[m]
					if (!note.noplay)
					    po.note_run(po, g,
						note.midi,
						t + g.ptim - s.ptim,
//fixme: there may be a tie...
						d)
				}
			}
			break
		case C.NOTE:
		case C.REST:
			d = s.pdur / po.conf.speed
		    if (s.type == C.NOTE) {
			for (m = 0; m <= s.nhd; m++) {
				note = s.notes[m]
				if (note.tie_s		// end of tie
				 || note.noplay)	// (%%voicecombine)
					continue	// already generated
				po.note_run(po, s,
					note.midi,
					t,
					note.tie_e ?
						do_tie(note, d) : d)
			}
		    }

			// follow the notes/rests while playing
			if (po.onnote && s.istart) {
				i = s.istart
				st = (t - now) * 1000
				po.timouts.push(setTimeout(po.onnote, st, i, true))
				if (d > 2)	// problem when loop on one long note
					d -= .1
				setTimeout(po.onnote, st + d * 1000, i, false)
			}
			break
		}
	    }
		while (1) {
			if (!s || s == po.s_end || !s.ts_next) {
				if (po.onend)
					setTimeout(po.onend,
						(t - now + d) * 1000,
						po.repv)
				po.s_cur = s
				return
			}
			s = s.ts_next
			if (!s.noplay)
				break
		}
		t = po.stim + s.ptim / po.conf.speed // next time
		if (t > maxt)
			break
	}
	po.s_cur = s

	// delay before next sound generation
	po.timouts.push(setTimeout(play_cont,
				(t - now) * 1000
					- 300,	// wake before end of playing
				po))
    } // play_cont()

    // search the index in the parts
    function get_part(po) {
    var	s, i, s_p
	for (s = po.s_cur; s; s = s.ts_prev) {
		if (s.parts) {
			po.i_p = -1
			return
		}
		s_p = s.part1
		if (!s_p || !s_p.p_s)
			continue
		for (i = 0; i < s_p.p_s.length; i++) {
			if (s_p.p_s[i] == s) {
				po.i_p = i	// index in the parts
				return
			}
		}
	}
    } // get_part()

    // --- play_next ---
	get_part(po)

	po.stim = po.get_time(po) + .3	// start time + 0.3s
			- po.s_cur.ptim * po.conf.speed
	po.p_v = []			// voice table for the MIDI controls
	if (!po.repv)
		po.repv = 1

	play_cont(po)			// start playing
} // play_next()

// nodejs
if (typeof module == 'object' && typeof exports == 'object')
	exports.ToAudio = ToAudio
// sndaud.js - audio output using HTML5 audio
//
// Copyright (C) 2019-2023 Jean-Francois Moine
//
// This file is part of abc2svg.
//
// abc2svg is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg.  If not, see <http://www.gnu.org/licenses/>.

// Audio5 creation

// @conf: configuration object - all items are optional:
//	ac: audio context - (default: created on play start)
//	sfu: soundfont URL (sf2 base64 encoded - default: "Scc1t2")
//	onend: callback function called at end of playing
//		Argument:
//			repv: last repeat variant number
//	onnote: callback function called on note start/stop playing
//		Arguments:
//			i: start index of the note in the ABC source
//			on: true on note start, false on note stop
//	errmsg: function called on error (default: alert)
//		Arguments:
//			error message
//
//  When playing, the following items must/may be set:
//	gain: (mandatory) volume, must be set to [0..1]
//	speed: (mandatory) must be set to 1
//	new_speed: (optional) new speed value

// Audio5 methods

// get_outputs() - get the output devices
//	return ['sf2'] or null
//
// play() - start playing
// @start -
// @stop: start and stop music symbols
// @level: repeat variant (optional, default = 0)
//
// stop() - stop playing
//
// set_vol() - set the current sound volume
// @volume: range [0..1] - undefined = return current value

    var	abcsf2 = []			// SF2 instruments

function Audio5(i_conf) {
    var	po,			// play object
	conf = i_conf,		// configuration
	empty = function() {},
	errmsg,
	ac,			// audio context
	gain,			// global gain
	model,			// device model (for iPad|iPhone|iPod)

	// instruments/notes
	parser,			// SF2 parser
	presets,		// array of presets
	instr = [],		// [voice] bank + instrument
	params = [],		// [instr][key] note parameters per instrument
	rates = [],		// [instr][key] playback rates
	w_instr = 0		// number of instruments being loaded

	// base64 stuff
    var b64d = []
	function init_b64d() {
	    var	b64l = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
		l = b64l.length
		for (var i = 0; i < l; i++)
			b64d[b64l[i]] = i
		b64d['='] = 0
	}
	function b64dcod(s) {
	    var	i, t, dl, a,
		l = s.length,
		j = 0

		dl = l * 3 / 4			// destination length
		if (s[l - 1] == '=') {
			if (s[l - 2] == '=')
				dl--
			dl--
			l -= 4
		}
		a = new Uint8Array(dl)
		for (i = 0; i < l; i += 4) {
			t =	(b64d[s[i]] << 18) +
				(b64d[s[i + 1]] << 12) +
				(b64d[s[i + 2]] << 6) +
				 b64d[s[i + 3]]
			a[j++] = (t >> 16) & 0xff
			a[j++] = (t >> 8) & 0xff
			a[j++] = t & 0xff
		}
		if (l != s.length) {
			t =	(b64d[s[i]] << 18) +
				(b64d[s[i + 1]] << 12) +
				(b64d[s[i + 2]] << 6) +
				 b64d[s[i + 3]]
			a[j++] = (t >> 16) & 0xff
			if (j < dl)
				a[j++] = (t >> 8) & 0xff
		}
		return a
	}

	// copy a sf2 sample to an audio buffer
	// @b = audio buffer (array of [-1..1])
	// @s = sf2 sample (PCM 16 bits)
	function sample_cp(b, s) {
	    var	i, n,
		a = b.getChannelData(0)		// destination = array of float32

		for (i = 0; i < s.length; i++)
			a[i] = s[i] / 196608	// volume divided by 6
	}

	// create all notes of an instrument
	function sf2_create(instr, sf2par, sf2pre) {	// parser, presets

		// get the instrument parameters
		// adapted from getInstruments() in sf2-parser.js
		function get_instr(i) {
		    var	instrument = sf2par.instrument,
			zone = sf2par.instrumentZone,
			j = instrument[i].instrumentBagIndex,
			jl = instrument[i + 1]
				? instrument[i + 1].instrumentBagIndex
				: zone.length,
			info = []

			while (j < jl) {
				instrumentGenerator =
					sf2par.createInstrumentGenerator_(zone, j)
//				instrumentModulator =
//					sf2par.createInstrumentModulator_(zone, j)

				info.push({
					generator: instrumentGenerator.generator,
//					modulator: instrumentModulator.modulator
				})
				j++
			}
//console.log('created instr: '+instrument[i].instrumentName)
		return {
//			name: instrument[i].instrumentName,
			info: info
		}
	} // get_instr()

	// sf2_create
	    var i, j, k, sid, gen, parm, gparm, sample, infos,
		sampleRate, scale,
		b = instr >> 7,			// bank
		p = instr % 128,		// preset
		pr = sf2pre

		rates[instr] = []

		// search the bank:preset
		for (i = 0; i < pr.length; i++) {
			gen = pr[i].header
			if (gen.preset == p
			 && gen.bank == b)
				break
		}
		pr = pr[i]
		if (!pr) {
			errmsg('unknown instrument ' + b + ':' + p)
			return			// unknown preset!
		}
		pr = pr.info			// list of gen/mod
		for (k = 0; k < pr.length; k++) {
		    if (!pr[k].generator.instrument)
			continue
		    gparm = null

		    infos = get_instr(pr[k].generator.instrument.amount).info
		    for (i = 0; i < infos.length; i++) {
			gen = infos[i].generator

			if (!gparm) {
				parm = gparm = {	// default parameters
					attack: .001,
					hold: .001,
					decay: .001,
					sustain: 0
//					release: .001
				    }
			} else {
				parm = Object.create(gparm) // new parameters
				if (!gen.sampleID)
					gparm = parm	// global para,eters
			}

			if (gen.attackVolEnv)
				parm.attack = Math.pow(2,
						gen.attackVolEnv.amount / 1200)
			if (gen.holdVolEnv)
				parm.hold = Math.pow(2,
						gen.holdVolEnv.amount / 1200)
			if (gen.decayVolEnv)
				parm.decay = Math.pow(2,
						gen.decayVolEnv.amount / 1200) / 3
			if (gen.sustainVolEnv)
				parm.sustain = gen.sustainVolEnv.amount / 1000
//			if (gen.releaseVolEnv)
//				parm.release = Math.pow(2,
//						gen.releaseVolEnv.amount / 1200)
			if (gen.sampleModes && gen.sampleModes.amount & 1)
				parm.sm = 1

			if (!gen.sampleID)	// (empty generator!)
				continue

			sid = gen.sampleID.amount
			sampleRate = sf2par.sampleHeader[sid].sampleRate
			sample = sf2par.sample[sid]
			parm.buffer = ac.createBuffer(1,
						sample.length,
						sampleRate)

			parm.hold += parm.attack
			parm.decay += parm.hold

			// sustain > 40dB is not audible
			if (parm.sustain >= .4)
				parm.sustain = 0.01	// must not be null
			else
				parm.sustain = 1 - parm.sustain / .4

			sample_cp(parm.buffer, sample)

			if (parm.sm) {
				parm.loopStart = sf2par.sampleHeader[sid].startLoop /
					sampleRate
				parm.loopEnd = sf2par.sampleHeader[sid].endLoop /
					sampleRate
			}

			// define the notes
			scale = (gen.scaleTuning ?
					gen.scaleTuning.amount : 100) / 100,
			tune = (gen.coarseTune ? gen.coarseTune.amount : 0) +
				(gen.fineTune ? gen.fineTune.amount : 0) / 100 +
				sf2par.sampleHeader[sid].pitchCorrection / 100 -
				(gen.overridingRootKey ?
					gen.overridingRootKey.amount :
					sf2par.sampleHeader[sid].originalPitch)

			for (j = gen.keyRange.lo; j <= gen.keyRange.hi; j++) {
				rates[instr][j] = Math.pow(Math.pow(2, 1 / 12),
							(j + tune) * scale)
				params[instr][j] = parm
			}
		    }
		}
	} // sf2_create()

	// load an instrument (.js file)
	function load_instr(instr) {
		w_instr++
		abc2svg.loadjs(conf.sfu + '/' + instr + '.js',
			function() {
			    var	sf2par = new sf2.Parser(b64dcod(abcsf2[instr]))
				sf2par.parse()
			    var	sf2pre = sf2par.getPresets()
				sf2_create(instr, sf2par, sf2pre)

				if (--w_instr == 0)
					play_start()
			},
			function() {
				errmsg('could not find the instrument ' +
					((instr / 128) | 0).toString() + '-' +
					(instr % 128).toString())
				if (--w_instr == 0)
					play_start()
			})
	} // load_instr()

	// define the instruments of the tune
	function def_instr(s, f, sf2par, sf2pre) {
	    var	i,
		bk = [],		// bank number per voice
		nv = -1,		// highest voice number
		vb = 0			// bitmap of voices with instruments

		// scan from the beginning of the tune
		s = s.p_v.sym
		while (s.ts_prev)
			s = s.ts_prev

		for ( ; s; s = s.ts_next) {
			if (s.v > nv) {			// if new voice
				nv = s.v
				bk[nv] = 0		// bank 0
				if (s.p_v.midictl) {
					if (s.p_v.midictl[0])	// MSB
						bk[s.v] = (bk[s.v] & ~0x1fc000)
								+ (s.p_v.midictl[0] << 14)
					if (s.p_v.midictl[32])	// LSB
						bk[s.v] = (bk[s.v] & ~0x3f80)
								+ (s.p_v.midictl[32] << 7)
				}
			}
			switch (s.subtype) {
			case "midiprog":
				break
			case "midictl":
				if (s.ctrl != 0 && s.ctrl != 32)
					continue	// not bank LSB or MSB
				if (bk[s.v] == undefined)
					bk[s.v] = 0
				if (s.ctrl == 0)			// MSB
					bk[s.v] = (bk[s.v] & ~0x1fc000)
							+ (s.val << 14)
				else					// LSB
					bk[s.v] = (bk[s.v] & ~0x3f80)
							+ (s.val << 7)
//				continue
			default:
				continue
			}
			vb |= 1 << s.v
			i = s.instr
			if (i == undefined) {		// channel only
				if (s.chn != 9)
					continue
				i = bk[s.v] ? 0 : 128 * 128	// bank 256 program 0
			}
			if (bk[s.v]) 
				i += bk[s.v]		// bank number
			if (!params[i]) {
				params[i] = []		// instrument being loaded
				f(i, sf2par, sf2pre)	// sf2_create or load_instr
			}
		}
		nv = (2 << nv) - 1
		if (nv != vb			// if some voice(s) without instrument
		 && !params[0]) {
			params[0] = []		// load the piano
			f(0, sf2par, sf2pre)
		}
	} // def_instr()

	// load the needed instruments
	function load_res(s) {
	    if (abc2svg.sf2
	     || conf.sfu.slice(-4) == ".sf2"
	     || conf.sfu.slice(-3) == ".js") {

		// if the soundfont is loaded as .js
		if (abc2svg.sf2) {
			if (!parser) {
				parser = new sf2.Parser(b64dcod(abc2svg.sf2))
				parser.parse()
				presets = parser.getPresets()
			}

		// load the soundfont if not done yet
		} else if (!parser) {
		    w_instr++
		    if (conf.sfu.slice(-3) == ".js") {
			abc2svg.loadjs(conf.sfu,
				function() {
					load_res(s)	// load the instruments
					if (--w_instr == 0)
						play_start()
				},
				function() {
					errmsg('could not load the sound file '
						+ conf.sfu)
					if (--w_instr == 0)
						play_start()
				})
			return
		    }
		    var	r = new XMLHttpRequest()	// .sf2
			r.open('GET', conf.sfu, true)
			r.responseType = "arraybuffer"
			r.onload = function() {
				if (r.status === 200) {
					parser = new sf2.Parser(
							new Uint8Array(r.response))
					parser.parse()
					presets = parser.getPresets()
					load_res(s)	// load the instruments
					if (--w_instr == 0)
						play_start()
				} else {
					errmsg('could not load the sound file '
						+ conf.sfu)
					if (--w_instr == 0)
						play_start()
				}
			}
			r.onerror = function() {
					errmsg('could not load the sound file '
						+ conf.sfu)
				if (--w_instr == 0)
					play_start()
			}
			r.send()
			return
		}

		// create the instruments and start playing
		def_instr(s, sf2_create, parser, presets)
	    } else {

	// (case instruments as base64 encoded js file,
	//  one file per instrument)
		def_instr(s, load_instr)
	    }
	} // load_res()

	// return the play real time in seconds
	function get_time(po) {
		return po.ac.currentTime
	} // get_time()

	// MIDI control
	function midi_ctrl(po, s, t) {
		switch (s.ctrl) {
		case 0:				// bank MSB
			if (po.v_b[s.v] == undefined)
				po.v_b[s.v] = 0
			po.v_b[s.v] = (po.v_b[s.v] & ~0x1fc000)
					+ (s.val << 14)
			break
		case 7:				// volume
			s.p_v.vol = s.val / 127
			break
		case 32:			// bank LSB
			if (po.v_b[s.v] == undefined)
				po.v_b[s.v] = 0
			po.v_b[s.v] = (po.v_b[s.v] & ~0x3f80)
					+ (s.val << 7)
			break
		}
	} // midi_ctrl()

	// MIDI prog or channel
	function midi_prog(po, s) {
	    var	i = s.instr

		po.v_c[s.v] = s.chn
		if (i == undefined) {
			if (s.chn != 9)			// if not channel 9
				return
			i = po.v_b[s.v] ? 0 : 128 * 128	// bank 256 program 0
		}
		if (po.v_b[s.v])
			i += po.v_b[s.v]
		po.c_i[s.chn] = i
//console.log('prog i:'+i+' ch:'+s.chn+' v:'+s.v)
	} // midi_prog()

	// create a note
	// @po = play object
	// @s = symbol
	// @key = MIDI key + detune
	// @t = audio start time
	// @d = duration adjusted for speed
	function note_run(po, s, key, t, d) {
//console.log('run c:'+po.v_c[s.v]+' i:'+po.c_i[po.v_c[s.v]])
	    var	g, st,
		c = po.v_c[s.v],
		instr = po.c_i[c],
		k = key | 0,
		parm = params[instr][k],
		o = po.ac.createBufferSource(),
		v = s.p_v.vol == undefined ? 1 : s.p_v.vol	// volume (gain)

		if (!v			// mute voice
		 || !parm)		// if the instrument could not be loaded
			return		// or if it has not this key
		o.buffer = parm.buffer
		if (parm.loopStart) {
			o.loop = true
			o.loopStart = parm.loopStart
			o.loopEnd = parm.loopEnd
		}
		if (o.detune) {
		    var	dt = (key * 100) % 100
			if (dt)			// if micro-tone
				 o.detune.value = dt
		}
//		o.playbackRate.setValueAtTime(parm.rate, ac.currentTime)
		o.playbackRate.value = po.rates[instr][k]

		g = po.ac.createGain()
		if (parm.hold < 0.002) {
			g.gain.setValueAtTime(v, t)
		} else {
			if (parm.attack < 0.002) {
				g.gain.setValueAtTime(v, t)
			} else {
				g.gain.setValueAtTime(0, t)
				g.gain.linearRampToValueAtTime(v, t + parm.attack)
			}
			g.gain.setValueAtTime(v, t + parm.hold)
		}

		g.gain.exponentialRampToValueAtTime(parm.sustain * v,
					t + parm.decay)

		o.connect(g)
		g.connect(po.gain)

		// start the note
		o.start(t)
		o.stop(t + d)
	} // note_run()

	// wait for all resources, then start playing
	function play_start() {
//console.log('- play start')
		if (po.stop) {			// stop playing
			po.onend(repv)
			return
		}

		// all resources are there
		gain.connect(ac.destination)
		abc2svg.play_next(po)
	} // play_start()

	// Audio5 function

	init_b64d()			// initialize base64 decoding

	if (!conf.sfu)
		conf.sfu = "Scc1t2"	// set the default soundfont location

	// get the device model
	if (navigator.userAgentData
	 && navigator.userAgentData.getHighEntropyValues)
		navigator.userAgentData.getHighEntropyValues(['model'])
			.then(function(ua) {
				model = ua.model
			})
	else
		model = navigator.userAgent

    // public methods
    return {

	// get outputs
	get_outputs: function() {
		return (window.AudioContext || window.webkitAudioContext) ?
				['sf2'] : null
	}, // get_outputs()

	// play the symbols
	play: function(i_start, i_end, i_lvl) {

		// get the callback functions
		errmsg = conf.errmsg || alert

		// play a null file to unlock the iOS audio
		// This is needed for iPhone/iPad/...
		function play_unlock() {
		    var buf = ac.createBuffer(1, 1, 22050),
			src = ac.createBufferSource()

			src.buffer = buf
			src.connect(ac.destination)
			src.start(0)
		}

		// initialize the audio subsystem if not done yet
		if (!gain) {
			ac = conf.ac
			if (!ac) {
				conf.ac = ac = new (window.AudioContext ||
							window.webkitAudioContext)
				if (/iPad|iPhone|iPod/.test(model))
					play_unlock()
			}
			gain = ac.createGain()
			gain.gain.value = conf.gain
		}

		while (i_start.noplay)
			i_start = i_start.ts_next
		po = {
			conf: conf,	// configuration
			onend: conf.onend || empty,
			onnote: conf.onnote || empty,
//			stop: false,	// stop playing
			s_end: i_end,	// last music symbol / null
			s_cur: i_start,	// current music symbol
//			repn: false,	// don't repeat
			repv: i_lvl || 0, // repeat variant number
			tgen: 2,	// // generate by 2 seconds
			get_time: get_time,
			midi_ctrl: midi_ctrl,
			midi_prog: midi_prog,
			note_run: note_run,
			timouts: [],
			v_c: [],	// voice to channel
			c_i: [],	// channel to instrument
			v_b: [],	// voice to bank

			// audio specific
			ac: ac,
			gain: gain,
			rates: rates
		}
		w_instr++			// play lock
		load_res(i_start)
		if (--w_instr == 0)		// all resources are there
			play_start()
	}, // play()

	// stop playing
	stop: function() {
		po.stop = true
		po.timouts.forEach(function(id) {
					clearTimeout(id)
				})
		abc2svg.play_next(po)
		if (gain) {
			gain.disconnect()
			gain = null
		}
	}, // stop()

	// set volume
	set_vol: function(v) {
		if (gain)
			gain.gain.value = v
	} // set_vol()
    } // returned object
} // Audio5()
/*! JavaScript SoundFont 2 Parser. Copyright 2013-2015 imaya/GREE Inc and Colin Clark. Licensed under the MIT License. */
// https://github.com/colinbdclark/sf2-parser
/*
 * JavaScript SoundFont 2 Parser
 *
 * Copyright 2013 imaya/GREE Inc
 * Copyright 2015 Colin Clark
 *
 * Based on code from the "SoundFont Synthesizer for WebMidiLink"
 *   https://github.com/gree/sf2synth.js
 *
 * Adapted to abc2svg
 * Copyright (C) 2018-2021 Jean-Francois Moine
 *
 * Licensed under the MIT License.
 */

/*global require*/

(function (root, factory) {
    if (typeof exports === "object") {
        // We're in a CommonJS-style loader.
        root.sf2 = exports;
        factory(exports);
    } else if (typeof define === "function" && define.amd) {
        // We're in an AMD-style loader.
        define(["exports"], function (exports) {
            root.sf2 = exports;
            return (root.sf2, factory(exports));
        });
    } else {
        // Plain old browser.
        root.sf2 = {};
        factory(root.sf2);
    }
}(this, function (sf2) {		// exports
    "use strict";

    sf2.Parser = function (input, options) {
      options = options || {};
      /** @type {ByteArray} */
      this.input = input;
      /** @type {(Object|undefined)} */
      this.parserOptions = options.parserOptions;

      /** @type {Array.<Object>} */
      // this.presetHeader;
      /** @type {Array.<Object>} */
      // this.presetZone;
      /** @type {Array.<Object>} */
      // this.presetZoneModulator;
      /** @type {Array.<Object>} */
      // this.presetZoneGenerator;
      /** @type {Array.<Object>} */
      // this.instrument;
      /** @type {Array.<Object>} */
      // this.instrumentZone;
      /** @type {Array.<Object>} */
      // this.instrumentZoneModulator;
      /** @type {Array.<Object>} */
      // this.instrumentZoneGenerator;
      /** @type {Array.<Object>} */
      //this.sampleHeader;
    };

    sf2.Parser.prototype.parse = function () {
      /** @type {sf2.Riff.Parser} */
      var parser = new sf2.Riff.Parser(this.input, this.parserOptions),
      /** @type {?sf2.Riff.Chunk} */
	  chunk;

      // parse RIFF chunk
      parser.parse();
      if (parser.chunkList.length !== 1)
        throw new Error('wrong chunk length');

      chunk = parser.getChunk(0);
      if (chunk === null)
        throw new Error('chunk not found');

      this.parseRiffChunk(chunk);

      // TODO: Presumably this is here to reduce memory,
      // but does it really matter? Shouldn't we always be
      // referencing the underlying ArrayBuffer and thus
      // it will persist, in which case why delete it?
      this.input = null;
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parseRiffChunk = function (chunk) {
      /** @type {sf2.Riff.Parser} */
      var parser,
      /** @type {ByteArray} */
	  data = this.input,
      /** @type {number} */
	  ip = chunk.offset,
      /** @type {string} */
	  signature;

      // check parse target
      if (chunk.type !== 'RIFF')
        throw new Error('invalid chunk type:' + chunk.type);

      // check signature
      signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
      if (signature !== 'sfbk')
        throw new Error('invalid signature:' + signature);

      // read structure
      parser = new sf2.Riff.Parser(data, {'index': ip, 'length': chunk.size - 4});
      parser.parse();
      if (parser.getNumberOfChunks() !== 3)
        throw new Error('invalid sfbk structure');

      // INFO-list
      this.parseInfoList(/** @type {!sf2.Riff.Chunk} */parser.getChunk(0));

      // sdta-list
      this.parseSdtaList(/** @type {!sf2.Riff.Chunk} */parser.getChunk(1));

      // pdta-list
      this.parsePdtaList(/** @type {!sf2.Riff.Chunk} */parser.getChunk(2));
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parseInfoList = function (chunk) {
      /** @type {sf2.Riff.Parser} */
      var parser,
      /** @type {ByteArray} */
	  data = this.input,
      /** @type {number} */
	  ip = chunk.offset,
      /** @type {string} */
	  signature;

      // check parse target
      if (chunk.type !== 'LIST')
        throw new Error('invalid chunk type:' + chunk.type);

      // check signature
      signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
      if (signature !== 'INFO')
        throw new Error('invalid signature:' + signature);

      // read structure
      parser = new sf2.Riff.Parser(data, {'index': ip, 'length': chunk.size - 4});
      parser.parse();
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parseSdtaList = function (chunk) {
      /** @type {sf2.Riff.Parser} */
      var parser,
      /** @type {ByteArray} */
	  data = this.input,
      /** @type {number} */
	  ip = chunk.offset,
      /** @type {string} */
	  signature;

      // check parse target
      if (chunk.type !== 'LIST')
        throw new Error('invalid chunk type:' + chunk.type);

      // check signature
      signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
      if (signature !== 'sdta')
        throw new Error('invalid signature:' + signature);

      // read structure
      parser = new sf2.Riff.Parser(data, {'index': ip, 'length': chunk.size - 4});
      parser.parse();
      if (parser.chunkList.length !== 1)
        throw new Error('TODO');
      this.samplingData =
        /** @type {{type: string, size: number, offset: number}} */
	  parser.getChunk(0);
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parsePdtaList = function (chunk) {
      /** @type {sf2.Riff.Parser} */
      var parser,
      /** @type {ByteArray} */
	  data = this.input,
      /** @type {number} */
	  ip = chunk.offset,
      /** @type {string} */
	  signature;

      // check parse target
      if (chunk.type !== 'LIST')
        throw new Error('invalid chunk type:' + chunk.type);

      // check signature
      signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
      if (signature !== 'pdta')
        throw new Error('invalid signature:' + signature);

      // read structure
      parser = new sf2.Riff.Parser(data, {'index': ip, 'length': chunk.size - 4});
      parser.parse();

      // check number of chunks
      if (parser.getNumberOfChunks() !== 9)
        throw new Error('invalid pdta chunk');

      this.parsePhdr(/** @type {sf2.Riff.Chunk} */(parser.getChunk(0)));
      this.parsePbag(/** @type {sf2.Riff.Chunk} */(parser.getChunk(1)));
      this.parsePmod(/** @type {sf2.Riff.Chunk} */(parser.getChunk(2)));
      this.parsePgen(/** @type {sf2.Riff.Chunk} */(parser.getChunk(3)));
      this.parseInst(/** @type {sf2.Riff.Chunk} */(parser.getChunk(4)));
      this.parseIbag(/** @type {sf2.Riff.Chunk} */(parser.getChunk(5)));
      this.parseImod(/** @type {sf2.Riff.Chunk} */(parser.getChunk(6)));
      this.parseIgen(/** @type {sf2.Riff.Chunk} */(parser.getChunk(7)));
      this.parseShdr(/** @type {sf2.Riff.Chunk} */(parser.getChunk(8)));
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parsePhdr = function (chunk) {
      /** @type {ByteArray} */
      var data = this.input,
      /** @type {number} */
	  ip = chunk.offset,
      /** @type {Array.<Object>} */
	  presetHeader = this.presetHeader = [],
      /** @type {number} */
	  size = chunk.offset + chunk.size;

      // check parse target
      if (chunk.type !== 'phdr')
        throw new Error('invalid chunk type:' + chunk.type);

      while (ip < size) {
        presetHeader.push({
          presetName: String.fromCharCode.apply(null, data.subarray(ip, ip += 20)),
          preset: data[ip++] | (data[ip++] << 8),
          bank: data[ip++] | (data[ip++] << 8),
          presetBagIndex: data[ip++] | (data[ip++] << 8),
          library: (data[ip++] | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0,
          genre: (data[ip++] | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0,
          morphology: (data[ip++] | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0
        });
      }
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parsePbag = function (chunk) {
      /** @type {ByteArray} */
      var data = this.input,
      /** @type {number} */
	  ip = chunk.offset,
      /** @type {Array.<Object>} */
	  presetZone = this.presetZone = [],
      /** @type {number} */
	  size = chunk.offset + chunk.size;

      // check parse target
      if (chunk.type !== 'pbag')
        throw new Error('invalid chunk type:'  + chunk.type);

      while (ip < size) {
        presetZone.push({
          presetGeneratorIndex: data[ip++] | (data[ip++] << 8),
          presetModulatorIndex: data[ip++] | (data[ip++] << 8)
        });
      }
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parsePmod = function (chunk) {
      // check parse target
      if (chunk.type !== 'pmod')
        throw new Error('invalid chunk type:' + chunk.type);

      this.presetZoneModulator = this.parseModulator(chunk);
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parsePgen = function (chunk) {
      // check parse target
      if (chunk.type !== 'pgen')
        throw new Error('invalid chunk type:' + chunk.type);
      this.presetZoneGenerator = this.parseGenerator(chunk);
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parseInst = function (chunk) {
      /** @type {ByteArray} */
      var data = this.input,
      /** @type {number} */
	  ip = chunk.offset,
      /** @type {Array.<Object>} */
	  instrument = this.instrument = [],
      /** @type {number} */
	  size = chunk.offset + chunk.size;

      // check parse target
      if (chunk.type !== 'inst')
        throw new Error('invalid chunk type:' + chunk.type);

      while (ip < size) {
        instrument.push({
          instrumentName: String.fromCharCode.apply(null, data.subarray(ip, ip += 20)),
          instrumentBagIndex: data[ip++] | (data[ip++] << 8)
        });
      }
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parseIbag = function (chunk) {
      /** @type {ByteArray} */
      var data = this.input,
      /** @type {number} */
	  ip = chunk.offset,
      /** @type {Array.<Object>} */
	  instrumentZone = this.instrumentZone = [],
      /** @type {number} */
	  size = chunk.offset + chunk.size;

      // check parse target
      if (chunk.type !== 'ibag')
        throw new Error('invalid chunk type:' + chunk.type);

      while (ip < size) {
        instrumentZone.push({
          instrumentGeneratorIndex: data[ip++] | (data[ip++] << 8),
          instrumentModulatorIndex: data[ip++] | (data[ip++] << 8)
        });
      }
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parseImod = function (chunk) {
      // check parse target
      if (chunk.type !== 'imod')
        throw new Error('invalid chunk type:' + chunk.type);

      this.instrumentZoneModulator = this.parseModulator(chunk);
    };


    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parseIgen = function (chunk) {
      // check parse target
      if (chunk.type !== 'igen')
        throw new Error('invalid chunk type:' + chunk.type);

      this.instrumentZoneGenerator = this.parseGenerator(chunk);
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     */
    sf2.Parser.prototype.parseShdr = function (chunk) {
      /** @type {ByteArray} */
      var data = this.input,
      /** @type {number} */
	  ip = chunk.offset,
      /** @type {Array.<Object>} */
	  samples = this.sample = [],
      /** @type {Array.<Object>} */
	  sampleHeader = this.sampleHeader = [],
      /** @type {number} */
	  size = chunk.offset + chunk.size,
      /** @type {string} */
	  sampleName,
      /** @type {number} */
	  start,
      /** @type {number} */
	  end,
      /** @type {number} */
	  startLoop,
      /** @type {number} */
	  endLoop,
      /** @type {number} */
	  sampleRate,
      /** @type {number} */
	  originalPitch,
      /** @type {number} */
	  pitchCorrection,
      /** @type {number} */
	  sampleLink,
      /** @type {number} */
	  sampleType;

      // check parse target
      if (chunk.type !== 'shdr')
        throw new Error('invalid chunk type:' + chunk.type);

      while (ip < size) {
        sampleName = String.fromCharCode.apply(null, data.subarray(ip, ip += 20));
        start =
          (data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24);
        end =
          (data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24);
        startLoop =
          (data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24);
        endLoop =
          (data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24);
        sampleRate =
          (data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24);
        originalPitch = data[ip++];
        pitchCorrection = (data[ip++] << 24) >> 24;
        sampleLink = data[ip++] | (data[ip++] << 8);
        sampleType = data[ip++] | (data[ip++] << 8);

        var sample = new Int16Array(new Uint8Array(data.subarray(
          this.samplingData.offset + start * 2,
          this.samplingData.offset + end   * 2
        )).buffer);

        startLoop -= start;
        endLoop -= start;

        if (sampleRate > 0) {
          var adjust = this.adjustSampleData(sample, sampleRate);
          sample = adjust.sample;
          sampleRate *= adjust.multiply;
          startLoop *= adjust.multiply;
          endLoop *= adjust.multiply;
        }

        samples.push(sample);

        sampleHeader.push({
          sampleName: sampleName,
          /*
          start: start,
          end: end,
          */
          startLoop: startLoop,
          endLoop: endLoop,
          sampleRate: sampleRate,
          originalPitch: originalPitch,
          pitchCorrection: pitchCorrection,
          sampleLink: sampleLink,
          sampleType: sampleType
        });
      }
    };

    // TODO: This function is questionable;
    // it doesn't interpolate the sample data
    // and always forces a sample rate of 22050 or higher. Why?
    sf2.Parser.prototype.adjustSampleData = function (sample, sampleRate) {
      /** @type {Int16Array} */
      var newSample,
      /** @type {number} */
	  i,
      /** @type {number} */
	  il,
      /** @type {number} */
	  j,
      /** @type {number} */
	  multiply = 1;

      // buffer
      while (sampleRate < 22050) {
        newSample = new Int16Array(sample.length * 2);
        for (i = j = 0, il = sample.length; i < il; ++i) {
          newSample[j++] = sample[i];
          newSample[j++] = sample[i];
        }
        sample = newSample;
        multiply *= 2;
        sampleRate *= 2;
      }

      return {
        sample: sample,
        multiply: multiply
      };
    };

    /**
     * @param {sf2.Riff.Chunk} chunk
     * @return {Array.<Object>}
     */
    sf2.Parser.prototype.parseModulator = function (chunk) {
        /** @type {ByteArray} */
        var data = this.input,
        /** @type {number} */
	    ip = chunk.offset,
        /** @type {number} */
	    size = chunk.offset + chunk.size,
        /** @type {number} */
	    code,
        /** @type {string} */
	    key,
        /** @type {Array.<Object>} */
	    output = [];

        while (ip < size) {
          // Src  Oper
          // TODO
          ip += 2;

          // Dest Oper
          code = data[ip++] | (data[ip++] << 8);
          key = sf2.Parser.GeneratorEnumeratorTable[code];
          if (key === undefined) {
            // Amount
            output.push({
              type: key,
              value: {
                code: code,
                amount: data[ip] | (data[ip+1] << 8) << 16 >> 16,
                lo: data[ip++],
                hi: data[ip++]
              }
            });
          } else {
            // Amount
            switch (key) {
              case 'keyRange': /* FALLTHROUGH */
              case 'velRange': /* FALLTHROUGH */
              case 'keynum': /* FALLTHROUGH */
              case 'velocity':
                output.push({
                  type: key,
                  value: {
                    lo: data[ip++],
                    hi: data[ip++]
                  }
                });
                break;
              default:
                output.push({
                  type: key,
                  value: {
                    amount: data[ip++] | (data[ip++] << 8) << 16 >> 16
                  }
                });
                break;
            }
          }

          // AmtSrcOper
          // TODO
          ip += 2;

          // Trans Oper
          // TODO
          ip += 2;
        }

        return output;
      };

    /**
     * @param {sf2.Riff.Chunk} chunk
     * @return {Array.<Object>}
     */
    sf2.Parser.prototype.parseGenerator = function (chunk) {
      /** @type {ByteArray} */
      var data = this.input,
      /** @type {number} */
	  ip = chunk.offset,
      /** @type {number} */
	  size = chunk.offset + chunk.size,
      /** @type {number} */
	  code,
      /** @type {string} */
	  key,
      /** @type {Array.<Object>} */
	  output = [];

      while (ip < size) {
        code = data[ip++] | (data[ip++] << 8);
        key = sf2.Parser.GeneratorEnumeratorTable[code];
        if (key === undefined) {
          output.push({
            type: key,
            value: {
              code: code,
              amount: data[ip] | (data[ip+1] << 8) << 16 >> 16,
              lo: data[ip++],
              hi: data[ip++]
            }
          });
          continue;
        }

        switch (key) {
          case 'keynum': /* FALLTHROUGH */
          case 'keyRange': /* FALLTHROUGH */
          case 'velRange': /* FALLTHROUGH */
          case 'velocity':
            output.push({
              type: key,
              value: {
                lo: data[ip++],
                hi: data[ip++]
              }
            });
            break;
          default:
            output.push({
              type: key,
              value: {
                amount: data[ip++] | (data[ip++] << 8) << 16 >> 16
              }
            });
            break;
        }
      }

      return output;
    };

//    sf2.Parser.prototype.getInstruments = function () {
//      /** @type {Array.<Object>} */
//      var instrument = this.instrument,
//      /** @type {Array.<Object>} */
//	  zone = this.instrumentZone,
//      /** @type {Array.<Object>} */
//	  output = [],
//      /** @type {number} */
//	  bagIndex,
//      /** @type {number} */
//	  bagIndexEnd,
//      /** @type {Array.<Object>} */
//	  zoneInfo,
//      /** @type {{generator: Object, generatorInfo: Array.<Object>}} */
//	  instrumentGenerator,
//      /** @type {{modulator: Object, modulatorInfo: Array.<Object>}} */
//	  instrumentModulator,
//      /** @type {number} */
//	  i,
//      /** @type {number} */
//	  il,
//      /** @type {number} */
//	  j,
//      /** @type {number} */
//	  jl;
//
//      // instrument -> instrument bag -> generator / modulator
//      for (i = 0, il = instrument.length; i < il; ++i) {
//        bagIndex    = instrument[i].instrumentBagIndex;
//        bagIndexEnd = instrument[i+1] ? instrument[i+1].instrumentBagIndex : zone.length;
//        zoneInfo = [];
//
//        // instrument bag
//        for (j = bagIndex, jl = bagIndexEnd; j < jl; ++j) {
//          instrumentGenerator = this.createInstrumentGenerator_(zone, j);
//          instrumentModulator = this.createInstrumentModulator_(zone, j);
//
//          zoneInfo.push({
//            generator: instrumentGenerator.generator,
//            modulator: instrumentModulator.modulator,
//          });
//        }
//
//        output.push({
//          name: instrument[i].instrumentName,
//          info: zoneInfo
//        });
//      }
//
//      return output;
//    };

    sf2.Parser.prototype.getPresets = function () {
      /** @type {Array.<Object>} */
      var preset   = this.presetHeader,
      /** @type {Array.<Object>} */
	  zone = this.presetZone,
      /** @type {Array.<Object>} */
	  output = [],
      /** @type {number} */
	  bagIndex,
      /** @type {number} */
	  bagIndexEnd,
      /** @type {Array.<Object>} */
	  zoneInfo,
      /** @type {number} */
//	  instrument,
      /** @type {{generator: Object, generatorInfo: Array.<Object>}} */
	  presetGenerator,
      /** @type {{modulator: Object, modulatorInfo: Array.<Object>}} */
	  presetModulator,
      /** @type {number} */
	  i,
      /** @type {number} */
	  il,
      /** @type {number} */
	  j,
      /** @type {number} */
	  jl

      // preset -> preset bag -> generator / modulator
      for (i = 0, il = preset.length; i < il; ++i) {
//        bagIndex    = preset[i].presetBagIndex;
	j = preset[i].presetBagIndex
//        bagIndexEnd = preset[i+1] ? preset[i+1].presetBagIndex : zone.length;
	jl = preset[i+1] ? preset[i+1].presetBagIndex : zone.length
        zoneInfo = [];

        // preset bag
//        for (j = bagIndex, jl = bagIndexEnd; j < jl; ++j) {
        for ( ; j < jl; ++j) {
          presetGenerator = this.createPresetGenerator_(zone, j);
          presetModulator = this.createPresetModulator_(zone, j);

          zoneInfo.push({
            generator: presetGenerator.generator,
//            generatorSequence: presetGenerator.generatorInfo,
            modulator: presetModulator.modulator,
//            modulatorSequence: presetModulator.modulatorInfo
          });

//          instrument =
//            presetGenerator.generator.instrument !== undefined ?
//              presetGenerator.generator.instrument.amount :
//            presetModulator.modulator.instrument !== undefined ?
//              presetModulator.modulator.instrument.amount :
//            null;
        }

        output.push({
//          name: preset[i].presetName,
          info: zoneInfo,
          header: preset[i],
//          instrument: instrument
        });
      }

      return output;
    };

    /**
     * @param {Array.<Object>} zone
     * @param {number} index
     * @returns {{generator: Object, generatorInfo: Array.<Object>}}
     * @private
     */
    sf2.Parser.prototype.createInstrumentGenerator_ = function (zone, index) {
      var modgen = this.createBagModGen_(
        zone,
        zone[index].instrumentGeneratorIndex,
        zone[index+1] ? zone[index+1].instrumentGeneratorIndex: this.instrumentZoneGenerator.length,
        this.instrumentZoneGenerator
      );

      return {
        generator: modgen.modgen,
      };
    };

    /**
     * @param {Array.<Object>} zone
     * @param {number} index
     * @returns {{modulator: Object, modulatorInfo: Array.<Object>}}
     * @private
     */
    sf2.Parser.prototype.createInstrumentModulator_ = function (zone, index) {
      var modgen = this.createBagModGen_(
        zone,
        zone[index].presetModulatorIndex,
        zone[index+1] ? zone[index+1].instrumentModulatorIndex: this.instrumentZoneModulator.length,
        this.instrumentZoneModulator
      );

      return {
        modulator: modgen.modgen
      };
    };

    /**
     * @param {Array.<Object>} zone
     * @param {number} index
     * @returns {{generator: Object, generatorInfo: Array.<Object>}}
     * @private
     */
    sf2.Parser.prototype.createPresetGenerator_ = function (zone, index) {
      var modgen = this.createBagModGen_(
        zone,
        zone[index].presetGeneratorIndex,
        zone[index+1] ? zone[index+1].presetGeneratorIndex : this.presetZoneGenerator.length,
        this.presetZoneGenerator
      );

      return {
        generator: modgen.modgen,
//        generatorInfo: modgen.modgenInfo
      };
    };

      /**
       * @param {Array.<Object>} zone
       * @param {number} index
       * @returns {{modulator: Object, modulatorInfo: Array.<Object>}}
       * @private
       */
    sf2.Parser.prototype.createPresetModulator_ = function (zone, index) {
      /** @type {{modgen: Object, modgenInfo: Array.<Object>}} */
      var modgen = this.createBagModGen_(
        zone,
        zone[index].presetModulatorIndex,
        zone[index+1] ? zone[index+1].presetModulatorIndex : this.presetZoneModulator.length,
        this.presetZoneModulator
      );

      return {
        modulator: modgen.modgen,
//        modulatorInfo: modgen.modgenInfo
      };
    };

    /**
     * @param {Array.<Object>} zone
     * @param {number} indexStart
     * @param {number} indexEnd
     * @param zoneModGen
     * @returns {{modgen: Object, modgenInfo: Array.<Object>}}
     * @private
     */
    sf2.Parser.prototype.createBagModGen_ = function (zone, indexStart, indexEnd, zoneModGen) {
      /** @type {Object} */
      var modgen = {
        unknown: [],
        'keyRange': {
          hi: 127,
          lo: 0
        }
      }; // TODO
      /** @type {Object} */
      var info,
      /** @type {number} */
	  i,
      /** @type {number} */
	  il;

      for (i = indexStart, il = indexEnd; i < il; ++i) {
        info = zoneModGen[i];

        if (info.type === 'unknown')
          modgen.unknown.push(info.value);
	else
          modgen[info.type] = info.value;
      }

      return {
        modgen: modgen
      };
    };


    /**
     * @type {Array.<string>}
     * @const
     */
    sf2.Parser.GeneratorEnumeratorTable = [
      'startAddrsOffset',
      'endAddrsOffset',
      'startloopAddrsOffset',
      'endloopAddrsOffset',
      'startAddrsCoarseOffset',
      'modLfoToPitch',
      'vibLfoToPitch',
      'modEnvToPitch',
      'initialFilterFc',
      'initialFilterQ',
      'modLfoToFilterFc',
      'modEnvToFilterFc',
      'endAddrsCoarseOffset',
      'modLfoToVolume',
      undefined, // 14
      'chorusEffectsSend',
      'reverbEffectsSend',
      'pan',
      undefined,
      undefined,
      undefined, // 18,19,20
      'delayModLFO',
      'freqModLFO',
      'delayVibLFO',
      'freqVibLFO',
      'delayModEnv',
      'attackModEnv',
      'holdModEnv',
      'decayModEnv',
      'sustainModEnv',
      'releaseModEnv',
      'keynumToModEnvHold',
      'keynumToModEnvDecay',
      'delayVolEnv',
      'attackVolEnv',
      'holdVolEnv',
      'decayVolEnv',
      'sustainVolEnv',
      'releaseVolEnv',
      'keynumToVolEnvHold',
      'keynumToVolEnvDecay',
      'instrument',
      undefined, // 42
      'keyRange',
      'velRange',
      'startloopAddrsCoarseOffset',
      'keynum',
      'velocity',
      'initialAttenuation',
      undefined, // 49
      'endloopAddrsCoarseOffset',
      'coarseTune',
      'fineTune',
      'sampleID',
      'sampleModes',
      undefined, // 55
      'scaleTuning',
      'exclusiveClass',
      'overridingRootKey'
    ];

    sf2.Riff = {};

    sf2.Riff.Parser = function (input, options) {
      options = options || {};
      /** @type {ByteArray} */
      this.input = input;
      /** @type {number} */
      this.ip = options.index || 0;
      /** @type {number} */
      this.length = options.length || input.length - this.ip;
      /** @type {Array.<sf2.Riff.Chunk>} */
    //   this.chunkList;
      /** @type {number} */
      this.offset = this.ip;
      /** @type {boolean} */
      this.padding = options.padding !== undefined ? options.padding : true;
      /** @type {boolean} */
      this.bigEndian = options.bigEndian !== undefined ? options.bigEndian : false;
    };

    /**
     * @param {string} type
     * @param {number} size
     * @param {number} offset
     * @constructor
     */
    sf2.Riff.Chunk = function (type, size, offset) {
      /** @type {string} */
      this.type = type;
      /** @type {number} */
      this.size = size;
      /** @type {number} */
      this.offset = offset;
    };

    sf2.Riff.Parser.prototype.parse = function () {
      /** @type {number} */
      var length = this.length + this.offset;

      this.chunkList = [];

      while (this.ip < length)
        this.parseChunk();
    };

    sf2.Riff.Parser.prototype.parseChunk = function () {
      /** @type {ByteArray} */
      var input = this.input,
      /** @type {number} */
	  ip = this.ip,
      /** @type {number} */
	  size;

      this.chunkList.push(new sf2.Riff.Chunk(
        String.fromCharCode(input[ip++], input[ip++], input[ip++], input[ip++]),
        (size = this.bigEndian ?
           ((input[ip++] << 24) | (input[ip++] << 16) |
            (input[ip++] <<  8) | (input[ip++]      )) :
           ((input[ip++]      ) | (input[ip++] <<  8) |
            (input[ip++] << 16) | (input[ip++] << 24))
        ),
        ip
      ));

      ip += size;

      // padding
      if (this.padding && ((ip - this.offset) & 1) === 1)
        ip++;

      this.ip = ip;
    };

    /**
     * @param {number} index chunk index.
     * @return {?sf2.Riff.Chunk}
     */
    sf2.Riff.Parser.prototype.getChunk = function (index) {
      /** @type {sf2.Riff.Chunk} */
      var chunk = this.chunkList[index];

      if (chunk === undefined)
        return null;

      return chunk;
    };

    /**
     * @return {number}
     */
    sf2.Riff.Parser.prototype.getNumberOfChunks = function () {
      return this.chunkList.length;
    };

    return sf2;
}));
// sndmid.js - audio output using HTML5 MIDI
//
// Copyright (C) 2019-2023 Jean-Francois Moine
//
// This file is part of abc2svg.
//
// abc2svg is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg.  If not, see <http://www.gnu.org/licenses/>.

// Midi5 creation

// @conf: configuration object - all items are optional:
//	onend: callback function called at end of playing
//		Argument:
//			repv: last repeat variant number
//	onnote: callback function called on note start/stop playing
//		Arguments:
//			i: start index of the note in the ABC source
//			on: true on note start, false on note stop

//  When playing, the following items must/may be set:
//	speed: (mandatory) must be set to 1
//	new_speed: (optional) new speed value

// Midi5 methods

// get_outputs() - get the output ports
//
// set_output() - set the output port
//
// play() - start playing
// @start -
// @stop: start and stop music symbols
// @level: repeat variant (optional, default = 0)
//
// stop() - stop playing

function Midi5(i_conf) {
    var	po,
	conf = i_conf,		// configuration
	empty = function() {},
	rf,			// get_outputs result function
	op			// output MIDI port

	// return the play real time in seconds
	function get_time(po) {
		return window.performance.now() / 1000
	} // get_time()

	// create a note
	// @po = play object
	// @s = symbol
	// @k = MIDI key + detune
	// @t = audio start time (s)
	// @d = duration adjusted for speed (s)
	function note_run(po, s, k, t, d) {
	    var	j,
		a = (k * 100) % 100,	// detune in cents
		c = po.v_c[s.v],
		i = po.c_i[c]

		k |= 0			// remove the detune value

		t *= 1000		// convert to ms
		d *= 1000		

		if (a && Midi5.ma.sysexEnabled) {	// if microtone
// fixme: should cache the current microtone values
			po.op.send(new Uint8Array([
				0xf0, 0x7f,	// realtime SysEx
				0x7f,		// all devices
				0x08,		// MIDI tuning standard
				0x02,		// note change
				i & 0x7f,		// tuning prog number
				0x01,		// number of notes
					k,		// key
					k,		// note
					a / .78125,	// MSB fract
					0,		// LSB fract
				0xf7		// SysEx end
				]), t)
		}
		po.op.send(new Uint8Array([0x90 + c, k, 127]), t)	// note on
		po.op.send(new Uint8Array([0x80 + c, k, 0]), t + d - 20) // note off
	} // note_run()

	// send a MIDI control
	function midi_ctrl(po, s, t) {
		po.op.send(new Uint8Array([0xb0 + po.v_c[s.v],
					s.ctrl, s.val]),
			t * 1000)
	} // midi_ctrl()

	// change the channel and/or send a MIDI program	
	function midi_prog(po, s) {
	    var	i,
		c = s.chn

		po.v_c[s.v] = c

		// at channel start, reset and initialize the controllers
		if (po.c_i[c] == undefined) {
//fixme: does not work with fluidsynth
			po.op.send(new Uint8Array([0xb0 + c, 121, 0]))
//fixme: is this useful?
if(0){
			if (s.p_v.midictl) {
			    for (i in s.p_v.midictl)
				po.op.send(new Uint8Array([0xb0 + c,
							i,
							s.p_v.midictl[i]]))
			}
}
		}

		i = s.instr
		if (i != undefined) {		// if not channel only
			po.c_i[c] = i		// send a MIDI program
			po.op.send(new Uint8Array([0xc0 + c, i & 0x7f]))
		}
	} // midi_prog()

	// MIDI output is possible,
	// return the possible ports in return to get_outputs()
	function send_outputs(access) {
	    var	o, os,
		out = []

		Midi5.ma = access	// store the MIDI access in the Midi5 function

		if (access && access.outputs.size > 0) {
			os = access.outputs.values()
			while (1) {
				o = os.next()
				if (!o || o.done)
					break
				out.push(o.value.name)
			}
		}
		rf(out)
	} // send_outputs()

// public methods
	return {

		// get outputs
		get_outputs: function(f) {
			if (!navigator.requestMIDIAccess) {
				f()			// no MIDI
				return
			}
			rf = f

			// open MIDI with SysEx
			navigator.requestMIDIAccess({sysex: true}).then(
				send_outputs,
				function(msg) {

					// open MIDI without SysEx
					navigator.requestMIDIAccess().then(
						send_outputs,
						function(msg) {
							rf()
						}
					)
				}
			)
		}, // get_outputs()

		// set the output port
		set_output: function(name) {
			if (!Midi5.ma)
				return
		    var o,
			os = Midi5.ma.outputs.values()

			while (1) {
				o = os.next()
				if (!o || o.done)
					break
				if (o.value.name == name) {
					op = o.value
					break
				}
			}
		},

		// play the symbols
		play: function(i_start, i_end, i_lvl) {
			po = {
				conf: conf,	// configuration
				onend: conf.onend || empty,
				onnote: conf.onnote || empty,
//				stop: false,	// stop playing
				s_end: i_end,	// last music symbol / null
				s_cur: i_start,	// current music symbol
//				repn: false,	// don't repeat
				repv: i_lvl || 0, // repeat variant number
				tgen: 2, 	// generate by 2 seconds
				get_time: get_time,
				midi_ctrl: midi_ctrl,
				midi_prog: midi_prog,
				note_run: note_run,
				timouts: [],

				// MIDI specific
				op: op,		// output port
				v_c: [],	// voice to channel
				c_i: []		// channel to instrument
			}
if (0) {
// temperament
			op.send(new Uint8Array([
				0xf0, 0x7f,	// realtime SysEx
				0x7f,		// all devices
				0x08,		// MIDI tuning standard
				0x02,		// note change
				0x00,		// tuning prog number
				0x01,		// number of notes
					0x69,		// key
					0x69,		// note
					0x00,		// MSB fract
					0,		// LSB fract
				0xf7		// SysEx end
				]), t)
}

			abc2svg.play_next(po)
		}, // play()

		// stop playing
		stop: function() {
			po.stop = true
			po.timouts.forEach(function(id) {
						clearTimeout(id)
					})
			abc2svg.play_next(po)
//			po.onend(repv)
//fixme: op.clear() should exist...
			if (op && op.clear)
				op.clear()
		} // stop()
	} // returned object
} // end Midi5
// follow-1.js - file included in snd-1.js
//
// This script permits to follow the notes while playing.
// Scrolling the music may be disabled setting 'no_scroll' in the window object.
//
// Copyright (C) 2015-2022 Jean-Francois Moine
//
// This file is part of abc2svg.
//
// abc2svg is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with abc2svg.  If not, see <http://www.gnu.org/licenses/>.

// init
function follow(abc, user, playconf) {
    var	keep_types = {
		note: true,
		rest: true
	}

user.anno_stop = function(type, start, stop, x, y, w, h) {
	if (!keep_types[type])
		return

	// create a rectangle
	abc.out_svg('<rect class="abcr _' + start + '_" x="');
	abc.out_sxsy(x, '" y="', y);
	abc.out_svg('" width="' + w.toFixed(2) +
		'" height="' + abc.sh(h).toFixed(2) + '"/>\n')
}

	playconf.onnote = function(i, on) {
	    var	b, i, e, elts,
		x = 0,
		y = 0

		if (abc2svg.mu)			// if many tunes with same offsets
			elts = abc2svg.mu.d.getElementsByClassName('_' + i + '_')
		else
			elts = document.getElementsByClassName('_' + i + '_')
		if (!elts || !elts.length)
			return			// no symbol?
		e = elts[0]

		e.style.fillOpacity = on ? 0.4 : 0

			// scroll for the element to be in the screen
			if (on && !window.no_scroll) {	
				b = e.getBoundingClientRect()

				// normal
				if (b.top < 0
				 || b.bottom > window.innerHeight * .8)
					y = b.top - window.innerHeight * .3

				// single line
				if (b.left < 0
				 || b.right > window.innerWidth * .8)
					x = b.left - window.innerWidth * .3
				if (x || y)
					window.scrollBy({
						top: y,
						left: x,
						behavior: (x < 0 || y)
								? 'instant'
								: 'smooth'
					})
			}
	}
} // follow()

// create the style of the rectangles
(function () {
    var	sty = document.createElement("style")
	sty.innerHTML = ".abcr {fill: #d00000; fill-opacity: 0; z-index: 15}"
	document.head.appendChild(sty)
})()
// chord.js - generation of accompaniment
//
// Copyright (C) 2020-2022 Jean-Francois Moine and Seymour Shlien
//
// This file is part of abc2svg.
//
// abc2svg is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// abc2svg is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with abc2svg.  If not, see <http://www.gnu.org/licenses/>.

// -- chord table --
// index = chord symbol type
// value: array of strings
//	index = inversion
//	string = list of 2 characters
//		1st character = note (see abc2svg.letmid)
//		2nd character = octave ('+', ' ', '-')
abc2svg.ch_names = {
	'':	["C-E G C+", "E-C G C+", "G-C E G "],
	m:	["C-e G C+", "e-C G C+", "G-C e G "],
	'7':	["C-b-E G ", "E-C G b ", "G-E b C+", "b-E G C+"],
	m7:	["C-b-e G ", "e-C G b ", "G-e b C+", "b-e G C+"],
	m7b5:	["C-b-e g ", "e-C g b ", "g-e b C+", "b-e g C+"],
	M7:	["C-B-E G ", "E-C G B ", "G-E B C+", "B-E G C+"],
	'6':	["C-A-E G ", "E-C A B ", "A-E B C+", "B-E A C+"],
	m6:	["C-A-e G ", "e-C A B ", "A-e B C+", "B-e A C+"],
	aug:	["C-E a C+", "E-C a C+", "a-C E a "],
//	plus:	["C-E a C+", "E-C a C+", "a-C E a "],
	aug7:	["C-b-E a ", "E-C a b ", "a-E b C+", "b-E a C+"],
	dim:	["C-e g C+", "e-C g C+", "g-C e g "],
	dim7:	["C-e g A ", "e-C g A ", "g-e A C+", "A-C e G "],
	'9':	["C-b-E G D+", "E-C G b D+", "G-E b C+D+", "b-E G C+D+", "D-G-C E b "],
	m9:	["C-b-e G D+", "e-C G b D+", "G-e b C+D+", "b-e G C+D+", "D-G-C e b "],
	maj9:	["C-B-E G D+", "E-C G B D+", "G-E B C+D+", "B-E G C+D+", "D-G-C E B "],
	M9:	["C-B-E G D+", "E-C G B D+", "G-C E B D+", "B-E G C+D+", "D-G-C E B "],
	'11':	["C-b-E G D+F+", "E-C G b D+F+", "G-E b C+D+F+", "b-E G C+D+F+",
						"D-G-C E b F+", "F-D-G-C E b D+"],
	dim9:	["C-A-e g d+", "e-C g A d+", "g-C e A d+", "A-C e g d+", "D-g-C e A "],
	sus4:	["C-F G C+", "F-C G C+", "G-C F G "],
	sus9:	["C-D G C+", "D-C G C+", "G-C D G "],
	'7sus4': ["C-b-F G ", "F-C G b ", "G-F b C+", "b-C F G "],
	'7sus9': ["C-b-D G ", "D-C G b ", "G-D b C+", "b-C D G "],
	'5':	["C-G C+", "G-G C+"]
} // ch_names

abc2svg.midlet = "CdDeEFgGaAbB"		// MIDI pitch -> letter
abc2svg.letmid = {			// letter -> MIDI pitch
	C: 0,
	d: 1,
	D: 2,
	e: 3,
	E: 4,
	F: 5,
	g: 6,
	G: 7,
	a: 8,
	A: 9,
	b: 10,
	B: 11
} // letmid

abc2svg.chord = function(first,		// first symbol in time
			 voice_tb,	// table of the voices
			 cfmt) {	// tune parameters
    var	chnm, i, k, vch, s, gchon,
	C = abc2svg.C,
	trans = 48 + (cfmt.chord.trans ? cfmt.chord.trans * 12 : 0)

	// create a chord according to the bass note
	function chcr(b, ch) {
	    var	i, v,
		r = []

		b = abc2svg.midlet[b]
		i = ch.length
		while (--i > 0) {
			if (ch[i][0] == b)	// search the bass in the chord
				break
		}
		ch = ch[i]
		for (i = 0; i < ch.length; i += 2) {
			v = abc2svg.letmid[ch[i]]
			switch (ch[i + 1]) {
			case '+': v += 12; break
			case '-': v -= 12; break
			}
			r.push(v)
		}
		return r
	} // chcr()

	// get the playback part of the first chord symbol
	function filter(a_cs) {
	    var	i, cs, t

		for (i = 0; i < a_cs.length; i++) {
			cs = a_cs[i]
			if (cs.type != 'g')
				continue
			t = cs.otext
			if (t.slice(-1) == ')')		// if alternate chord
				t = t.replace(/\(.*/, '') // remove it
			return t.replace(/\(|\)|\[|\]/g,'') // remove ()[]
		}
	} // filter()

	// generate a chord
	function gench(sb) {
	    var	r, ch, b, m, n, not,
		a = filter(sb.a_gch),
		s = {
			v: vch.v,
			p_v: vch,
			type: C.NOTE,
			time: sb.time,
			notes: []
		}

		if (!a)
			return
		a = a.match(/([A-GN])([#♯b♭]?)([^/]*)\/?(.*)/)
			// a[1] = note, a[2] = acc, a[3] = type, a[4] = bass
		if (!a)
			return

		r = abc2svg.letmid[a[1]]		// root
		if (r == undefined) {
			if (a[1] != "N")
				return
			s.type = C.REST			// ("N") = no chord
			ch = [0]
			r = 0
		} else {
			switch (a[2]) {
			case "#":
			case "♯": r++; break
			case "b":
			case "♭": r--; break
			}
			if (!a[3]) {
				ch = chnm[""]
			} else {
				ch = abc2svg.ch_alias[a[3]]
				if (ch == undefined)
					ch = a[3]
				ch = chnm[ch]
				if (!ch)
					ch = a[3][0] == 'm' ? chnm.m : chnm[""]
			}
			if (a[4]) {			// bass
				b = a[4][0].toUpperCase()
				b = abc2svg.letmid[b]
				if (b != undefined) {
					switch (a[4][1]) {
					case "#":
					case "♯": b++; if (b >= 12) b = 0; break
					case "b":
					case "♭": b--;  if (b < 0) b = 11; break
					}
				}
			}
		}
		if (b == undefined)
			b = 0
		ch = chcr(b, ch)

		// generate the notes of the chord
		n = ch.length
		r += trans
		if (sb.p_v.tr_snd)
			r += sb.p_v.tr_snd
		for (m = 0; m < n; m++) {
			not = {
				midi: r + ch[m]
			}
			s.notes.push(not)
		}
		s.nhd = n - 1

		// insert the chord in the chord voice and in the tune
		s.prev = vch.last_sym
		vch.last_sym.next = s
		s.ts_next = sb.ts_next
		sb.ts_next = s
		s.ts_prev = sb
		if (s.ts_next)
			s.ts_next.ts_prev = s
		vch.last_sym = s
	} // gench()

	// -- chord() --

	// set the chordnames defined by %%MIDI chordname
	if (cfmt.chord.names) {
		chnm = Object.create(abc2svg.ch_names)
		for (k in cfmt.chord.names) {
			vch = ""
			for (i = 0; i < cfmt.chord.names[k].length; i++) {
				s = cfmt.chord.names[k][i]
				vch += abc2svg.midlet[s % 12]
				vch += i == 0 ? "-" :
					(s >= 12 ? "+" : " ")
			}
//fixme: no inversion
			chnm[k] = [ vch ]
		}
	} else {
		chnm = abc2svg.ch_names
	}

	// define the MIDI channel
	k = 0
	for (i = 0; i < voice_tb.length; i++) {
		if (k < voice_tb[i].chn)
			k = voice_tb[i].chn
	}
	if (k == 8)
		k++			// skip the channel 10

	// create the chord voice
	vch = {
		v: voice_tb.length,
		id: "_chord",
		time: 0,
		sym: {
			type: C.BLOCK,
			subtype: "midiprog",
			chn: k + 1,
			instr: cfmt.chord.prog || 0,
			time: 0,
			ts_prev: first,
			ts_next: first.ts_next
		},
		vol: cfmt.chord.vol || .6	// (external default 76.2)
	}
	vch.sym.p_v = vch
	vch.sym.v = vch.v
	vch.last_sym = vch.sym
	voice_tb.push(vch)
	first.ts_next = vch.sym

	// loop on the symbols and add the accompaniment chords
	gchon = cfmt.chord.gchon
	s = first
	while (1) {
		if (!s.ts_next) {
			if (gchon)
				vch.last_sym.dur = s.time - vch.last_sym.time
			break
		}
		s = s.ts_next
		if (!s.a_gch) {
			if (s.subtype == "midigch") {
				if (gchon && !s.on)
					vch.last_sym.dur = s.time - vch.last_sym.time
				gchon = s.on
			}
			continue
		}
		if (!gchon)
			continue
		for (i = 0; i < s.a_gch.length; i++) {
			gch = s.a_gch[i]
			if (gch.type != 'g')
				continue
			vch.last_sym.dur = s.time - vch.last_sym.time
			gench(s)
			break
		}
	}
} // chord()
