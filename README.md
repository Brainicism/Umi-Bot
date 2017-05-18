# Umi Bot
A general purpose Discord bot designed for a small-sized server.
## Requirements
Create a discord bot account [here](https://discordapp.com/developers/applications/me) and save the token. Get a Wolfram Alpha API [here](http://products.wolframalpha.com/developers/) and save the API key. Update the config.js file with these values, along with your MongoDB connection string. Download ffmpeg [here](https://ffmpeg.zeranoe.com/builds/) and add it to your PATH. 

If you want any of the audio commands, you must have the following installed:

- Python 2.7.x 
- FFMPEG
- C++ Build Tools

Instructions are [here](http://pastebin.com/Qb2TvxLy).

##Install
Run "npm install" to download required modules. Run "node bot" to start the bot. 
##Commands
###Quotes

**!quote** : Send a random previously added quote

**!addquote [quote]**: Add a new quote

**!numquotes**: Get number of quotes stored

### Audio

**!play [tag] {volume} **: Plays the specified clip in the voice channel the message's owner is in

**!stream [youtube_url] {volume} {seek}**: Streams a youtube video's audio channel

**!listclips**: Lists the audio clips tags available for playback

**!listsongs**: Lists the song tags available for playback

**!download [youtube url] {tag}**  OR  **!download [direct .mp3 URL] {tag}**: Downloads and/or extracts an mp3 for playback

**!stop**: Stops playback

**!leave**: Forces bot to leave the call


### Text

**!cp [tag] OR  !pasta [tag]  OR  !copypasta [tag]**: Prints out the specified copypasta

**!listcp  OR !listpasta  OR  !listcopypasta**: Lists available copy pastas

**!addcp [tag] [text]  OR  !addpasta [tag] [text]  OR  !addcopypasta [tag] [text]** : Add a new copypasta


### Misc

**!domath [query]**: Evaluate a mathematical expression using wolfram-alpha
