'use strict';

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

String.prototype.replaceAt = function (index, replacement) {
    return this.substring(0, index) + replacement + this.substring(index + replacement.length);
}

function replaceAvatarPath(path) {
    return (path) ? path.replace('messenger/', '') : null;
}

let currentChat, msgContinued, msgByRequestedUser, msgsAmount,
    chatResponse, deleteChatLink, editChatLink, editChatName, dotsInterval;
let messagesEnd = false;

const MAINCOLOR = '#103d6a';
const LOGOCOLOR = '#4f28bb';
const LIMITED_AMOUNT_OF_LOADED_MSGS = 40;
const CHAT_BEGINNING = '<div id="chat-beginning">This is the beginning of your chat!</div>';
const ALLOWED_AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png'];

function errorDeletingEditingChat(msg, elemLabel, elemContent) {
    $(elemLabel).html('Error');
    $(elemContent).html(msg);
}

function addUser(avatar, name, id) {
    return `
        <div class="user">
            <img class="avatar listuser-avatar" data-id="${id}" src="${avatar}" alt="User avatar" />
            <div class="user-username all-usernames" data-id=${id}>
                ${name}
            </div>
        </div>
    `
}

function postNewMessage(mainMsgClass, msgContinued, username, txt, date, avatar, id) {
    return `
    <div class="msg ${mainMsgClass}">
        <div class="msg-avatar" style="${(msgContinued) ? 'visibility: hidden;' : ""}">
            <img class="avatar msg-avatar-pic" data-id="${id}" src="${avatar}" alt="User avatar" />
        </div>
        <div class="msg-content">
            <div class="msg-author all-usernames" data-id="${id}" style="${(msgContinued) ? 'display: none;' : ""}">${username}</div>
            <div class="msg-block">
                <div class="msg-text">${txt}</div>
                <div class="msg-date">${new Date(date).toLocaleString()}</div>
            </div>
        </div>
    </div>
    `
}

function togglePopover(popoverContent, popover) {
    if (popoverContent)
        bootstrap.Popover.getOrCreateInstance(popover).setContent({
            '.popover-body': popoverContent,
        });
    // check if popover isnt shown because the show function is bugged or something
    if (!$(popover).attr('aria-describedby'))
        $(popover).popover('show');
}

function moveToChat(chat) {
    if (currentChat === chat.attr('data-link')) return;
    // ^ user clicks on the same chat they're currently in
    currentChat = chat.attr('data-link');
    chatResponse = false;
    messagesEnd = false;
    msgsAmount = 0;
    $('.chatactions-icon').css('display', 'none');
    chat.find('.chatactions-icon').fadeIn();
    $('#chat-beginning').remove();
    $('#chat-invite').text(currentChat);
    if ($('#nochats-txt').css('display') === 'block') {
        $('#user-block').css('display', 'block');
        $('#invitation-link').css('display', 'inherit');
        $('#nochats-txt').css('display', 'none');
        $('#message-block, #chat-content').css({
            display: 'flex',
            justifyContent: 'flex-end',
            flexDirection: 'column',
        })
        $('#message-block').addClass('row');
    }
    $("#message-input-field").popover('hide');
    $('#message-input-field').val('');
    $('#user-block #users').html('');
    $('#messages').html('');
    chat.removeClass('not-selected-chat new-messages');
    chat.addClass('selected-chat');
    let otherChats = $(`.chat[data-link!="${currentChat}"]`);
    otherChats.removeClass('selected-chat');
    otherChats.addClass('not-selected-chat');
    $.ajax({
        url: `/getchat/${currentChat}`,
        type: "GET",
        dataType: "json",
        success: function (data) {
            console.log("Chat info:", data);

            msgsAmount = data.firstMessages.length;

            if (msgsAmount < LIMITED_AMOUNT_OF_LOADED_MSGS && !$('#chat-beginning').length)
                $('#messages').prepend(CHAT_BEGINNING);

            data.users.forEach(user => {
                $('#user-block #users').append(addUser(replaceAvatarPath(user.avatar), user.name, user.id));
            });



            data.firstMessages.reverse().forEach((message, messageIndex, messagesArray) => {

                msgContinued = (messageIndex > 0 && message.author.name === messagesArray[messageIndex - 1].author.name);
                msgByRequestedUser = data.requestuser === message.author.name;

                $('#messages').append(postNewMessage(
                    ((msgByRequestedUser) ? "msg-right" : "msg-left"),
                    msgContinued,
                    message.author.name,
                    message.txt,
                    message.date,
                    message.author.avatar,
                    message.author.id
                ));
            });

            let moveToBottom = document.getElementById('messages');
            moveToBottom.scrollTop = moveToBottom.scrollHeight;

            chatResponse = true;

            $('#messages').off().scroll(function () {
                if (!chatResponse) return;

                if (!messagesEnd && $('#messages').scrollTop() === 0) {

                    $.ajax({
                        url: `/getmessages/${currentChat}?loadedmsgs=${msgsAmount}`,
                        type: "GET",
                        dataType: "json",
                        success: function (dataMsg) {
                            console.log(dataMsg);

                            let msgsLen = dataMsg.messages.length;
                            msgsAmount += msgsLen;

                            if (dataMsg.messages[0]?.author?.name === $('.msg .msg-author').eq(0).text()) {
                                $('.msg .msg-author').eq(0).css('display', 'none');
                                $('.msg .msg-avatar').eq(0).css('visibility', 'hidden');
                            }

                            dataMsg.messages.forEach((message, messageIndex, messagesArray) => {
                                msgContinued = (messageIndex < messagesArray.length - 1 && message.author.name === messagesArray[messageIndex + 1].author.name);
                                msgByRequestedUser = data.requestuser === message.author.name;

                                $('#messages').scrollTop($('#messages').prop('scrollHeight') - ($('#messages').scrollTop() + $('#messages').height()) + 125);
                                // stop autoscroll when adding new elements

                                $('#messages').prepend(
                                    postNewMessage(
                                        ((msgByRequestedUser) ? "msg-right" : "msg-left"),
                                        msgContinued,
                                        message.author.name,
                                        message.txt,
                                        message.date,
                                        message.author.avatar,
                                        message.author.id,
                                    )
                                );
                            });

                            if (!msgsLen || msgsLen < LIMITED_AMOUNT_OF_LOADED_MSGS) {
                                messagesEnd = true;
                                if (!$('#chat-beginning').length)
                                    $('#messages').prepend(CHAT_BEGINNING);
                            }
                        },
                        error: function (data) {
                            console.log('Error:', data);
                            $('#messages').prepend('There was an error loading new chat messages.');
                        }
                    });

                }
            });
        },
        error: function (data) {
            console.log('Error:', data);
            $('#messages').html('There was an error loading chat messages.');
        }
    });
}

function addChat(invite, avatar, name, isUserTheCreator) {
    $('#chats').append(`
    <div class="chat" data-link="${invite}">
        <div class="chat-contents">
            <img class="chat-avatar avatar" src="${replaceAvatarPath(avatar)}" alt="Server avatar" />
            <h2 class="chat-name">${name}</h2>
        </div>
        ${isUserTheCreator ?
            `<div class="chatactions">
            <div class="chatactions-icon dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                    <path
                        d="M0 256a56 56 0 1 1 112 0A56 56 0 1 1 0 256zm160 0a56 56 0 1 1 112 0 56 56 0 1 1 -112 0zm216-56a56 56 0 1 1 0 112 56 56 0 1 1 0-112z" />
                </svg>
            </div>
            <ul class="dropdown-menu chatedit-dropdown">
                <li>
                    <a class="dropdown-item editchat" data-name="${name}" data-link="${invite}"
                        data-bs-toggle="modal" data-bs-target="#editchat-modal">
                        <svg class="chatedit-dropdownsvg" xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 512 512">
                            <path
                                d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" />
                        </svg>
                        <span class="chatedit-dropdowntext">Edit chat</span>
                    </a>
                </li>
                <li>
                    <a class="dropdown-item deletechat" data-name="${name}" data-link="${invite}"
                        data-bs-toggle="modal" data-bs-target="#deletechat-modal">
                        <svg class="chatedit-dropdownsvg" xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 448 512">
                            <path
                                d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z" />
                        </svg>
                        <span class="chatedit-dropdowntext">Delete chat</span>
                    </a>
                </li>
            </ul>
        </div>`
            : ""}
    </div>
`);
}

$(document).ready(function () {

    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));

    let websocket;
    let keepConnection;

    const base_url = `${window.location.hostname}:${window.location.port}`;

    function connectWebSocket() {
        websocket = new WebSocket(`ws://${base_url}`);
    
        websocket.onopen = function (event) {
            dotLoaderFader();
            console.log('Connected to server');
    
            // Send pings every 55 seconds to keep the connection alive
            keepConnection = setInterval(function () {
                if (websocket.readyState === WebSocket.OPEN) {
                    websocket.send('{"message":"ping"}');
                }
            }, 55000);
        };
    
        websocket.onerror = function (event) {
            console.error('WebSocket error:', event);
        };
    
        websocket.onclose = function (event) {
            dotLoader();

            console.log('Connection closed. Reconnecting in 5 seconds...');
            clearInterval(keepConnection);
    
            setTimeout(connectWebSocket, 5000);
        };

        // handle page changes for other users
        websocket.onmessage = function (event) {
            let data = JSON.parse(event.data).message;
            let chat = `.chat[data-link="${data?.link}"]`;
            console.log("Server message received: ", data);
            if (data.message === "Server change" && $(chat).length) {
                if (data.change === 'update') {
                    if (data.avatar) {
                        $(`${chat} .chat-avatar`).attr('src',
                            data.avatar + '?t=' + new Date().getTime());
                    }
                    if (data.name) {
                        $(`${chat} .chat-name`).text(data.name);
                        $(`${chat} .dropdown-item.editchat`).attr('data-name', data.name);
                    }
                }
                else if (data.change === 'delete') {
                    if (currentChat === data.link) {
                        $('#user-block, #invitation-link').css('display', 'none');
                        $('#nochats-txt').css('display', 'block');
                        $('#chat-content').css('display', 'none');
                        $('#message-block').css({
                            display: 'flex',
                            justifyContent: 'center',
                            flexDirection: 'column',
                        })
                        $('#message-block').removeClass('row');
                        currentChat = null;
                    }
                    $(chat).remove();
                }
            }
            else if (data.message === 'Join server') {
                if (data.id != $('#main-username').attr('data-id'))
                    $('#user-block #users').append(addUser(data.avatar, data.name, data.id));
            }
            else if (data.message === 'Edit user') {
                if (data.avatar) {
                    $(`img[data-id="${data.id}"]`).attr('src', data.avatar + '?t=' + new Date().getTime());
                }
                if (data.name) {
                    $(`.all-usernames[data-id="${data.id}"]`).text(data.name);
                }
            }

            else if (data.message === 'New message') {
                if (currentChat === data.link) {
                    msgContinued = ($('#messages').children().length > 0 && data.name === $('#messages .msg:last-child .msg-author').text());

                    $('#messages').append(postNewMessage(
                        ($('#main-username').attr('data-id') == data.id) ? "msg-right" : "msg-left",
                        msgContinued,
                        data.name,
                        data.txt,
                        data.date,
                        data.avatar,
                        data.id,
                    ));

                    msgsAmount++;

                    let moveToBottom = document.getElementById('messages');
                    moveToBottom.scrollTop = moveToBottom.scrollHeight;
                }
                else if (!$(chat).hasClass('new-messages')) {
                    $(chat).addClass('new-messages');
                }
            }

        }

        
    
    }

    connectWebSocket();


    let dotCounter = 0;

    window.dotsInterval = null;

    function dotLoader(){
        $('#everything').fadeOut(350).promise().then(() => {
            $('body').css({
                display: 'flex',
            })
            $('#loader').fadeIn(250)
        });

        dotsInterval = setInterval(function(){
            $('#loader-dots > div').eq(dotCounter).animate({
                marginTop: '20px',
            }, function(){
                $(this).animate({
                    marginTop: '-20px',
                })
            });
            dotCounter = (dotCounter === 2) ? 0 : dotCounter + 1;
        }, 375);
    }

    function dotLoaderFader(){
        $('#loader').fadeOut(250).promise().then(() => {
            $('#everything').fadeIn(500).promise()
        }).then(() => {
            $('body').css({
                display: 'block',
            })
            clearInterval(dotsInterval);
        })
    }

    // do the stuff before loading the chats
    let onload = new Promise((resolve) => {

        if($('.login-register-form').length){
            document.getElementById('nav-open-chats').style.setProperty('display', 'none', 'important');
            document.getElementById('nav-name').style.setProperty('display', 'block', 'important');
        }

        dotLoader();

       setTimeout(() => {
            return resolve();
        }, getRandomInt(925, 1825));

    })


    onload.then(() => {

        dotLoaderFader();

        $("#edituser-setnewpassword").change(function () {
            if (!this.checked) {
                $('#useredit-passwordpopover').popover('hide');
                $('#useredit-password, #useredit-confirmpassword').val('');
            }
        });

        $('button[type="button"][data-bs-dismiss="modal"]').click(function () {
            $('.modal-footer-leftelem').text('');
            $('.modal-footer-leftelem').css('visibility', 'hidden');
        })

        $('#useredit-save').click(function () {
            let newPassword = null;
            if ($('#edituser-setnewpassword').is(':checked')) {
                if ($('#useredit-password').val() !== $('#useredit-confirmpassword').val())
                    return togglePopover("Passwords don't match.", "#useredit-passwordpopover");
                else if (!$('#useredit-password').val() && !$('#useredit-confirmpassword').val())
                    return togglePopover("Password is empty.", "#useredit-passwordpopover");
                $("#useredit-passwordpopover").popover('hide');
                newPassword = $('#useredit-password').val();
            }
            $('#edituser-formerror').css('display', 'none');
            let newUsername = ($('#useredit-username').val() !== $('#main-username').text()) ? $('#useredit-username').val() : null;
            let userData = new FormData();
            userData.append('newAvatar', $('#useredit-avatar')[0].files[0]);
            userData.append('csrfmiddlewaretoken', '{{ csrf_token }}');
            userData.append('newPassword', newPassword);
            userData.append('newUsername', newUsername);
            if (newPassword || newUsername || $('#useredit-avatar').val())
                $.ajax({
                    url: '/edituser',
                    type: "POST",
                    data: userData,
                    processData: false,
                    contentType: false,
                    mimeType: "multipart/form-data",
                    dataType: "json",
                    success: function (data) {
                        console.log("User edited:", data);
                        $('#useredit-usernamepopover').popover('hide');
                        $('#useredit-avatar, #useredit-password, #useredit-confirmpassword').val('');
                        let userChanges = (data.passwordChange) ? ['password'] : [];
                        if (data.avatarChange) {
                            userChanges.push('avatar');
                        }
                        if (data.usernameChange) {
                            $('#useredit-username').val(data.username);
                            userChanges.push('username');
                        }
                        userChanges = 'Succesfully updated: ' + userChanges.join(', ') + '.';
                        $('.modal-footer-leftelem').text(userChanges);
                        $('.modal-footer-leftelem').css('visibility', 'visible');

                        websocket.send(JSON.stringify({
                            "message": "Edit user",
                            "avatar": replaceAvatarPath(data.avatarPath),
                            "name": (data.usernameChange) ? data.username : null,
                            "id": data.userID,
                        }));
                    },
                    error: function (rawData) {
                        let data = JSON.parse(rawData.responseText);
                        console.log(data);
                        if (data.code === 400) {
                            $('#useredit-usernamepopover').popover('show');
                            return;
                        }
                    }
                })
        })

        $('#createchat-create').click(function () {
            $('#createchat-chatname-popover, #createchat-avatar-popover').popover('hide');
            let chatName = $('#createchat-chatname').val();
            let chatAvatar = $('#createchat-avatar').val();
            if (!chatName) {
                return togglePopover("Please specify the chat's name", '#createchat-chatname-popover');
            }
            else if (chatName.length > 32) {
                return togglePopover("Chat name should be no longer than 32 characters in length", '#createchat-chatname-popover');
            }
            else if (!chatAvatar) {
                return togglePopover(false, '#createchat-avatar-popover');
            }
            let chatData = new FormData();
            chatData.append('chatAvatar', $('#createchat-avatar')[0].files[0]);
            chatData.append('csrfmiddlewaretoken', '{{ csrf_token }}');
            chatData.append('chatName', chatName);
            $.ajax({
                url: '/createchat',
                type: "POST",
                data: chatData,
                processData: false,
                contentType: false,
                mimeType: "multipart/form-data",
                dataType: "json",
                success: function (data) {
                    console.log("Created chat:", data);
                    addChat(data.chatInvite, data.chatAvatar, data.chatName, true);
                    moveToChat($(`.chat[data-link="${data.chatInvite}"]`));
                    $('#createchat-modal').modal('hide');
                    $('#createchat-chatname, #createchat-avatar').val('');
                    $('#nochatsmessage').css('display', 'none');
                },
                error: function (data) {
                    console.log("Error:", data);
                }
            });
        })

        $('#joinchat-join').click(function () {
            let chatInvite = $('#joinchat-input').val().trim().replaceAll(' ', '');
            $("#joinchat-input").popover('hide');
            if (!chatInvite) {
                return togglePopover("Please specify the chat invitation link", "#joinchat-input");
            }
            $.ajax({
                url: chatInvite,
                type: "PUT",
                dataType: "json",
                success: function (data) {
                    console.log("Joined server:", data);
                    addChat(data.chatInvite, data.chatAvatar, data.chatName, false);
                    moveToChat($(`.chat[data-link="${data.chatInvite}"]`));
                    $('#joinchat-modal').modal('hide');
                    $('#joinchat-input').val('');
                    $('#nochatsmessage').css('display', 'none');
                    websocket.send(JSON.stringify({
                        "message": "Join server",
                        "avatar": replaceAvatarPath(data.userAvatar),
                        "name": data.username,
                        "id": data.userID,
                    }));
                },
                error: function (data) {
                    console.log("Error:", data);
                    switch (data.status) {
                        case 404:
                            togglePopover("This chat wasn't found", "#joinchat-input");
                            break;
                        case 400:
                            $('#joinchat-modal').modal('hide');
                            $('#joinchat-input').val('');
                            break;
                    }
                }
            })
        })

        $('#chats').on('click', '.chat', function () {
            moveToChat($(this));
        });


        $('#message-input-form').submit(function (event) {
            event.preventDefault();
            let messageTxt = $('#message-input-field').val();
            $("#message-input-field").popover('hide');
            if (messageTxt && currentChat) {
                if (messageTxt.length > 2048) {
                    return togglePopover("Message text can't be longer than 2048 characters", "#message-input-field");
                }
                $.ajax({
                    url: "/postmessage",
                    type: "POST",
                    data: {
                        "message": messageTxt,
                        "chatLink": currentChat,
                    },
                    dataType: "json",
                    success: function (data) {
                        console.log("Posted message:", data);
                        $('#message-input-field').val('');

                        websocket.send(JSON.stringify({
                            "message": "New message",
                            "link": currentChat,
                            "name": data.author.name,
                            "txt": data.txt,
                            "date": data.date,
                            "avatar": data.author.avatar,
                            "id": data.author.id,
                        }));
                    },
                    error: function (data) {
                        console.log('Error:', data);
                        if (data.status === 404) {
                            return togglePopover("There was an error sending your message. Try again.", "#message-input-field");
                        }
                    }
                });
            }
        });

        $('#chats').on('click', '.deletechat', function () {
            deleteChatLink = $(this).attr('data-link');
            $('#deletechat-chatname').text($(this).attr('data-name'));
            console.log(deleteChatLink)
        });

        $('.deletechat-back').click(function () {
            deleteChatLink = null;
        });

        $('#deletechat-delete').click(function () {
            if (!deleteChatLink) {
                errorDeletingEditingChat('There was an error deleting your chat.', '#deletechat-label', '#deletechat-content');
                return;
            };
            $.ajax({
                url: "/deletechat",
                type: "DELETE",
                data: {
                    "chatLink": deleteChatLink,
                },
                dataType: "json",
                success: function (data) {
                    console.log(data);
                    $('#deletechat-modal').modal('hide');
                    websocket.send(JSON.stringify({
                        "message": "Server change",
                        "change": "delete",
                        "link": data.link,
                    }));
                },
                error: function (data) {
                    console.log('Error:', data);
                    errorDeletingEditingChat(JSON.parse(data.responseText).message, '#deletechat-label', '#deletechat-content');
                },
            });
        });

        $('#chats').on('click', '.editchat', function () {
            editChatLink = $(this).attr('data-link');
            editChatName = $(this).attr('data-name');
            console.log(editChatName);
            $('#editchat-chatname').text(editChatName);
            $('#editchat-name').val(editChatName);
        });

        $('.editchat-back').click(function () {
            editChatLink = null;
            editChatName = null;
        })

        $('#editchat-edit').click(function () {
            $('#editchat-namepopover').popover('hide');
            if (!editChatLink) return errorDeletingEditingChat('There was an error editing your chat.', 'editchat-label', 'editchat-content');
            let name = $('#editchat-name').val();
            if (!name && !$('#editchat-avatar').val()) return;
            else if (!name) {
                return togglePopover('Please enter new chat name', '#editchat-namepopover');
            }
            else if (name.length > 32) {
                return togglePopover("Chat name can't be longer than 32 characters", '#editchat-namepopover');
            }
            name = (name === editChatName) ? null : name;
            let chatData = new FormData();
            chatData.append('newAvatar', $('#editchat-avatar')[0].files[0]);
            chatData.append('csrfmiddlewaretoken', '{{ csrf_token }}');
            chatData.append('newName', name);
            chatData.append('chatLink', editChatLink);
            $.ajax({
                url: '/editchat',
                type: "POST",
                data: chatData,
                processData: false,
                contentType: false,
                mimeType: "multipart/form-data",
                dataType: "json",
                success: function (data) {
                    console.log(data);
                    $('#editchat-avatar').val('');
                    $('#editchat-modal').modal('hide');
                    websocket.send(JSON.stringify({
                        "message": "Server change",
                        "change": "update",
                        "avatar": replaceAvatarPath(data.avatar),
                        "name": data.name,
                        "link": data.link,
                    }));
                    websocket.send(JSON.stringify({
                        "message": "Server change",
                        "change": "update",
                        "avatar": replaceAvatarPath(data.avatar),
                        "name": data.name,
                        "link": data.link,
                    }));
                },
                error: function (data) {
                    console.log(data);
                    errorDeletingEditingChat('There was an error editing your chat.', 'editchat-label', 'editchat-content');
                },
            });


        });


        $('#nav-open-chats').click(function(){
            $('#chat-block').toggle();
        })

    })

})