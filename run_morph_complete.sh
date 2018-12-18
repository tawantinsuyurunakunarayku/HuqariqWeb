#!/bin/bash

if [ "$#" -ne 1 ]; then
	echo "Usage: run_morph_complete.sh <text>"
	exit 1
fi
text=$1

XFST_DIR=/home/reynaldo/squoia/morphology/normalizer
TOKENIZER=$XFST_DIR/tokenize.pl

cd $HOME/squoia/morphology/disambiguation

POS_MODEL=wapiti/model1/model_w_inforesources_ahk
MORPH1_MODEL=wapiti/model2/model_w_inforesources_ahk_WAQ2
MORPH2_MODEL=wapiti/model3/model_w_inforesources_ahk
MORPH3_MODEL=wapiti/model4/model_w_inforesources_ahk

TMP_DIR=tmp4
EVID="cuz"
PISPAS="pis"

echo $text | perl $TOKENIZER | lookup -q -f lookup.script -flags Kv29TT > $TMP_DIR/test.xfst

cat $TMP_DIR/test.xfst | perl cleanGuessedRoots.pl -$EVID -$PISPAS > $TMP_DIR/test_clean.xfst

cat $TMP_DIR/test_clean.xfst | perl wapiti/xfst2wapiti_pos.pl -test > $TMP_DIR/pos.test

wapiti label -m $POS_MODEL $TMP_DIR/pos.test > $TMP_DIR/pos.result

perl disambiguateRoots.pl $TMP_DIR/pos.result $TMP_DIR/test_clean.xfst > $TMP_DIR/pos.disamb

perl wapiti/xfst2wapiti_morphTest.pl -1 $TMP_DIR/pos.disamb > $TMP_DIR/morph1.test

wapiti label -m $MORPH1_MODEL $TMP_DIR/morph1.test > $TMP_DIR/morph1.result

perl wapiti/xfst2wapiti_morphTest.pl -2 $TMP_DIR/morph1.result > $TMP_DIR/morph2.test

wapiti label -m $MORPH2_MODEL $TMP_DIR/morph2.test > $TMP_DIR/morph2.result

perl wapiti/xfst2wapiti_morphTest.pl -3 $TMP_DIR/morph2.result > $TMP_DIR/morph3.test

wapiti label -m $MORPH3_MODEL $TMP_DIR/morph3.test > $TMP_DIR/morph3.result

perl wapiti/xfst2wapiti_morphTest.pl -4 $TMP_DIR/morph3.result

cat tmp/disamb.xfst | perl printWords.pl