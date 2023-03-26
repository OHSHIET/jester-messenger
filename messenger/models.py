from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

class Chat(models.Model):
    createdby = models.ForeignKey('User', blank=False, on_delete=models.SET_NULL, null=True, related_name="createdchats")
    users = models.ManyToManyField('User', blank=False)
    messages = models.ManyToManyField('Message', blank=True)
    avatar = models.ImageField(upload_to='messenger/static/messenger/serveravatars', default=None)
    name = models.CharField(max_length=32, default='Chat name')
    link = models.TextField(max_length=128, default=None, null=True, unique=True)

class User(AbstractUser):
    chats = models.ManyToManyField(Chat, blank=True)
    avatar = models.ImageField(upload_to='messenger/static/messenger/useravatars', default=None, null=True, blank=False)

    def serialize(self):
        return {
            "avatar": self.avatar.name,
            "name": self.username,
            "id": self.id,
        }

class Message(models.Model):
    author = models.ForeignKey(User, blank=False, null=True, on_delete=models.SET_NULL, related_name="sentmessages")
    txt = models.CharField(max_length=2048, null=True)
    date = models.DateTimeField(auto_now_add=True, null=True)

    def serialize(self):
        return {
            "author": self.author.serialize(),
            "txt": self.txt,
            "date": self.date,
        }