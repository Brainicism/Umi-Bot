# Umi Bot
A general purpose Discord bot designed for a small-sized server.
## Requirements
Create two seperate discord accounts [here](https://discordapp.com/register) and manually add them to the server. Change the  .login() functions with the correct account credentials. Get a Wolfram Alpha API [here](http://products.wolframalpha.com/developers/) and update the key in the .createClient() function. Download ffmpeg [here](https://ffmpeg.zeranoe.com/builds/) and update the ffmpeg path constant. 

If you want any of the audio commands, you must have the following installed:

- Python 2.7.x 
- FFMPEG
- C++ Build Tools

Instructions are [here](http://pastebin.com/Qb2TvxLy).

##Install
Run "npm install" to download required moduled. Run "node bot" to start the bot. 
##Commands
###Quotes

**!quote** : Send a random previously added quote

**!addquote [quote]**: Add a new quote

###Audio

**!play [tag] {volume}**: Plays the specified clip in the voice channel the message's owner is in

**!listaudio**: Lists the audio clips tags available for playback

**!download [youtube url] {tag}**  OR  **!download [direct .mp3 URL] {tag}**: Downloads and/or extracts an mp3 for playback

**!stop**: Stops playback

**!leave**: Forces bot to leave the call

**!addtoplaylist [playlist] [song]  OR  !queue [playlist] [song]**: Add song to playlist

**!startplaylist [playlist]  OR  !startqueue [playlist]**: Starts playback of playlist in voice channel, will also skip current song if already playing

**!stopplaylist  OR  !stopqueue**: Stops playback

**!listplaylists**: List playlists

**!deleteplaylist [playlist]  OR  !deletequeue [playlist]**: Deletes the specified playlist

**!removefromplaylist [playlist][song]  OR  !removefromqueue [playlist] [song]**: Removes specified song from playlist

**!shuffle [playlist]** : Shuffles the playlist

###Text

**!cp [tag] OR  !pasta [tag]  OR  !copypasta [tag]**: Prints out the specified copypasta

**!listcp  OR !listpasta  OR  !listcopypasta**: Lists available copy pastas

**!addcp [tag] [text]  OR  !addpasta [tag] [text]  OR  !addcopypasta [tag] [text]** : Add a new copypasta

###Misc

**!domath [query]**: Evaluate a mathematical expression using wolfram-alpha
