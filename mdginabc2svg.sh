#!/bin/bash
#===================================================================================
#
#				 FILE:	mdginabc2svg.sh
#
#	   		USAGE:	mdginabc2svg.sh n1 n2 n3 n4 n5 n6 n7 n8 n9 n10 n11 n12 n13 n14 n15 n16
#
#								where n1-n16 are any of the 11 possible outcomes of a toss of
#								two ordinary six-sided dice, e.g., n1-n16 are 16 integers, not necessarily 
#								unique, chosen from the set {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
#
#	DESCRIPTION:	Used for generating a Musical Dice Game (MDG) minuet based on  
#								K. 516f or K. 294d or K. Anh. C 30.01 (1792 publication attributed to #								W.A. Mozart by his publisher, Nikolaus Simrock).
#
#			 AUTHOR:	J.L.A. Uro (justineuro@gmail.com)
#  		VERSION:	1.0
#	 		CREATED:	0.08.2017 - 16:21:10 +08 2017
#		 REVISION: 
#==================================================================================

#----------------------------------------------------------------------------------
# declare the variables "diceS" and "measNR" as arrays
# diceS - array containing the 16 outcomes from input line
# measNR - array of all possible measure notes for a specific outcome
#----------------------------------------------------------------------------------
declare -a diceS measNR  

#----------------------------------------------------------------------------------
# input 16-sequence of tosses as given in the command line
#----------------------------------------------------------------------------------
diceS=($1 $2 $3 $4 $5 $6 $7 $8 $9 ${10} ${11} ${12} ${13} ${14} ${15} ${16})

#----------------------------------------------------------------------------------
# input rule table to determine corresponding G/F measures for each toss outcome
#----------------------------------------------------------------------------------
ruletab() {
	case $1 in
	2) measNR=(96 22 141 41 105 122 11 30 70 121 26 9 112 49 109 14);;
	3) measNR=(32 06 128 63 146 46 134 81 117 39 126 56 174 18 116 83);;
	4) measNR=(69 95 158 13 153 55 110 24 66 139 15 132 73 58 145 79);;
	5) measNR=(40 17 113 85 161 2 159 100 90 176 7 34 67 160 52 170);;
	6) measNR=(148 74 163 45 80 97 36 107 25 143 64 125 76 136 1 93);;
	7) measNR=(104 157 27 167 154 68 118 91 138 71 150 29 101 162 23 151);;
	8) measNR=(152 60 171 53 99 133 21 127 16 155 57 175 43 168 89 172);;
	9) measNR=(119 84 114 50 140 86 169 94 120 88 48 166 51 115 72 111);;
	10) measNR=(98 142 42 156 75 129 62 123 65 77 19 82 137 38 149 8);;
	11) measNR=(3 87 165 61 135 47 147 33 102 4 31 164 144 59 173 78);;
	12) measNR=(54 130 10 103 28 37 106 5 35 20 108 92 12 124 44 131);;
	esac
}

#----------------------------------------------------------------------------------
# input notes
# declare variables "notesG" and "notesF" as arrays
# notesG - array that contains the possible treble clef notes per measure
# notesF - array that contains the possible bass clef notes per measure
# measPerm - array that contains the measures corresponding to the dice toss outcomes
#----------------------------------------------------------------------------------
declare -a notesG notesF

#----------------------------------------------------------------------------------
# define notesG, array of 176 possible treble clef notes
#----------------------------------------------------------------------------------
notesG=("fdg  " "A^F/G/B/g/" "gce" "g!trill!d2" "[g2d2B2G2]z" "Gce" "e/c/e/g/c'/g/" "c2z" "[ec][dB]z" "B/A/B/c/d/B/" "e/c/B/A/G/^F/" "[cE][cE][cE]" "(cGE)" "c2z" "eg/e/c" "(a^fd)" "c/G/c/e/G/c/" "(Gce)" "e/c/eg" "gb/d'/d" "c/e/g/d/A/^f/" "ecG  " "f/e/d/e/f/g/" "[g2d2B2G2]z" "D/^F/A/d/^f/a/" "[ec][ec][ec]" "f/e/f/d/c/B/" "^f/d/A/a/f/d/" "B/d/g/d/B" "[g2d2B2G2]z" "e/c/G e" "Gce" "[g2d2B2G2]z" "e/c/d/B/G" "Ad^f" "A/e/d/g/^f/a/" "g/b/g/d/B" "cGe" "gGG" "c/B/c/e/G/c/" "c/B/c/e/G" "B/c/d/B/A/G/" "gf/e/d/c/" "Af/d/a/g/" "c/B/c/G/E/C/" "gb/g/d/B/" "gg/d/b" "ec/e/g/c'/" "(ecG)" "ce/c/G" "c/G/e/c/g/e/" "(d/^c/)d/f/G/B/" "[ec][e/c/][f/d/][ge]" "[cE][cE][cE]" "gbd" "d/B/Gz" "ecG" "gec" "gce" "gf/e/d/c/" "ce/c/g" "e/c/B/G/A/^F/" "e/c/B/c/G" "e/g/c'/g/e/c/" "d/A/d^f" "^faf" "c/B/c/e/G/c/" "gb/g/d/g/" "(gec)" "^fa/f/d/f/" "g/b/d'/b/g" "f/e/d/c/B/d/" "gec" "c'/b/c'/g/e/c/" "[^fd][fd][fd]" "c'/b/c'/g/e/c/" "g/b/gd" "cCz" "c2z" "d!turn!A^f" "[g2d2B2G2]z" "d/B/Gg" "c2z" "c/G/e/c/g/e/" "ceG" "dd/g/b" "gce" "g/d/g/b/g/d/" "f/e/dg" "^f/a/d'/a/f/a/" "[g2d2B2G2]z" "[dB]g/b/d" "c2z" "[g2d2B2G2]z" "gec" "ecG" "g/^f/g/d/B/G/" "cGe" "^fad" "[g2d2B2G2]z" "e/d/e/g/c'/g/" "^f/d/A f" "c/e/c/G/E" "e/d/e/g/c'/g/" "^fa/f/d/f/" "Ad/c/B/A/" "[g2d2B2G2]z" "(egc')" "d/f/d/f/B/d/" "([d/B/][c/A/])([c/A/][B/G/])([B/G/][A/^F/])" "c2z" "ecG" "fdB" "[dB][dB][dB]" "c/G/e/c/g/e/" "d/f/a/f/d/B/" "d/A/d/^f/a/f/" "e/a/g/b/^f/a/" "e/c/g/e/c'/g/" "d'a/^f/d/A/" "gb/g/d" "g/^f/g/b/d" "[g2d2B2G2]z" "[cE][cE][cE]" "g/e/d/B/G" "c/G/c/e/g/[e/c/]" "[g2d2B2G2]z" "Bdg" "a/g/^f/g/d" "[cE][cE][cE]" "c2z" "[ec][d/G/][B/G/]G" "dg/d/B/d/" "A/e/[d/B/][c/A/][B/G/][A/^F/]" "^ff/d/a" "c'/b/c'/g/e/c/" "cGe" "[^fdA]!trill!f2" "g/b/g/b/d" "AA/d/^f" "d/e/f/d/c/B/" "cGe" "gd/B/G" "gce" "d/f/A/d/B/d/" "[d^F][^fd][af]" "e/c'/b/g/a/^f/" "c'/b/c'/g/e/c/" "f/d/AB" "[ecG]!trill!e2" "c2z" "gf/e/d/c/" "d/A/^f/d/a/f/" "d/^c/d/^f/a/f/" "g/b/g/d/B/G/" "c/G/e/c/g" "e/d/e/g/c'/g/" "Bd/B/A/G/" "e/g/d/c/B/A/" "c/B/c/e/G/c/" "[d^F][d^F][d^F]" "e/d/e/g/c'/g/" "g/^f/g/d/B/G/" "dG2" "(dBG)" "d/b/g/d/B" "cc/d/e" "gf/e/d/c/" "e/g/d/g/A/^f/" "c2z" "B/c/d/e/f/d/" "c2z" "f/a/ A B/d/" "Gce" "e/c/B/d/g" "a/g/b/g/d/g/")

#----------------------------------------------------------------------------------
# define notesF, array of 176 possible bass clef notes
#----------------------------------------------------------------------------------
notesF=("F,D,G," "[G,2B,,2]z" "[E,2C,2]z" "G,,/B,,/G,B," "G,,G,/=F,/E,/D,/" "[E,2C,2]z" "[G,2C,2]z" "C,G,,C,," "G,2G,," "G,2z" "C,D,D,," "C,C,C,  " "[E,2G,2]z" "C,G,,C,," "[G,2C,2][E,C,]" "[^F,2D,2][F,C,]" "[G,2E,2]z" "[E,2C,2][G,C,]" "[G,2C,2][E,C,]" "B,,2z" "C,D,D,," "C,2z" "A,/G,/F,/G,/A,/B,/" "G,,G,/=F,/E,/D,/" "D,2C," "C,/E,/G,/E,/C/C,/" "[B,2G,2]z" "[A,2C,2]z" "G,2G,," "G,,G,/=F,/E,/D,/" "[G,2C,2][G,C,]" "[E,2C,2]z" "G,,G,/=F,/E,/D,/" "G,2z" "[^F,2D,2][A,C,]" "C,D,D,," "[D,2B,,2]z" "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "B,,/D,/G,/D,/B,/G,,/" "[E,2C,2]z" "[E,2C,2]z" "G,,2z" "[E,2C,2]z" "F,2G," "[G,2E,2]z" "[D,2B,,2]z" "[D,2B,,2]z" "[G,2C,2][E,C,]" "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "[G,2E,2]z" "[E,2C,2]z" "F,2G," "C,2z" "C,C,C,  " "[D,2B,,2]z" "[G,2G,,2]G," "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "[E,2C,2]z" "[G,2E,2]z" "C,D,D,," "C,2z" "[G,2C,2][G,C,]" "^F,2z & D,2x" "A,^F,D, & D,D,C," "[E,2C,2][G,E,]" "B,,2z" "[C,2E,2]z" "D,2C," "[D,2B,,2][D,B,,]" "F,2G," "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "E,2z & C,2x" "C,C,C,  " "[E,2C,2][G,C,]" "[D,2B,,2][G,B,,]" "C,2C,," "C,G,,C,," "C,2z" "G,,G,/=F,/E,/D,/" "G,2 [D,B,,] & B,,2 x" "C,G,,C,," "[E,2C,2]z" "[G,2E,2]z" "[G,2B,,2]z" "[E,2C,2][G,C,]" "[D,2B,,2][D,B,,]" "F,/E,/D,G," "[A,2C,2][A,C,]" "G,,G,/=F,/E,/D,/" "[G,2G,,2]G," "C,G,,C,," "G,,G,/=F,/E,/D,/" "E,2 z & C,2 x" "C,2z" "[D,2B,,2][G,B,,]" "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "[A,2C,2][A,C,]" "G,,G,/=F,/E,/D,/" "G,2 E, & C,2 C," "[A,2C,2][A,C,]" "[E,2C,2]z" "C,2z" "C,2z" "C,D,D,," "G,,G,/=F,/E,/D,/" "[G,2C,2][E,C,]" "[A,2F,2][DG,]" "C,D,D,," "C,G,,C,," "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "[B,2G,2]z" "G,G,G," "[E,2C,2]z" "F,2G," "[^F,2D,2]z" "C,D,D,," "[E,2C,2]z" "[^F,2D,2][F,C,]" "[G,2B,,2]z" "[D,B,,][D,B,,][G,B,,]" "G,,G,/=F,/E,/D,/" "C,C,C,  " "G,G,,z" "E,2 E,/C,/" "G,,G,/=F,/E,/D,/" "G,,2z" "[D,B,,][D,B,,][G,B,,]" "C,C,C,  " "C,G,,C,," "G,G,,z" "[G,2B,,2]z" "C,D,D,," "D,D,D, & C,C,C,  " "[E,2C,2]z" "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "D,,/D,/^C,/D,/^C,/D,/" "B,,2z" "[^F,C,][F,C,][A,C,]" "[G,2B,,2]G,," "[E,2C,2]z" "[D,2B,,2][D,B,,]" "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "F,2G," "C,C,C,  " "C,D,D,," "[E,2C,2]z" "F,2G," "C,/B,,/C,/D,/E,/^F,/" "C,G,,C,," "[E,2C,2]z" "C,2z" "C,2z" "[D,2B,,2]z" "[G,2E,2]z" "C,2z" "G,2z" "C,D,D,," "[E,2C,2][E,C,]" "C,C,C,  " "[G,2C,2][E,C,]" "[D,2B,,2]z" "G,/^F,/G,/D,/B,,/G,,/" "B,,2z" "[B,2G,2]z" "[E,2C,2]z" "[E,2C,2][G,E,]" "C,D,D,," "C,G,,C,," "[G,2G,,2][G,B,,]" "C,G,,C,," "F,2G," "[E,/C,/]G,/[E,/C,/]G,/[E,/C,/]G,/" "G,G,,z" "[D,2B,,2][D,B,,]")

#----------------------------------------------------------------------------------
# create cat-to-output-file function
#----------------------------------------------------------------------------------
catToFile(){
	cat >> $filen << EOT
$1
EOT
}

#----------------------------------------------------------------------------------
# create empty xhtml file
# set header info: generic index number, filename
#----------------------------------------------------------------------------------
fileInd=$1-$2-$3-$4-$5-$6-$7-$8-$9-${10}-${11}-${12}-${13}-${14}-${15}-${16}
filen="K516f-$fileInd.xhtml"
dbNum=$(( ${diceS[0]1}-1 +(${diceS[1]}-2)*11 +(${diceS[2]}-2)*11**2 +(${diceS[3]}-2)*11**3 +(${diceS[4]}-2)*11**4 +(${diceS[5]}-2)*11**5 +(${diceS[6]}-2)*11**6 +(${diceS[8]}-2)*11**7 +(${diceS[9]}-2)*11**8 +(${diceS[10]}-2)*11**9 +(${diceS[11]}-2)*11**10 +(${diceS[12]}-2)*11**11 +(${diceS[13]}-2)*11**12 +(${diceS[14]}-2)*11**13 ))

#----------------------------------------------------------------------------------
# calculate permutation number for the current dice toss (from 11^14 possibilities)
#----------------------------------------------------------------------------------
currMeas=0
for measj in ${diceS[*]} ; do
	currMeas=`expr $currMeas + 1`
	ruletab $measj
  measPerm="$measPerm${measNR[$currMeas-1]}:"
done
measPerm="$measPerm:"

#----------------------------------------------------------------------------------
# if output xhtml file already exists, then make a back-up copy
#----------------------------------------------------------------------------------
if [ -f $filen ]; then 
	mv $filen $filen."bak"
fi

#----------------------------------------------------------------------------------
# generate header info for xhtml output file
#----------------------------------------------------------------------------------
catToFile "<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.1//EN'
    'http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd'>
<html xmlns='http://www.w3.org/1999/xhtml'>
<head>
<meta http-equiv='Content-Type' content='text/html; charset=UTF-8'/>
<script src='js/abc2svg-1.js' type='text/javascript'></script>
<script src='js/abcemb-1.js' type='text/javascript'></script>
<script src='js/play-1.js' type='text/javascript'></script>
<style type='text/css'>
	svg {display:block}
</style>
<title>K516f-$dbNum</title>
</head>"

#----------------------------------------------------------------------------------
# generate the body for xhtml output file
#----------------------------------------------------------------------------------
catToFile "<body bgcolor='#ffffff'>
<center>
%abc-2.2
%<![CDATA[
%%scale 0.88
%%pagewidth 24cm
%%bgcolor white
%%topspace 0
%%composerspace 0
%%leftmargin 0.80cm
%%rightmargin 0.80cm
X:$dbNum
T:$fileInd
%%setfont-1 Courier-Bold 12
T:\$1K.516f::$measPerm\$0
T:\$1Perm. No.: $dbNum\$0
M:3/8
L:1/8
Q:1/8=111
%%staves [1 2]
V:1 clef=treble
V:2 clef=bass
K:C"

#----------------------------------------------------------------------------------
# write the notes into the body of the xhtml output file
#----------------------------------------------------------------------------------
currMeas=0
for measj in ${diceS[*]} ; do
	currMeas=`expr $currMeas + 1`
	ruletab $measj
	measN=${measNR[$currMeas-1]}
	phrG=${notesG[$measN-1]}
	phrF=${notesF[$measN-1]}
	if [ "${currMeas}" == "1" ]; then
		catToFile "%1
[V:1]|: $phrG |\\
[V:2]|: $phrF |\\"
		continue
	elif [ "$currMeas" = "7" ]; then 
		catToFile "%7
[V:1] $phrG \\
[V:2] $phrF \\"
		continue
	elif [ "$currMeas" = "8" ]; then
		catToFile "%8a
[V:1]|1 $phrG :|2
[V:2]|1 $phrF :|2
%8b
[V:1] $phrG |:\\
[V:2] G,,B,/G,/^F,/E,/ |:\\"
		continue
	elif [ "$currMeas" = "16" ]; then
		catToFile "%16
[V:1] $phrG :|]
[V:2] $phrF :|]"
		continue
	else
		catToFile "%$currMeas
[V:1] $phrG |\\
[V:2] $phrF |\\"
	fi
done
catToFile "%]]>
</center>"

#----------------------------------------------------------------------------------
# add the end tags
#----------------------------------------------------------------------------------
catToFile "</body>
</html>"	
#
##
###
