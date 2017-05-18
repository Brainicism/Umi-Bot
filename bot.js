const config = require("./config")
const Discord = require("discord.js");
const mongoConString = config.mongo.conString;
const fs = require("fs");
const bot = new Discord.Client();
const MongoClient = require('mongodb').MongoClient;
const ffmpeg = require("fluent-ffmpeg");
const ytdl = require("ytdl-core");
const request = require("request");
const wolfram = require("wolfram-alpha").createClient(config.wolfram.apiKey);

var quotes = [];
var copyPastas = [];
var downloadRunning = false;
var helpText = "";

function isAlone(voiceBot) {
    var connections = voiceBot.voiceConnections;
    connections.map((connection) => {
        if (connection.channel.members.array().length == 1) {
            connection.disconnect();
        }
    });
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
if (config.discord.token == "") {
    console.log("Discord login token required");
    process.exit(0);
}
if (config.mongo.conString == "") {
    console.log("MongoDB connection string required");
    process.exit(0);
}
bot.login(config.discord.token).catch((e) => console.log(e));

bot.on("ready", (a) => {
    console.log("Bot Ready!");
    bot.user.setUsername("Bot").catch((e) => console.log(e));
    bot.user.setStatus("online", "Human Simulator 2016");
    getQuotes();
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


//destroys connection if call is empty
bot.on("voiceStateUpdate", function (voiceChannel, user) {
    isAlone(bot);
});

var args = null;
var songTag = null;
var relativeVolume = null;
var copyPastaTag = null;
var randQuote = null;
var wolframExpression = null;
var rnd = null;
var dispatcher = null;

bot.on("message", (message) => {
    rnd = Math.random(); //random chance of random quote
    if (rnd < 0.005) {
        randQuote = quotes[Math.floor(Math.random() * quotes.length)];
        message.channel.send(randQuote);
    } else if (message.content === "!help") { //lists commands
        message.channel.send(helpText);
    } else if (message.content.toLowerCase().startsWith("!domath")) { //wolfram alpha query
        if (config.wolfram.apiKey == "") {
            message.channel.send("Requires wolfram api key");
            return;
        }
        wolframExpression = message.content.substr(message.content.indexOf(" ") + 1);
        wolfram.query(wolframExpression, (err, result) => {
            var pod = null;
            if (result) {
                for (var i = 0; i < result.length; i++) {
                    if (result[i].title === "Result" || result[i].title === "Decimal approximation" || result[i].title.startsWith("Series expansion")) { //if the expression has an explicit result
                        pod = result[i];
                        message.channel.send(pod.subpods[0].text);
                        break;
                    }
                    if (result[i].title === "Results") {
                        pod = result[i];
                        var answerText = "";
                        for (var k = 0; k < pod.subpods.length; k++) {
                            answerText += pod.subpods[k].text + ", ";
                        }
                        answerText = answerText.substring(0, answerText.length - 2);
                        message.channel.send(answerText);
                        break;
                    }
                }
                if (pod == null) { // otherwise, print first pod
                    pod = result[0];
                    if (pod == null) {
                        message.channel.send("Invalid expression");
                    } else {
                        console.log(pod);
                        var subpod = pod.subpods[0];
                        message.channel.send(subpod.text);
                    }
                }
            }

        });
    } else if (message.content === "!quote") { //generate random quote
        randQuote = quotes[Math.floor(Math.random() * quotes.length)];
        message.channel.send(randQuote);
    }
    else if (message.content.toLowerCase() === "!numquotes") {
        if (quotes.length === 0) {
            message.channel.send("I couldn't connect to my database, try again in one minute");
        }
        message.channel.send("I have " + quotes.length + " quotes in my memory");
    }
    else if (message.content.toLowerCase().startsWith("!addquote")) { //add new quote
        args = message.content.split(" ");
        if (args[1] != null) {
            var newQuote = message.content.substr(message.content.indexOf(" ") + 1);
            if (quotes.indexOf(newQuote) !== -1) {
                message.channel.send("No duplicates allowed");
                return;
            }
            quotes.push(newQuote);
            MongoClient.connect(config.mongo.conString, function (err, db) {
                var collection = db.collection('quotes');
                collection.insert({ text: newQuote, date: new Date(), authorId: message.author.id, authorName: message.author.username }, function (err, result) {
                    if (err) {
                        message.channel.send("Quote add fail ERROR: " + err);
                        return;
                    }
                    message.channel.send("'" + newQuote + "', sounds like something I would say");
                });
            });

        } else {
            message.channel.send("Missing parameter");
        }
    } else if (message.content.toLowerCase() === "!listclips") { //shows list of available audio clips
        var clips = [];
        var availableClips = "";
        fs.readdir("audio/clips", function (err, items) {
            items.forEach(function (item, index) { //seperate audio by file size
                fs.stat("audio/clips/" + items[index], (err, stats) => {
                    var fileSize = stats.size / 1000000.0;
                    if (fileSize < 1.00) {
                        clips.push(item.slice(0, -4));
                    }
                    if (index === items.length - 1) {
                        availableClips = "**Available Clips**: \n" + JSON.stringify(clips);
                        console.log(availableClips);
                        message.channel.send(availableClips);
                    }
                });
            });
        });
    } else if (message.content.toLowerCase().startsWith("!listsongs")) {
        var songs = [];
        var availableSounds = "";
        fs.readdir("audio/clips", function (err, items) {
            items.forEach(function (item, index) { //seperate audio by file size
                fs.stat("audio/clips/" + items[index], (err, stats) => {
                    var fileSize = stats.size / 1000000.0;
                    if (fileSize > 1.00) { //consider >1MB a song
                        songs.push(item.slice(0, -4));
                    }
                    if (index === items.length - 1) {
                        availableSounds = "**Available Songs**: \n" + JSON.stringify(songs);
                        console.log(availableSounds);
                        message.channel.send(availableSounds);
                    }
                });
            });
        });
    } else if (message.content.toLowerCase().startsWith("!play")) { //plays downloaded audio clip
        args = message.content.split(" ");
        songTag = args[1];
        relativeVolume = args[2];
        if (songTag != null) {
            if (message.member.voiceChannel) {
                var voiceChannel = message.member.voiceChannel;
                voiceChannel.join().then((connection) => {
                    if (fs.existsSync("audio/clips/" + songTag + ".mp3")) {
                        if (relativeVolume == null) {
                            relativeVolume = 0.3;
                        } else if (relativeVolume > 3) {
                            message.channel.send("Volume too high, defaulting to 3.0");
                            relativeVolume = 3;
                        }
                        dispatcher = connection.playFile("audio/clips/" + args[1] + ".mp3", {
                            volume: relativeVolume
                        });
                        console.log("Now playing: " + args[1] + ".mp3");
                    } else {
                        message.channel.send("ERROR 404: Not Found \nFile not found");
                    }
                }, (err) => {
                    console.log(err);
                });
            } else {
                message.channel.send("You need to be in a voice channel to use this command");
            }
        } else {
            message.channel.send("Missing parameter");
        }
    } else if (message.content.toLowerCase() === "!stop") { //stop current audio
        if (bot.voiceConnections) {
            dispatcher.pause();
        }
    } else if (message.content.toLowerCase() === "!leave") { //leaves call
        if (bot.voiceConnections) {
            try {
                bot.voiceConnections.get(message.channel.id).disconnect();
            }
            catch (e) {
                console.log(e);
            }
        }
    }
    else if (message.content.toLowerCase().startsWith("!stream")) {
        args = message.content.split(" ");
        var url = args[1];
        relativeVolume = args[2];
        var seek = args[3];
        if (url == null) {
            message.channel.send("Missing parameter");
            return;
        }
        if (message.member.voiceChannel) {

            if (relativeVolume == null) {
                relativeVolume = 0.1;
            }
            var voiceChannel = message.member.voiceChannel;
            voiceChannel.join().then((connection) => {
                const streamOptions = {
                    seek: seek ? seek : 0,
                    volume: relativeVolume
                };
                console.log(streamOptions);
                const stream = ytdl(url, { filter: 'audio' });
                dispatcher = connection.playStream(stream, streamOptions);
                dispatcher.on("error", (err) => { console.log(err) });
            }).catch((err) => { console.log(err) });
        }
        else {
            message.channel.send("You need to be in a voice channel to use this command");
        }
    }
    else if (message.content.toLowerCase().startsWith("!download")) { //download and extract mp3 from youtube video
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
                                filter: function (format) {
                                    return format.container === "mp4";
                                }
                            });
                            var x = stream.pipe(fs.createWriteStream("temp.mp4"));
                            proc = new ffmpeg({
                                source: stream
                            });
                            message.channel.send("Beginning download");
                            proc.on("end", (stdout, stderr) => {
                                message.channel.send("Conversion Complete \nCommand: !play " + songTag + "\n" + proc._currentOutput.target);
                                downloadRunning = false;
                            });
                            proc.on("error", (err, stdout, stderr) => {
                                message.channel.send("Error transcoding: " + err + "\n");
                                downloadRunning = false;
                            });
                            proc.saveToFile("audio/clips/" + songTag + ".mp3");
                        } else if (info != null) { //video too long case
                            message.channel.send("ERROR 413: Payload Too Large \n Make sure the video is under 5 minutes");
                        } else if (info == null) { //invalid video ID case
                            message.channel.send("ERROR 404: Not Found \nVideo ID is invalid");
                        }
                    });
                } catch (err) { //unable to find video ID case
                    if (url.endsWith(".mp3")) { //if direct mp3 download
                        request
                            .get(url)
                            .on("end", (err) => {
                                message.channel.send("Download Complete \nCommand: !play " + songTag + "\naudio/clips/" + songTag + ".mp3");
                                downloadRunning = false;
                            })
                            .pipe(fs.createWriteStream("audio/clips/" + songTag + ".mp3"));
                    } else {
                        message.channel.send("ERROR 404: Not Found \nURL is not valid Youtube link or mp3 link");
                        downloadRunning = false;
                    }
                }
            } else { //downloading currently running
                message.channel.send("**Wait until the previous download is complete**");
            }
        } else {
            message.channel.send("Missing parameter(s)");
        }

    } else if (message.content.toLowerCase() === "!listpasta" || message.content.toLowerCase() === "!listcopypasta" || message.content.toLowerCase() === "!listcp") { //lists available copy pastas
        var copyPastaTags = [];
        for (var i = 0; i < copyPastas.length; i++) {
            copyPastaTags.push(copyPastas[i].tag);
        }
        message.channel.send("Available copypastas: \n" + JSON.stringify(copyPastaTags));
    } else if (message.content.toLowerCase().startsWith("!cp") || message.content.toLowerCase().startsWith("!copypasta") || message.content.toLowerCase().startsWith("!pasta")) { //sends copy pasta
        args = message.content.split(" ");
        copyPastaTag = args[1];
        if (copyPastaTag != null) {
            for (var i = 0; i < copyPastas.length; i++) {
                if (copyPastas[i].tag === copyPastaTag) {
                    message.channel.send(copyPastas[i].text);
                    break;
                }
            }
        } else {
            message.channel.send("Missing parameter");
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
                message.channel.send("'" + copyPastaTag + "' added");
            });
        } else {
            message.channel.send("Missing parameters");
        }
    }
});
function getQuotes() {
    MongoClient.connect(config.mongo.conString, function (err, db) {
        if (err) {
            console.log(err);
        }
        else {
            var collection = db.collection('quotes');
            collection.find({}).toArray(function (err, docs) {
                quotes = docs.map(function (a) { return a.text; });
            });
        }
    });
}