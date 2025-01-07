from django.shortcuts import render
from django.http import HttpResponseRedirect, JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.db import IntegrityError
from django.contrib.auth import update_session_auth_hash

from django.core.files.storage import FileSystemStorage
import os
import re
import random
from django.http import QueryDict

from messenger import globalvars

from .models import User, Chat, Message

# initialize global vars
globalvars.init()
fss = FileSystemStorage()

def nullUndefToNone(value):
    return None if (value == 'null' or value == 'undefined') else value

def getAvatarPath(userServerID, fullAvatarName, isUser):
    _avatarOnlyName, avatarExtension = os.path.splitext(fullAvatarName)
    return f'{globalvars.userAvatarsPath if isUser else globalvars.serverAvatarsPath}{userServerID}{avatarExtension}'

def editAvatar(chatUserObj, avatarObj, isUser):
    chatUserPath = globalvars.userAvatarsPath if isUser else globalvars.serverAvatarsPath
    avatarPath = getAvatarPath(chatUserObj.id, avatarObj.name, isUser)
    previousAvatar = list(filter(lambda matchObj: matchObj, [re.search(
          f'{chatUserObj.id}.({"|".join(globalvars.allowedAvatarExtensions)})', avatars) for avatars in os.listdir(chatUserPath)]))
    if len(previousAvatar):
        os.remove(chatUserPath + previousAvatar[0].group())
    fss.save(avatarPath, avatarObj)
    chatUserObj.avatar.name = avatarPath
    return 'media/' + avatarPath

def nojs(request):
    return render(request, "messenger/nojs.html")

@login_required(login_url='/login')
def index(request):
    return render(request, 'messenger/index.html', {
        "userChats": request.user.chats.all(),
        # ^ chats for the current user
        "imageExtensions": 'image/' + ", image/".join(globalvars.allowedAvatarExtensions),
    })

@csrf_exempt
@login_required(login_url='/login')
def editchat(request):
    if request.method == 'POST':
        link = request.POST.get('chatLink')
        try:
            chat = Chat.objects.get(link=link)
        except Chat.DoesNotExist:
            return JsonResponse({"message": "The requested chat wasn't found", "isError": True, "code": 404}, status=404)
        if request.user != chat.createdby:
            return JsonResponse({"message": "User not allowed to edit this chat", "isError": True, "code": 403}, status=403)
        name = nullUndefToNone(request.POST.get('newName'))
        avatar = request.FILES.get('newAvatar')
        nameChange = avatarChange = False
        avatarPath = None
        if name:
            chat.name = name
            nameChange = True
        if avatar:
            avatarPath = editAvatar(chat, avatar, False)
            avatarChange = True
        chat.save()
        return JsonResponse({"message": "Successfully edited chat", "link": chat.link, "name": chat.name, "avatar": avatarPath, "nameChange": nameChange, "avatarChange": avatarChange, "isError": False, "code": 201}, status=201)

    else:
        return JsonResponse({"message": "POST request required", "isError": True, "code": 405}, status=405)


@csrf_exempt
@login_required(login_url='/login')
def deletechat(request):
    if request.method == 'DELETE':
        link = QueryDict(request.body).get('chatLink')
        try:
            chat = Chat.objects.get(link=link)
        except Chat.DoesNotExist:
            return JsonResponse({"message": "The requested chat wasn't found", "isError": True, "code": 404}, status=404)
        if request.user != chat.createdby:
            return JsonResponse({"message": "User not allowed to delete this chat", "isError": True, "code": 403}, status=403)
        for message in chat.messages.all():
            message.delete()
        chat.delete()
        return JsonResponse({"message": "Deleted chat", "link": link, "isError": False, "code": 200}, status=200)

    else:
        return JsonResponse({"message": "DELETE request required", "isError": True, "code": 405}, status=405)


@login_required(login_url='/login')
def getmessages(request, link):
    if request.method == 'GET':
        try:
            chat = Chat.objects.get(link=link)
        except Chat.DoesNotExist:
            return JsonResponse({"message": "The requested chat wasn't found.", "isError": True, "code": 404}, status=404)
        loadedMsgs = int(request.GET.get('loadedmsgs'))
        newmsgs = list(chat.messages.all())[::-1]
        del newmsgs[0:loadedMsgs]
        message = "Loaded new messages"
        if not len(newmsgs):
            message = "No new messages"
        return JsonResponse({"message": message, "messages": [message.serialize() for message in newmsgs[0:globalvars.limitedAmountOfLoadedMsgs]], "isError": False, "code": 200}, status=200)

    else:
        return JsonResponse({"message": "GET request required", "isError": True, "code": 405}, status=405)


@login_required(login_url='/login')
def getchat(request, link):
    if request.method == 'GET':
        try:
            chat = Chat.objects.get(link=link)
        except Chat.DoesNotExist:
            return JsonResponse({"message": "The requested chat wasn't found.", "isError": True, "code": 404}, status=404)
        messages = list(chat.messages.all())[::-1]
        return JsonResponse({"message": "Found chat", "requestuser": request.user.username, "users": [user.serialize() for user in chat.users.all()], "firstMessages": [message.serialize() for message in messages[0:globalvars.limitedAmountOfLoadedMsgs]], "isError": False, "code": 200}, status=200)
    else:
        return JsonResponse({"message": "GET request required", "isError": True, "code": 405}, status=405)


@csrf_exempt
@login_required(login_url='/login')
def joinchat(request, link):
    if request.method == 'PUT' or request.method == 'GET':
        try:
            chat = Chat.objects.get(link=link)
        except Chat.DoesNotExist:
            if request.method == 'GET':
                return HttpResponseRedirect(reverse('index'))
            return JsonResponse({"message": "The requested chat wasn't found.", "isError": True, "code": 404}, status=404)
        if chat in request.user.chats.all():
            if request.method == 'GET':
                return HttpResponseRedirect(reverse('index'))
            return JsonResponse({"message": "User already in this chat",  "isError": True, "code": 400}, status=400)
        request.user.chats.add(chat)
        chat.users.add(request.user)
        request.user.save()
        chat.save()
        if request.method == 'GET':
            return HttpResponseRedirect(reverse('index'))
        return JsonResponse({"message": "Successfully joined a chat", "userID": request.user.id, "username": request.user.username, "userAvatar": request.user.avatar.name, "chatInvite": chat.link, "chatID": chat.id, "chatName": chat.name, "chatAvatar": 'media/' + chat.avatar.name, "isError": False, "code": 201}, status=201)

    else:
        return JsonResponse({"message": "PUT or GET request required", "isError": True, "code": 405}, status=405)


@csrf_exempt
@login_required(login_url='/login')
def postmessage(request):
    if request.method == 'POST':
        chatLink = request.POST.get('chatLink')
        try:
            chat = Chat.objects.get(link=chatLink)
        except Chat.DoesNotExist:
            return JsonResponse({"message": "The requested chat wasn't found.", "isError": True, "code": 404}, status=404)
        messageTxt = request.POST.get('message')
        message = Message.objects.create(author=request.user, txt=messageTxt)
        chat.messages.add(message)
        chat.save()
        message.save()
        return JsonResponse({"message": "Successfully posted a message", "chat": chat.id, "txt": message.txt, "author": request.user.serialize(), "date": message.date, "isError": False, "code": 201}, status=201)
    else:
        return JsonResponse({"message": "POST request required", "isError": True, "code": 405}, status=405)


@csrf_exempt
@login_required(login_url='/login')
def createchat(request):
    if request.method == 'POST':
        avatar = request.FILES.get('chatAvatar')
        name = request.POST.get('chatName')
        chat = Chat.objects.create(name=name, createdby=request.user)
        avatarPath = getAvatarPath(chat.id, avatar.name, False)
        fss.save(avatarPath, avatar)
        chat.avatar.name = 'media/' + avatarPath
        chat.link = f'{int(str(chat.id) + str(hash(name) % 10000) + str(random.randint(100, 999))):x}'
        chat.users.add(request.user)
        request.user.chats.add(chat)
        chat.save()
        request.user.save()
        return JsonResponse({"message": "Successfully created new chat", "chatInvite": chat.link, "chatID": chat.id, "chatName": chat.name, "chatAvatar": chat.avatar.name, "isError": False, "code": 201}, status=201)

    else:
        return JsonResponse({"message": "POST request required", "isError": True, "code": 405}, status=405)


@csrf_exempt
@login_required(login_url='/login')
def edituser(request):
    if request.method == 'POST':
        avatar = request.FILES.get('newAvatar')
        username = nullUndefToNone(request.POST.get('newUsername'))
        password = nullUndefToNone(request.POST.get('newPassword'))
        avatarChange = usernameChange = passwordChange = False
        avatarPath = None
        if avatar:
            avatarPath = editAvatar(request.user, avatar, True)
            avatarChange = True
        if username:
            if len(list(filter(lambda users: username == users.username, User.objects.all()))):
                return JsonResponse({"message": "User with this name already exists", "isError": True, "code": 400}, status=400)
            request.user.username = username
            usernameChange = True
        if password:
            request.user.set_password(password)
            update_session_auth_hash(request, request.user)
            passwordChange = True
        request.user.save()
        return JsonResponse({"message": "User updated successfully", "username": username, "userID": request.user.id, "avatarPath": avatarPath, "avatarChange": avatarChange, "usernameChange": usernameChange, "passwordChange": passwordChange, "isError": False, "code": 201}, status=201)

    else:
        return JsonResponse({"message": "POST request required", "isError": True, "code": 405}, status=405)


def loginUser(request):
    if request.method == "POST":
        username = request.POST["usernameLogin"]
        password = request.POST["passwordLogin"]
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "messenger/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        if request.user.is_authenticated:
            return HttpResponseRedirect(reverse('index'))
        return render(request, 'messenger/login.html')


@login_required(login_url='/login')
def logoutUser(request):
    logout(request)
    return HttpResponseRedirect(reverse("login"))


def registerUser(request):
    if request.method == "POST":
        username = request.POST["usernameRegister"]
        email = request.POST["emailRegister"]
        password = request.POST["passwordRegister"]
        confirmation = request.POST["confirmationPassword"]
        avatar = request.FILES.get('avatarRegister')
        if not username or not email or not password or not confirmation or not avatar:
            return render(request, "messenger/register.html", {
                "message": "Please fill in your credentials."
            })
        elif password != confirmation:
            return render(request, "messenger/register.html", {
                "message": "Passwords must match."
            })
        try:
            user = User.objects.create_user(username, email, password)
            avatarPath = getAvatarPath(user.id, avatar.name, True)
            fss.save(avatarPath, avatar)
            user.avatar.name = avatarPath
            user.save()
        except IntegrityError:
            return render(request, "messenger/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        if request.user.is_authenticated:
            return HttpResponseRedirect(reverse('index'))
        return render(request, 'messenger/register.html', {
            "imageExtensions": 'image/' + ", image/".join(globalvars.allowedAvatarExtensions),
        })
