def init():
    global userAvatarsPath
    userAvatarsPath = 'media/useravatars/'

    global serverAvatarsPath
    serverAvatarsPath = 'media/serveravatars/'

    global allowedAvatarExtensions
    allowedAvatarExtensions = ['jpg', 'jpeg', 'png']

    global limitedAmountOfLoadedMsgs
    limitedAmountOfLoadedMsgs = 40