# Jester chat/messenger
Jester messenger was built using Python with Django on backend, JavaScript with JQuery on frontend and Bootstrap with Sass for design.

It looks like any other online messenger, where you can join chats and talk to people there.

![Jester design](https://i.imgur.com/e2jSIA0.png)

#### Video demo: [link](https://www.youtube.com/watch?v=X84m8JKvRjQ)

## How to run the application
In the main directory:
```bash
python manage.py runserver
```

## Distinctiveness and complexity
The application uses websockets, which is the main reason why this project was harder than I originally expected. Their point is to automatically update all the changes that have been made to the page for all other users, without the need to reload it.

If a user decides to update their avatar or their nickname, every other user will see the changes made. Same with chat avatar and nickname, and chat deletion. If a user posts a message to some server, all the users who have that chat open will see the message, but the users who are not in that chat will have a notification next to that chat that they have unread messages.

Server and user avatars are stored in two different folders, and never stored with the same name they were uploaded with: they're renamed depending on the server/user ID, so that people can't actually change avatars by uploading files with the same name.

The messages in the message block load 40 at a time. If the user scrolls up and there are more messages, it loads another 40. If there are no more messages, it displays the "This is the beginning of your chat!" element.

Every chat also has its own invitation link. It is created by converting to hex the ID of the chat, the trimmed hashcode of the chat name (only the first one, the link doesn't update if the chat name changes) and a random number at the end. It is made that way because Django's IDs are starting from 1 and then going 2, 3, 4, so this way it'd be very easy to join chats by visiting `invite/1`, `invite/2`, `invite/3`, and so on. The chat can be joined either by clicking on "Join a chat" button and then pasting a link there, or just by visiting `invite/<link>` link.

Some minor features:
* Responsive design, as it should be
* Spent a lot of time just doing design
* If the user's JS is off they get redirected to a page telling them to turn it on
* Single-page app (except for log in, register, log out and no JS routs)

## Vulnerabilities and issues
By changing the data-link property to some other chat's link in the web inspector before clicking on the chat it is actually possible to send a message to some other chat.

The unread messages aren't shown unless the user is logged in and has the connection with websocket. If the user isn't on the site and then logs back in, expecting to see notifications about new messages, they won't see any of them even if these messages exist.

The websocket connects to all the clients who are on the index route and it doesn't distinguish them in any way, shape or form, thus when any change is made all the logged in people get the information about it. Even if person A didn't join server B, and server B's name was updated, person A would still get information that server B's name was updated. It is only JS which checks if the user has that server in their list.

The client doesn't remember already loaded messages, so it'll make new requests each time user clicks on a chat, even if user has already been in that chat and all the messages should be loaded.

I also completely forgot about the existence of static for images, so I had to write a separate function to cut out the unnecessary path.

My only excuse is that I wanted to move with other projects and not waste too much time on this one.

## File content
`<static>` — `messenger/static/messenger`
* `capstone/asgi.py`, `messenger/consumers.py` - websocket files.
* `messenger/views.py` - mostly all the backend.
* `<static>/script.js` - all the frontend.
* `<static>/style.css`, `<static>/style.scss`, `<static>/style.css.map` - CSS + SCSS design.
* `<static>/serveravatars`, `<static>/useravatars` - folders for storing user and server avatars.
* `messenger/templates/messenger/*` - HTML templates for Django to render pages.
* `messenger/templatetags` - because I forgot static exists, I created this template tag for trimming the URL.
* `messenger/globalvars.py` - global variables for backend.
* `capstone/urls.py`, `messenger/urls.py` - all the URLs of the application.
* `messenger/models.py` - database models.

## Not implemented
A lot of things which could've been here aren't actually implemented, like:
* Adding friends
* Deleting and editing messages
* Deleting one's account
* Adding images to messages
* Pushing changes to browser history
* Or fixing some already existing issues for example

As I said I wanted to move with other projects, and all this mentioned above, maybe except last two things, would've been just rewriting the stuff I already did and wasting more time on functions which look suspiciously same to functions I already wrote.
