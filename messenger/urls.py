from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.loginUser, name="login"),
    path("logout", views.logoutUser, name="logout"),
    path("register", views.registerUser, name="register"),
    path("nojs", views.nojs, name="nojs"),

    # api
    path("edituser", views.edituser, name="edituser"),
    path("createchat", views.createchat, name="createchat"),
    path("postmessage", views.postmessage, name="postmessage"),
    path("invite/<str:link>", views.joinchat, name="joinchat"),
    path("getchat/<str:link>", views.getchat, name="getchat"),
    path("getmessages/<str:link>", views.getmessages, name="getmessages"),
    path("deletechat", views.deletechat, name="deletechat"),
    path("editchat", views.editchat, name="editchat"),
]
