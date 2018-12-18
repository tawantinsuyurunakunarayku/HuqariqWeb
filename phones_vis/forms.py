from django import forms

class PhrasesForm(forms.Form):
		text = forms.CharField(
				widget=forms.Textarea(
						attrs={ 'placeholder': 'Ingrese frases aquí',
							'class': 'form-control',
							'maxlength':5000,
							'rows':'5'}),
				error_messages={'blank': "Ingrese las frases",
							'required': 'Ingrese las frases'})
