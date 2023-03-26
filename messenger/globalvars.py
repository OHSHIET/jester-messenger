def init():
    global userAvatarsPath
    userAvatarsPath = 'messenger/static/messenger/useravatars/'

    global serverAvatarsPath
    serverAvatarsPath = 'messenger/static/messenger/serveravatars/'

    global allowedAvatarExtensions
    allowedAvatarExtensions = ['jpg', 'jpeg', 'png']

    global limitedAmountOfLoadedMsgs
    limitedAmountOfLoadedMsgs = 40