import datetime
from django.db import models
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.models import PermissionsMixin
from django.contrib.auth.base_user import AbstractBaseUser
from django.utils.translation import ugettext_lazy as _
from website.managers import UserManager

class Genero(models.Model):
    CHOICES = (
        ("M", "Masculino"),
        ("F", "Femenino")
    )
    name = models.CharField(max_length=1, choices=CHOICES)

class Country(models.Model):
    name = models.CharField(max_length=20)

    def __str__(self):
        return self.name

class Departamento(models.Model):
    country = models.ForeignKey(Country, on_delete=models.CASCADE)
    name = models.CharField(max_length=15)

    def __str__(self):
        return self.name

class Provincia(models.Model):
    departamento = models.ForeignKey(Departamento, on_delete=models.CASCADE)
    name = models.CharField(max_length=20)

    def __str__(self):
        return self.name

class Distrito(models.Model):
    provincia = models.ForeignKey(Provincia, on_delete=models.CASCADE)
    name = models.CharField(max_length=35)

    def __str__(self):
        return self.name

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(_('email'), unique=True)
    complete_name = models.CharField(_('nombres y apellidos'), max_length=100, blank=True, default="no_name")
    phone = models.CharField(_('celular'), max_length=9, blank=True, null=True)
    birthdate = models.DateField(_('fecha de nacimiento'), default=datetime.date.today)
    genero = Genero()
    country = models.ForeignKey(Country, default='', on_delete=models.SET_DEFAULT)
    departamento = models.ForeignKey(Departamento, default='', on_delete=models.SET_DEFAULT)
    provincia = models.ForeignKey(Provincia, default='', on_delete=models.SET_DEFAULT)
    distrito = models.ForeignKey(Distrito, default='', on_delete=models.SET_DEFAULT)
    score = models.PositiveSmallIntegerField(default=0)
    last_submission = models.DateTimeField(auto_now=True)
    total_annotated_hours = models.FloatField(default=0.0) # guarda segundos
    total_submissions = models.PositiveSmallIntegerField(default=0)
    total_recorded_audios = models.PositiveSmallIntegerField(default=0)
    region = models.CharField(_('region del quechua que sabe'), max_length=30, blank=False, default="1")

    date_joined = models.DateTimeField(_('date joined'), auto_now_add=True)
    is_active = models.BooleanField(_('active'), default=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into this site.'),
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def get_full_name(self):
        '''
        Returns the first_name plus the last_name, with a space in between.
        '''
        full_name = '%s %s' % (self.complete_name, self.email)
        return full_name.strip()

    def get_short_name(self):
        '''
        Returns the short name for the user.
        '''
        return self.email

    def email_user(self, subject, message, from_email=None, **kwargs):
        '''
        Sends an email to this User.
        '''
        send_mail(subject, message, from_email, [self.email], **kwargs)

class Annotation(models.Model):
    author = models.ForeignKey(
    					settings.AUTH_USER_MODEL,
    					on_delete=models.CASCADE)
    audio_filename = models.CharField(max_length=200)
    annotated_text = models.TextField(max_length=1500)
    start = models.FloatField(default=0.0)
    end = models.FloatField(default=0.0)
    msc_bkg = models.BooleanField(default=False)
    all_msc = models.BooleanField(default=False)
    all_spa = models.BooleanField(default=False)
    unint = models.BooleanField(default=False)
