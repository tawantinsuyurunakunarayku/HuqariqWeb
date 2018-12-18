from django.shortcuts import render, render_to_response, redirect
from phones_vis.forms import *
from phones_vis.utils import *
from django.conf import settings
import ipdb
# Create your views here.

def visualizer(request):
	phon_quz = request.session.get('phon_quz',{})
	phon_esp = request.session.get('phon_esp',{})
	esp_phon_dict = request.session.get('esp_phon_dict',{})
	esp_arp2ipa = request.session.get('esp_arp2ipa',{})
	tokens = 0
	types = 0
	nphon = 0
	form = ''
	plot = False
	saved = False

	if request.method == 'POST':
		form = PhrasesForm(request.POST)
		if form.is_valid():
			text = form.cleaned_data['text']
			print(request.POST)
			
			if 'analizar' in request.POST:
				if phon_quz=={}:
					phon_dicts = read_phone_dicts()
					phon_quz,phon_esp,esp_phon_dict,esp_arp2ipa = phon_dicts
					request.session['phon_quz'] = phon_quz
					request.session['phon_esp'] = phon_esp
					request.session['esp_phon_dict'] = esp_phon_dict
					request.session['esp_arp2ipa'] = esp_arp2ipa
				else:
					phon_dicts = phon_quz,phon_esp,esp_phon_dict,esp_arp2ipa
				tokens,types,nphon = build_phonemes_distro(text,phon_dicts)
				plot = True
			elif 'save' in request.POST:
				try:
					open("frases_quechua.txt",'w').write(text)
					saved = True
				except:
					pass
	else:
		form = PhrasesForm()


	return render(request,'phon_vis.html',
		{'form':  form,
		 'tokens':tokens,
		 'types': types,
		 'nphonemes': nphon,
		 'plot':plot,
		 'saved':saved,
		 'media_url':settings.MEDIA_URL
		})