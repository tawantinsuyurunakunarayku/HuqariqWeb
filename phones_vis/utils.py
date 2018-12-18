import os, sys
import nltk
import numpy as np
import ipdb
import requests
from phones_vis.phonetic_mappers import *
from django.conf import settings
import codecs

punctuation = '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~º¡¿ª°…“”«»—'
DICT_DIR = os.path.join(settings.BASE_DIR,'phones_vis','dicts')
MD_DIR = os.path.join(settings.BASE_DIR,'media')
ST_DIR = settings.STATIC_ROOT
nltk.data.path.append('/home/quechua/nltk_data')

def has_special(word):
	special_chars = [
		'chh','ph','th','kh','qh',
		"ch'","p'","t'","k'","q'"
	]
	for sp in special_chars:
		if sp in word:
			return True
	return False


def parse_parallel(params):
	
	word,pe,pq = params
	print(word)
	response = requests.get("https://services.open.xerox.com/bus/op/LanguageIdentifier/GetLanguageForString?document="+word)
	lang = response.content.decode("utf8").strip('"')
	#print("word:  ",word," | lang: ",lang)
	iseq, aseq = [],[]
	if lang=='qu' or has_special(word):
		iseq,aseq = parse_quz(word,pq)
	else:
		iseq,aseq = parse_esp(word,pe)
	return word,iseq,aseq


def read_phone_dicts():
	esp_phon_dict = {}
	phon_esp = {}
	esp_arp2ipa = {} # arpabet to ipa char-by-char for spanish phonetic set
	phon_quz = {}

	for line in open(os.path.join(DICT_DIR,'es.dict'),mode='r',encoding='utf-8'):
		if line=='\n': continue
		temp = line.split()
		word = temp[0]
		phones = temp[1:]
		esp_phon_dict[word] = phones

	# read phonetic symbols
	for line in open(os.path.join(DICT_DIR,'quz.symbols'),mode='r',encoding='utf-8'):
		line = line.strip("\n")
		if line=='':	continue
		gr,ipa,arpb = line.split('\t')
		phon_quz[gr] = {
			'ipa':ipa,
			'arpb':arpb.lower()
		}

	for line in open(os.path.join(DICT_DIR,'esp.symbols'),mode='r',encoding='utf-8'):
		line = line.strip("\n")
		if line=='':	continue
		gr,ipa,arpb = line.split('\t')
		phon_esp[gr] = {
			'ipa':ipa,
			'arpb':arpb
		}
		if arpb not in esp_arp2ipa:
			esp_arp2ipa[arpb] = ipa

	return phon_quz,phon_esp,esp_phon_dict,esp_arp2ipa


def build_phonemes_distro(text,phon_dicts):
	phon_quz,phon_esp,esp_phon_dict,esp_arp2ipa = phon_dicts
	sents = text.split('\n')
	vocab = nltk.FreqDist()
	for line in sents:
		line = line.strip('\n').strip('\t').strip(' ')
		if line=='':
			continue
		line = line.lower()
		line = line.replace("’","'") \
				.replace('`',"'") \
				.replace("‘","'") \
				.replace('”','"') \
				.replace('“','"') \
				.replace('…',',') \
				.replace('ª','°') \
				.replace('º','°') \
				.replace('à','á') \
				.replace('è','é') \
				.replace('ì','í') \
				.replace('ò','ó') \
				.replace('ù','ú') \
				.replace('-',' - ') \
				.replace('–',' - ') \
				.replace('/',' / ') \
				.replace('á','a') \
				.replace('é','e') \
				.replace('í','i') \
				.replace('ó','o') \
				.replace('ú','u')
		words = [x for x in nltk.word_tokenize(line) if x not in punctuation and x!="a." and x!="n°" and x!="mg."]
		vocab.update(words)
	#END-FOR
	phondist = nltk.FreqDist()
	tokens = 0
	for w,f in vocab.most_common():
		if w in esp_phon_dict:
			aseq = esp_phon_dict[w]
			iseq = [esp_arp2ipa[x] for x in aseq]
		else:
			w,iseq,_ = parse_parallel(tuple([w,phon_esp,phon_quz]))
		phondist.update(iseq*f)
		tokens += f

	total_phonemes = sum([f for ph,f in phondist.items()])

	with codecs.open(os.path.join(ST_DIR,'phone_counts.tsv'), 'w', encoding='utf-8') as output: 
		output.write("phoneme\tfrequency\n")
		for ph,f in phondist.most_common():
			output.write("%s\t%.3f\n" % (ph,f/total_phonemes))
	
	types = len(vocab)
	nphonemes = len(phondist)
	return tokens,types,nphonemes
