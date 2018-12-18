"""transcriptor URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from website.views import *
from phones_vis.views import *
from django.contrib.auth import views as auth_views


urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^$', audio_recording, name='audio_recording'),
    #url(r'^transcribir/', transcripcion, name='transcripcion'),
    url(r'^corregir/', transcripcion, name='correccion'),
    url(r'^getRecordedS/', getRecordedS, name='getRecordedS'),
    url(r'^legal/', legal_agreement, name='legal'),
    url(r'^upload', audio_recording, name='upload'),
    url(r'^login/$', auth_views.login, name='login'),
    url(r'^logout/$', auth_views.logout, name='logout'),
    url(r'^signup/$', signup, name='signup'),
    # el signup necesita cargar los departamentos, provincias, distritos
    url(r'^ajax/load-region/', load_region, name='ajax_load_region'),
    url(r'^no-hay-mas-audios/$', no_more, name='no-more'),
    url(r'^consulta/$', contact, name='contact'),
    url(r'^gracias-por-su-consulta/$', post_contact, name='post_contact'),
    url(r'^preguntas-frecuentes/$', faq_view, name='faq'),
    url(r'^frases-quechua/$',visualizer,name='phon-vis'),
]

if 'reynaldo' in settings.BASE_DIR:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
