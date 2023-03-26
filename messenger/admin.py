from django.contrib import admin
from .models import Chat, User, Message

# Register your models here.
admin.site.register(Chat)
admin.site.register(User)
admin.site.register(Message)