from django.shortcuts import render, render_to_response, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from website.forms import *
from website.utils import *
from website.models import Annotation
from website.choices import *
from django.contrib.auth import get_user_model
import datetime as dt

from django.conf import settings
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import UserCreationForm

from django.contrib.auth import views as auth_views
from django.core.mail import send_mail, BadHeaderError

import os
import uuid
import json
import codecs
import subprocess
from collections import Counter
# Create your views here.

@login_required
def transcripcion(request):
	form = ''
	audio_fn = ''
	audio_title = ''
	trans = ''
	user_email = request.user
	author = get_user_model().objects.get(email=user_email)
	username = author.complete_name.upper()
	try:
		username = username.split()[0]
	except:
		pass

	succedded = request.session.get('succedded',False)
	save_error = request.session.get('save_error',False)
	norm_text = request.session.get('norm_text','')
	h,m,s = hms(author.total_annotated_hours)

	try:
		is_collao = True if author.region=="2" else False
	except:
		is_collao = False

	if request.method == 'POST':
		print("---------------")
		print(request.POST)
		print(username)
		print("---------------")

		trans = request.session.get('trans','')
		audio_fn = request.session.get('audio_fn')
		#audio_title = request.session.get('audio_title')
		audio_title = "Audio #%d" % (author.total_submissions+1)

		form = TranscriptionForm(request.POST)

		if form.is_valid():
			trans = form.cleaned_data['text']
			quality = form.cleaned_data['quality']

			if trans == "transcripcion no disponible" or int(quality)>2:
				trans=''
			trans = trans.lower().strip(' ').strip('\n').strip(' ')

			# run spell checker
			start = float(form.cleaned_data['start'])
			end   = float(form.cleaned_data['end'])
			msc_bkg = False
			all_msc = False
			all_spa = False
			unint = False

			if quality=='2':
				msc_bkg = True
			elif quality=='3':
				all_msc = True
			elif quality=='4':
				all_spa = True
			elif quality=='5':
				unint = True

			not_count_secs = all_msc or all_spa or unint

			print("+++++++++++++++++++++++++++++++++++")
			print("::",trans,"::")
			request.session['trans'] = trans
			try:
				author = update_user(author,start,end,not_count_secs)
				annotation = Annotation(author=author,
								audio_filename=audio_fn,
								annotated_text=trans,
								start=start,
								end=end,
								msc_bkg=msc_bkg,
								all_msc=all_msc,
								all_spa=all_spa,
								unint=unint)
				annotation.save()

				# popup de exito
				succedded = True
				save_error = False
			except:
				# popup de error
				print("error during saving...")
				succedded = False
				save_error = True
				#ipdb.set_trace()
				pass
			request.session['succedded'] = succedded
			if succedded:
				return redirect('correccion')
		#END-IF-SPELL-BUTTON
		#END-FORM-VALID
	else:
		form = TranscriptionForm(initial={'text':trans})
		audio_fn = get_audio_filename(author.email)
		#audio_title = get_audio_title(audio_fn)
		audio_title = "Audio #%d" % (author.total_submissions+1)
		request.session['audio_fn'] = audio_fn
		request.session['audio_title'] = audio_title

	if audio_fn=='no-more':
	   return redirect('no-more')

	return render(request,'home.html',
			{'form':form,
			 'audio_fn':audio_fn,
			 'audio_title':audio_title,
			 'username':username,
			 'succedded':succedded,
			 'save_error':save_error,
			 'norm_text': norm_text,
			 'collao': is_collao,
			 'hours': h,
			 'minutes':m,
			 'seconds':s,
			 'show_hms':True
			  })

def legal_agreement(request):
    return render(request, 'recording/legal.html')

@login_required
def audio_recording(request):
    user = get_user_model().objects.get(email=request.user)
    email = user.email
    if request.method == 'POST' and request.FILES.get('data'):
        # if not request.session.session_key:
        word = request.POST.get('word')
        audio_data = request.FILES.get('data')
        os.makedirs('/home/quechua/transcriptor/storage/' + email, exist_ok=True)
        fname = uuid.uuid4().hex
        with open('/home/quechua/transcriptor/storage/' + email + '/' + fname + '.webm', 'wb') as f:
            for chunk in audio_data.chunks():
                f.write(chunk)
        with open('/home/quechua/transcriptor/storage/' + email + '/' + fname + '.txt', 'w', encoding='utf8') as f:
            f.write(word)
        update_recorded_audios(user)

    if not request.COOKIES.get('agreement_done'):
        return render(request, 'recording/welcome.html')
    if request.COOKIES.get('all_done'):
        return render(request, 'recording/thanks.html')
    try:
        is_collao =  True if user.region == "2" else False
    except:
        is_collao = False
    return render(request, "recording/record.html", {'is_collao':is_collao})

def getRecordedS(request):
    storage_path = '/home/quechua/transcriptor/storage'
    user = get_user_model().objects.get(email=request.user)
    email = user.email
    if not os.path.isdir(storage_path + '/' + email):
        os.makedirs(storage_path + '/' + email, exist_ok=True)
    return JsonResponse(Counter([codecs.open(storage_path + '/' + email + '/' + name,'r', encoding='utf-8').read()
                                 for name in os.listdir(storage_path + '/' + email) if '.txt' in name]))

def signup(request):
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            form.save()
            email = form.cleaned_data.get('email')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(email=email, password=raw_password)

            login(request, user)
            return redirect('audio_recording')
        else:
            print("FORM is invalid")
    else:
        form = SignUpForm()
    return render(request, 'registration/signup.html', {'form': form})

def load_region(request):
    what_to_load = request.GET.get('what_to_load')
    if what_to_load == 'departamento':
        country_id = request.GET.get('country')
        dptos = Departamento.objects.filter(country=country_id).order_by('name')
        return render(request, 'registration/departamento_dropdown_list_options.html', {'departamentos': dptos})
    elif what_to_load == 'provincia':
        country_id = request.GET.get('country')
        dpto_id = request.GET.get('departamento')
        provincias = Provincia.objects.filter(departamento=dpto_id).order_by('name')
        return render(request, 'registration/provincia_dropdown_list_options.html', {'provincias': provincias})
    elif what_to_load == 'distrito':
        country_id = request.GET.get('country')
        dpto_id = request.GET.get('departamento')
        provincia_id = request.GET.get('provincia')
        distritos = Distrito.objects.filter(provincia=provincia_id).order_by('name')
        return render(request, 'registration/distrito_dropdown_list_options.html', {'distritos': distritos})

def no_more(request):
    user_email = request.user
    author = get_user_model().objects.get(email=user_email)
    h,m,s = hms(author.total_annotated_hours)
    return render(request,'no_more.html',
               {
               'audio_fn':'',
               'audio_title':'',
               'hours': h,
               'minutes':m,
               'seconds':s
               })

def contact(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            name = form.cleaned_data.get("name")
            email = form.cleaned_data.get('email')
            subject = form.cleaned_data.get("subject").strip(" ")
            text = form.cleaned_data.get("text").strip(" ").strip("\n")
            body = "Nombre: %s\nEmail: %s\nConsulta:\n%s" % (name,email,text)
            subject = "[Consulta web] " + subject
            try:
                send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [settings.RECEIVER_MAIL])
            except BadHeaderError:
                return HttpResponse('Invalid header found')
            return redirect('post_contact')
    else:
        if request.user:
            user = get_user_model().objects.get(email=request.user)
            name = user.complete_name
            email = user.email
            form = ContactForm(initial={"name":name, "email":email})
        else:
            form = ContactForm()
    return render(request, 'contact.html', {'form': form})


def post_contact(request):
    return render_to_response('post_contact.html')


def faq_view(request):
    user_email = request.user
    author = get_user_model().objects.get(email=user_email)
    h,m,s = hms(author.total_annotated_hours)
    return render(request,'faq.html',
               {
               'audio_fn':'',
               'audio_title':'',
               'hours': h,
               'minutes':m,
               'seconds':s
               })
