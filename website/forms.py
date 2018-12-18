from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from website.models import User, Departamento, Provincia, Distrito
from website.choices import *

class TranscriptionForm(forms.Form):
    text = forms.CharField(
        widget=forms.Textarea(
                attrs={ 'placeholder': 'Inserte texto aqui',
                    'class': 'form-control',
                    'maxlength':1500,
                    'rows':'4'}),
        error_messages={'blank': "Ingrese la transcripcion del audio",
                    'required': 'Ingrese la transcripcion del audio'})

    quality = forms.ChoiceField(
        choices=quality_choices,
        initial='1',
        widget=forms.RadioSelect(attrs={'class': 'form-check'}),
    )

    ## hidden fields
    start = forms.CharField(max_length=10,
                widget=forms.HiddenInput(),
                initial='0')
    end = forms.CharField(max_length=10,
                widget=forms.HiddenInput(),
                initial='0')

class SignUpForm(UserCreationForm):
    complete_name = forms.CharField(max_length=100,
    							 required=False,
    							 help_text='',
    							 widget=forms.TextInput(attrs={'class': 'form-control'}),
    							 error_messages={'invalid': "Texto invalido"} )

    genero = forms.ChoiceField(label='Genero',
                               choices=(("M", "Masculino"),
                                        ("F", "Femenino")),
                               widget=forms.Select(attrs={'class': 'form-control', 'initial':'M'})
    )

    email = forms.EmailField(max_length=254,
							 widget=forms.EmailInput(attrs={'class': 'form-control'}),
							 error_messages={'blank': "Ingrese correo",
                                         	'invalid': "Correo invalido",
                                         	'required': 'Ingrese correo'} )

    birthdate = forms.DateField(input_formats=['%d/%m/%Y'], widget=forms.TextInput(attrs={'class':'datepicker'}))
    password1 = forms.CharField(max_length=30,
                                 help_text='',
                                 widget=forms.PasswordInput(attrs={'class': 'form-control'}),
                                 error_messages={
                                 'blank': "Ingrese contraseña",
                                 'invalid': "Contraseña muy débil. Pruebe una mas larga o use numeros y letras",
                                 'required': 'Ingrese contraseña'} )

    password2 = forms.CharField(max_length=30,
                                 help_text='',
                                 widget=forms.PasswordInput(attrs={'class': 'form-control'}),
                                 error_messages={
                                 'blank': "Ingrese contraseña",
                                 'invalid': "Contraseñas no coinciden",
                                 'required': 'Ingrese contraseña'} )

    class Meta:
        model = User
        fields = ('complete_name', 'genero', 'phone', 'country', 'departamento', 'provincia', 'distrito', 'email', 'password1', 'password2',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['country'].empty_label = ""
        self.fields['country'].widget.attrs.update({'class':'form-control'})
        self.fields['departamento'].empty_label = ""
        self.fields['departamento'].widget.attrs.update({'class':'form-control'})
        self.fields['provincia'].empty_label = ""
        self.fields['provincia'].widget.attrs.update({'class':'form-control'})
        self.fields['distrito'].empty_label = ""
        self.fields['distrito'].widget.attrs.update({'class':'form-control'})

        # empty POST data
        if not self.data:
            self.fields['departamento'].queryset = Departamento.objects.none()
            self.fields['provincia'].queryset = Provincia.objects.none()
            self.fields['distrito'].queryset = Distrito.objects.none()
        else:
            try:
                country_id = int(self.data['country'])
                self.fields['country'].queryset = Country.objects.all(name=country_id)

                dpto_id = int(self.data['departamento'])
                self.fields['departamento'].queryset = Departamento.objects.filter(name=dpto_id)

                provincia_id = int(self.data['provincia'])
                self.fields['provincia'].queryset = Provincia.objects.filter(name=provincia_id)

                distrito_id = int(self.data['distrito'])
                self.fields['distrito'].queryset = Distrito.objects.filter(name=distrito_id)

            except:
                pass
        #import pdb; pdb.set_trace()

    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2:
            if password1 != password2:
                raise forms.ValidationError("Las dos contraseñas no coinciden.")
        return password2

    # FIXME: this function should be temporary. A better solution would be to have the field region in the ubigeo table.
    def _figure_region(self, signup_data):
        """Input: Receives signup data.
        Return: A string. One of two quechua regions. '1' for Chanca or '2' for Collao"""
        CHANCA = '1'
        COLLAO = '2'
        depar = signup_data.get('departamento').name
        prov = signup_data.get('provincia').name
        dist = signup_data.get('distrito').name

        # casos especiales distritos y provincias del Departamento Apurimac, algunos son Chanca otros Collao
        if depar == 'Apurimac':
            if prov == 'Aymaraes':
                if dist in ["San Juan De Chacña", "Capaya", "Colcabamba", "Toraya", "Lucre", "Sañayca", "Tintay"]:
                    print(dist)
                    return CHANCA
            elif prov == 'Abancay' and dist == 'Pichirhua': return CHANCA
            elif prov == 'Chincheros' or prov == 'Andahuaylas': return CHANCA
            else:
                return COLLAO

        if depar in ['Arequipa', 'Moquegua', 'Tacna', 'Apurimac', 'Puno', 'Madre De Dios']: return COLLAO

        # resto del peru es Chanca
        return CHANCA

    def save(self,):
        user = super(SignUpForm, self).save(commit=False)
        # FIXME: esto del dialecto esta disperso en varias partes. en choices.py hay una tupla `region_choic` por ejemplo. Lo mejor seria agregar esto en la base de datos, agregando una campo mas a la tabla de Departamento y editando el .json
        user.region = self._figure_region(self.cleaned_data)
        user.save()

class ContactForm(forms.Form):
    name = forms.CharField(max_length=100,
                 required=False,
                 help_text='',
                 widget=forms.TextInput(attrs={'class': 'form-control'}),
                 error_messages={'invalid': "Texto invalido"} )
    email = forms.EmailField(max_length=254,
                 widget=forms.EmailInput(attrs={'class': 'form-control'}),
                 error_messages={'blank': "Ingrese correo",
                                'invalid': "Correo invalido",
                                'required': 'Ingrese correo'} )
    subject = forms.CharField(max_length=100,
                 required=True,
                 widget=forms.TextInput(attrs={'class': 'form-control'}),
                 error_messages={'blank': "Ingrese el asunto de la consulta",
                                'required': 'Ingrese el asunto de la consulta'})
    text = forms.CharField(
                widget=forms.Textarea(
                        attrs={ 'placeholder': 'Inserte consulta aqui',
                            'class': 'form-control',
                            'maxlength':700,
                            'rows':'4'}),
                error_messages={'blank': "Ingrese su consulta",
                            'required': 'Ingrese su consulta'})
