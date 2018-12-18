from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User as def_user
from website.models import User as my_user
from website.models import Annotation
from django.contrib.auth.forms import AdminPasswordChangeForm
from django.utils.translation import ugettext, ugettext_lazy as _
from django import forms
from website.user_forms import *



class MyUserAdmin(UserAdmin):
    """
    You can customize the interface of your model here.
    """
    change_user_password_template = None
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('complete_name', 'email', 'region')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser',
                                       'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined', 'last_submission')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('complete_name','email', 'password1', 'password2','region',),
        }),
    )
    readonly_fields = ('last_submission','date_joined','last_login',)

    form = MyUserChangeForm
    add_form = MyUserCreationForm
    change_password_form = AdminPasswordChangeForm

    list_display = ('complete_name', 'email', 'is_staff', 'score','total_annotated_hours','total_recorded_audios','region')
    search_fields = ('email', 'complete_name')
    ordering = ('email','score')
    filter_horizontal = ('groups', 'user_permissions',)

    def get_fieldsets(self, request, obj=None):
        if not obj:
            return self.add_fieldsets
        return super(MyUserAdmin, self).get_fieldsets(request, obj)

    def get_form(self, request, obj=None, **kwargs):
        """
        Use special form during user creation
        """
        defaults = {}
        if obj is None:
            defaults['form'] = self.add_form
        defaults.update(kwargs)
        return super(MyUserAdmin, self).get_form(request, obj, **defaults)

class AnnotationAdmin(admin.ModelAdmin):
    list_display = ('author', 'audio_filename')
    search_fields = ('author__email', 'audio_filename')


# Register your models here.
admin.site.register(my_user, MyUserAdmin)
admin.site.register(Annotation, AnnotationAdmin)
