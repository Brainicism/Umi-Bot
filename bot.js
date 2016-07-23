const Discord = require("discord.js");
const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const request = require("request");
//get an API key at http://products.wolframalpha.com/developers/
const wolfram = require("wolfram-alpha").createClient("API-KEY");
const mainBot = new Discord.Client();
const playlistBot = new Discord.Client();
const ffmpegPath = "C:/ffmpeg/bin/ffmpeg.exe";

var playlists = [];
var currentPlaylist = [];
var quotes = [];
var copyPastas = [];
var queueRunning = false;
var downloadRunning = false;
var currSong = 0;
var helpText = "";

function isAlone(voiceBot) {
    if (voiceBot.voiceConnection) {
        var listUsers = voiceBot.voiceConnection.voiceChannel.members;
        if (listUsers.length === 1) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

//register at https://discordapp.com/register
mainBot.login("EMAIL-ADDRESS", "PASSWORD");
playlistBot.login("EMAIL-ADDRESS2", "PASSWORD2");

mainBot.on("ready", (a) => {
    console.log("Main Bot Ready!");
    mainBot.setUsername("Main Bot");
    mainBot.setStatus("online", "Human Simulator 2016");
    fs.readFile("data/quotes.json", 'utf8', (err, data) => {
        try {
            quotes = JSON.parse(data);
        } catch (err2) {
            console.log("quotes.json is empty");
            console.log(err2);
        }
    });
    fs.readFile("data/copy_pastas.json", (err, data) => {
        try {
            copyPastas = JSON.parse(data);
        } catch (err2) {
            console.log(err2);
            console.log("copy_pastas.json is empty");
        }
    });
    fs.readFile("data/help.txt", (err, data) => {
        try {
            helpText = data.toString().split("\n");
        } catch (err2) {
            console.log(err2);
        }
    });
});
playlistBot.on("ready", (a) => {
    console.log("Playlist Bot Ready!");
    playlistBot.setUsername("Playlist Bot");
    playlistBot.setStatus("online", "Human Simulator 2016");
});

//destroys connection if call is empty
mainBot.on("voiceLeave", (voiceChannel, user) => {
    if (isAlone(mainBot)) {
        mainBot.voiceConnection.destroy();
    }
});
playlistBot.on("voiceLeave", (voiceChannel, user) => {
    if (isAlone(playlistBot)) {
        playlistBot.voiceConnection.destroy();
    }
});
var args = null;
var songTag = null;
var relativeVolume = null;
var playlistTag = null;
var copyPastaTag = null;
var randQuote = null;
var wolframExpression = null;
var rnd = null;
mainBot.on("message", (message) => {
    rnd = Math.random(); //random chance of random quote
    if (rnd < 0.005) {
        randQuote = quotes[Math.floor(Math.random() * quotes.length)];
        mainBot.sendMessage(message.channel, randQuote);
    } else if (message.content === "!help") { //lists commands
        mainBot.sendMessage(message.channel, helpText);
    } else if (message.content.toLowerCase().startsWith("!domath")) { //wolfram alpha query
        wolframExpression = message.content.substr(message.content.indexOf(" ") + 1);
        wolfram.query(wolframExpression, (err, result) => {
            var pod = null;
            if (result) {
                for (var i = 0; i < result.length; i++) {
                    if (result[i].title === "Result" || result[i].title === "Decimal approximation" || result[i].title.startsWith("Series expansion")) { //if the expression has an explicit result
                        pod = result[i];
                        mainBot.sendMessage(message.channel, pod.subpods[0].text);
                        break;
                    }
                    if (result[i].title === "Results") {
                        pod = result[i];
                        var answerText = "";
                        for (var k = 0; k < pod.subpods.length; k++) {
                            answerText += pod.subpods[k].text + ", ";
                        }
                        answerText = answerText.substring(0, answerText.length - 2);
                        mainBot.sendMessage(message.channel, answerText);
                        break;
                    }
                }
                if (pod == null) { // otherwise, print first pod
                    pod = result[0];
                    if (pod == null) {
                        mainBot.sendMessage(message.channel, "Invalid expression");
                    } else {
                        console.log(pod);
                        var subpod = pod.subpods[0];
                        mainBot.sendMessage(message.channel, subpod.text);
                    }
                }
            }

        });
    } else if (message.content === "!quote") { //generate random quote
        randQuote = quotes[Math.floor(Math.random() * quotes.length)];
        mainBot.sendMessage(message.channel, randQuote);
    } else if (message.content.toLowerCase().startsWith("!addquote")) { //add new quote
        args = message.content.split(" ");
        if (args[1] != null) {
            var newQuote = message.content.substr(message.content.indexOf(" ") + 1);
            quotes.push(newQuote);
            fs.writeFile("data/quotes.json", JSON.stringify(quotes), (err) => { //add new quote
                mainBot.sendMessage(message.channel, "'" + newQuote + "', added.");
                fs.readFile("data/quotes.json", (err, data) => { //reload quotes
                    quotes = JSON.parse(data);
                });
            });
        } else {
            mainBot.sendMessage(message.channel, "Missing parameters");
        }
    } else if (message.content.toLowerCase() === "!listaudio") { //shows list of available audio clips
        var songs = [];
        var clips = [];
        var availableSounds = "";
        fs.readdir("audio/clips", (err, items) => {
            items.forEach((item, index) => { //seperate audio by file size
                fs.stat("audio/clips/" + items[index], (err, stats) => {
                    var fileSize = stats.size / 1000000.0;
                    if (fileSize > 1.00) { //consider >1MB a song
                        if (item.endsWith(".mp3")) {
                            songs.push(item.slice(0, -4));
                        }
                    } else { //consider <1MB a clip
                        if (item.endsWith(".mp3")) {
                            console.log(item);
                            clips.push(item.slice(0, -4));
                        }
                    }
                    if (index === items.length - 1) {
                        availableSounds = "**Available Clips**: \n" + JSON.stringify(clips) + "\n**Available Songs:** \n" + JSON.stringify(songs);
                        mainBot.sendMessage(message.channel, availableSounds);
                    }
                });
            });
        });
    } else if (message.content.toLowerCase().startsWith("!play")) { //plays downloaded audio clip
        args = message.content.split(" ");
        songTag = args[1];
        relativeVolume = args[2];
        if (songTag != null) {
            if (message.author.voiceChannel) {
                mainBot.joinVoiceChannel(message.author.voiceChannel, (err, connection) => {
                    if (fs.existsSync("audio/clips/" + songTag + ".mp3")) {
                        if (relativeVolume == null) {
                            relativeVolume = 1;
                        } else if (relativeVolume > 3) {
                            mainBot.sendMessage(message.channel, "Volume too high, defaulting to 3.0");
                            relativeVolume = 3;
                        }
                        mainBot.voiceConnection.playFile("audio/clips/" + args[1] + ".mp3", {
                            volume: relativeVolume
                        });
                        console.log("Now playing: " + args[1] + ".mp3");
                    } else {
                        mainBot.sendMessage(message.channel, "ERROR 404: Not Found \nFile not found");
                    }
                });
            } else {
                mainBot.sendMessage(message.channel, "You need to be in a voice channel to use this command");
            }
        } else {
            mainBot.sendMessage(message.channel, "Missing parameter");
        }
    } else if (message.content.toLowerCase() === "!stop") { //stop current audio
        if (mainBot.voiceConnection) {
            mainBot.voiceConnection.stopPlaying();
        }
    } else if (message.content.toLowerCase() === "!leave") { //leaves call
        if (mainBot.voiceConnection) {
            mainBot.voiceConnection.destroy();
        }
    } else if (message.content.toLowerCase().startsWith("!download")) { //download and extract mp3 from youtube video
        var savedMessage = message; //save message because new message maybe appear before download is complete
        args = savedMessage.content.split(" ");
        var url = args[1];
        songTag = args[2];
        if (url != null) {
            if (!downloadRunning) {
                downloadRunning = true;
                if (songTag == null) {
                    songTag = "temp";
                }
                try {
                    ytdl.getInfo(url, (err, info) => {
                        if (info != null && info.length_seconds < 301) { //success case
                            var stream = ytdl(url, {
                                quality: [18, 134, 243], //different 360p itag values
                                filter: function(format) {
                                    return format.container === "mp4";
                                }
                            });
                            var x = stream.pipe(fs.createWriteStream("temp.mp4"));
                            proc = new ffmpeg({
                                source: stream
                            });
                            mainBot.sendMessage(savedMessage.channel, "Beginning download");
                            proc.on("end", (stdout, stderr) => {
                                mainBot.sendMessage(savedMessage.channel, "Conversion Complete \nCommand: !play " + songTag + "\n" + proc._currentOutput.target);
                                downloadRunning = false;
                            });
                            proc.on("error", (err, stdout, stderr) => {
                                mainBot.sendMessage(savedMessage.channel, "Error transcoding: " + err + "\n");
                                downloadRunning = false;
                            });
                            proc.setFfmpegPath(ffmpegPath);
                            proc.saveToFile("audio/clips/" + songTag + ".mp3");
                        } else if (info != null) { //video too long case
                            mainBot.sendMessage(savedMessage.channel, "ERROR 413: Payload Too Large \n Make sure the video is under 5 minutes");
                        } else if (info == null) { //invalid video ID case
                            mainBot.sendMessage(savedMessage.channel, "ERROR 404: Not Found \nVideo ID is invalid");
                        }
                    });
                } catch (err) { //unable to find video ID case
                    if (url.endsWith(".mp3")) { //if direct mp3 download
                        request
                            .get(url)
                            .on("end", (err) => {
                                mainBot.sendMessage(savedMessage.channel, "Download Complete \nCommand: !play " + songTag + "\naudio/clips/" + songTag + ".mp3");
                                downloadRunning = false;
                            })
                            .pipe(fs.createWriteStream("audio/clips/" + songTag + ".mp3"));
                    } else {
                        mainBot.sendMessage(message.channel, "ERROR 404: Not Found \nURL is not valid Youtube link or mp3 link");
                        downloadRunning = false;
                    }
                }
            } else { //downloading currently running
                mainBot.sendMessage(message.channel, "**Wait until the previous download is complete**");
            }
        } else {
            mainBot.sendMessage(message.channel, "Missing parameter(s)");
        }

    } else if (message.content.toLowerCase() === "!listpasta" || message.content.toLowerCase() === "!listcopypasta" || message.content.toLowerCase() === "!listcp") { //lists available copy pastas
        var copyPastaTags = [];
        for (var i = 0; i < copyPastas.length; i++) {
            copyPastaTags.push(copyPastas[i].tag);
        }
        mainBot.sendMessage(message.channel, "Available copypastas: \n" + JSON.stringify(copyPastaTags));
    } else if (message.content.toLowerCase().startsWith("!cp") || message.content.toLowerCase().startsWith("!copypasta") || message.content.toLowerCase().startsWith("!pasta")) { //sends copy pasta
        args = message.content.split(" ");
        copyPastaTag = args[1];
        if (copyPastaTag != null) {
            for (var i = 0; i < copyPastas.length; i++) {
                if (copyPastas[i].tag === copyPastaTag) {
                    mainBot.sendMessage(message.channel, copyPastas[i].text);
                    break;
                }
            }
        } else {
            mainBot.sendMessage(message.channel, "Missing parameter");
        }
    } else if (message.content.toLowerCase().startsWith("!addpasta") || message.content.toLowerCase().startsWith("!addcp") || message.content.toLowerCase().startsWith("!addcopypasta")) { //adds new copy pasta
        args = message.content.split(" ");
        copyPastaTag = args[1];
        var firstArgRemoved = message.content.substr(message.content.indexOf(" ") + 1);
        if (copyPastaTag && args.length >= 3) {
            var newCopyPastaText = (firstArgRemoved.substr(firstArgRemoved.indexOf(" ") + 1)).trim();
            var newCopyPasta = {
                tag: args[1],
                text: newCopyPastaText
            };
            copyPastas.push(newCopyPasta);
            fs.writeFile("data/copy_pastas.json", JSON.stringify(copyPastas), (err) => {
                mainBot.sendMessage(message.channel, "'" + copyPastaTag + "' added");
            });
        } else {
            mainBot.sendMessage(message.channel, "Missing parameters");
        }
    }
});

playlistBot.on("message", (message) => {
    if (message.content.toLowerCase().startsWith("!startqueue") || message.content.toLowerCase().startsWith("!startplaylist")) { //starts specified playlist
        args = message.content.split(" ");
        playListTag = args[1];
        if (playListTag != null) {
            var foundPlaylist = null;
            fs.readFile("data/playlists/" + playListTag + ".json", 'utf8', (err, data) => {
                try {
                    foundPlaylist = JSON.parse(data);
                } catch (err) {
                    foundPlaylist = null;
                }
                if (foundPlaylist != null) { //if playlist is found
                    currentPlaylist = foundPlaylist.queue;
                    if (queueRunning) { //prevent multiple instances of queue running
                        if (playlistBot.voiceConnection) {
                            playlistBot.voiceConnection.destroy();
                        }
                    }
                    if (currentPlaylist.length > 0) {
                        if (message.author.voiceChannel) {
                            playlistBot.joinVoiceChannel(message.author.voiceChannel, (err, connection) => {
                                playlistBot.sendMessage(message.channel, "Found playlist: " + foundPlaylist.name + "\n" + currentPlaylist);
                                queueNext();
                            });
                        } else {
                            playlistBot.sendMessage(message.channel, "You need to be in a voice channel to use this command");
                        }
                    } else {
                        playlistBot.sendMessage(message.channel, "Playlist is empty");
                    }
                } else { //if playlist is not found
                    playlistBot.sendMessage(message.channel, "Could not find playlist");
                }
            })
        } else {
            playlistBot.sendMessage(message.channel, "Missing parameter");
        }

    } else if (message.content.toLowerCase() === "!stopqueue" || message.content.toLowerCase() === "!stopplaylist") { //stops playlist
        playlistBot.voiceConnection.destroy();
        queueRunning = false;
    } else if (message.content.toLowerCase().startsWith("!queue") || message.content.toLowerCase().startsWith("!addtoplaylist")) { //adds song to playlist
        args = message.content.split(" ");
        playlistTag = args[1];
        songTag = args[2];
        var songExists;
        fs.access("audio/clips/" + songTag + ".mp3", fs.F_OK, (err) => {
            songExists = err ? false : true;
            if (songExists) {
                fs.readFile("data/playlists/" + playlistTag + ".json", "utf8", (err, data) => {
                    if (err && err.toString().startsWith("Error: ENOENT")) { //if playlist doesn't exist
                        var newPlaylist = {
                            name: playlistTag,
                            queue: [songTag]
                        }
                        fs.writeFile("data/playlists/" + playlistTag + ".json", JSON.stringify(newPlaylist)); //create new playlist
                        playlistBot.sendMessage(message.channel, "'" + playlistTag + "' playlist created with song: " + "'" + songTag + "'");
                    } else if (err) { //other possible errors
                        playlistBot.sendMessage(message.channel, err);
                    } else { //playlist exists
                        foundPlaylist = JSON.parse(data);
                        foundPlaylist.queue.push(songTag);
                        playlistBot.sendMessage(message.channel, JSON.stringify(foundPlaylist.queue));
                        fs.writeFile("data/playlists/" + playlistTag + ".json", JSON.stringify(foundPlaylist));
                    }
                });

            } else {
                playlistBot.sendMessage(message.channel, "Song doesn't exist");
            }
        });

    } else if (message.content.toLowerCase() === "!listplaylists") { //lists playlists
        var playlistList = [];
        fs.readdir("data/playlists", (err, items) => {
            items.forEach((item, index) => { //seperate audio by file size
                playlistList.push(item.slice(0, -5));
            });
            playlistBot.sendMessage(message.channel, "**Available Playlists** : \n" + JSON.stringify(playlistList));
        });
    } else if (message.content.toLowerCase().startsWith("!deletequeue") || message.content.toLowerCase().startsWith("!deleteplaylist")) { // deletes playlist
        args = message.content.split(" ");
        playListTag = args[1];
        if (playListTag != null) {
            fs.unlink("data/playlists/" + playListTag + ".json", (err) => {
                if (err) {
                    playlistBot.sendMessage(message.channel, "Playlist not found");
                } else {
                    playlistBot.sendMessage(message.channel, playListTag + " successfully deleted");
                }
            });
        } else {
            playlistBot.sendMessage(message.channel, "Missing parameter");
        }

    } else if (message.content.toLowerCase().startsWith("!removefromqueue") || message.content.toLowerCase().startsWith("!removefromplaylist")) { //remove song from playlist
        args = message.content.split(" ");
        playlistTag = args[1];
        songTag = args[2];
        if (playlistTag && songTag) {
            var foundPlaylist = null;
            fs.readFile("data/playlists/" + playlistTag + ".json", "utf8", (err, data) => {
                if (err && err.toString().startsWith("Error: ENOENT")) { //if playlist doesn't exist
                    playlistBot.sendMessage(message.channel, "Playlist not found");
                } else if (err) {
                    playlistBot.sendMessage(message.channel, err);
                } else {
                    foundPlaylist = JSON.parse(data);
                    var arrayToLowerCase = [];
                    for (var i = 0; i < foundPlaylist.queue.length; i++) {
                        arrayToLowerCase.push(foundPlaylist.queue[i].toLowerCase());
                    }
                    var index = arrayToLowerCase.indexOf(songTag.toLowerCase());
                    if (index != -1) {
                        arrayToLowerCase.splice(index, 1);
                        var newPlaylist = {
                            name: playlistTag,
                            queue: arrayToLowerCase
                        }
                        fs.writeFile("data/playlists/" + playlistTag + ".json", JSON.stringify(newPlaylist));
                        playlistBot.sendMessage(message.channel, "'" + songTag + "' removed. \n" + JSON.stringify(arrayToLowerCase));
                    } else {
                        playlistBot.sendMessage(message.channel, "'" + songTag + "' could not be found");

                    }
                }
            });
        } else {
            playlistBot.sendMessage(message.channel, "Missing parameters");
        }

    } else if (message.content.toLowerCase().startsWith("!shuffle")) { //shuffles playlist
        args = message.content.split(" ");
        playlistTag = args[1];
        if (playlistTag) {
            fs.readFile("data/playlists/" + playlistTag + ".json", "utf8", (err, data) => {
                if (err && err.toString().startsWith("Error: ENOENT")) {
                    playlistBot.sendMessage(message.channel, "Playlist not found");
                } else if (err) {
                    playlistBot.sendMessage(message.channel, err);
                } else {
                    var foundPlaylist = JSON.parse(data);
                    var shuffled = shuffleArray(foundPlaylist.queue);
                    foundPlaylist.queue = shuffled;
                    fs.writeFile("data/playlists/" + playlistTag + ".json", JSON.stringify(foundPlaylist));
                    playlistBot.sendMessage(message.channel, JSON.stringify(foundPlaylist.queue));
                }
            });
        } else {
            playlistBot.sendMessage(message.channel, "Missing parameter");
        }
    }
});

function queueNext() {
    console.log(currentPlaylist[currSong]);
    if (currentPlaylist[currSong] != null) {
        queueRunning = true;
        var tag = currentPlaylist[currSong];
        var clip = "audio/clips/" + tag + ".mp3";
        if (fs.existsSync(clip)) {
            if (playlistBot.voiceConnection) {
                playlistBot.voiceConnection.playFile(clip, {
                    volume: 0.20
                }, (err, playingIntent) => {
                    playingIntent.on("end", (err) => {
                        //currentPlaylist.shift(); //remove song from array
                        currSong++; //go to next song
                        if (queueRunning) {
                            queueNext();
                        }
                    });
                });
            }
        }
    } else { //if at end of playlist, restart
        currSong = 0;
        if (queueRunning) {
            queueNext();
        }
    }
}
