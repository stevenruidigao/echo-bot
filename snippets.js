console.log("sid: " + songid);

if (songid == null) {
    console.log("null");
    return;
}

serverQueue = musicQueue.get(guild.id);
console.log(serverQueue.songs);
serverQueue.songs.push(songid);

console.log("songs1: " + serverQueue.songs);
console.log(!(!serverQueue.playing));

if (serverQueue.playing) {
    return;
}

console.log(guild && voiceChannel);

if (guild && voiceChannel) {
    await voiceChannel.join().then(connection => {
        serverQueue.connection = connection;
        console.log("Joined channel");
    }).catch(console.log);
}

serverQueue.playing = songid;
console.log(serverQueue.playing);
filename = "cached_music/" + songid + ".mp3";
url = "https://www.youtube.com/watch?v=" + songid;
channel.send("Now Playing: " + url);
console.log(url);

if (fs.existsSync(filename)) {
    console.log("Using cache!");
} else {
    try {
        console.log("Not using cache :(");
        ytdl(url).pipe(fs.createWriteStream(filename));
    } catch {
        console.log("Searching for: " + songid);
        await youtube.searchVideos(songid, 1).then((results) => {
            console.log(results);
            url =  "https://www.youtube.com/watch?v=" + results[0].id;
            console.log(url);
            filename = results[0].id +".mp3";
            ytdl(url).pipe(fs.createWriteStream(filename));
            console.log(serverQueue.connection);
        });
    }
}

const dispatcher = serverQueue.connection.playFile(filename);
serverQueue.dispatcher = dispatcher;

dispatcher.on("end", () => {
    console.log("*" + serverQueue.songs);
    if (serverQueue.songs.length > 1) {
        serverQueue.songs.shift();
        serverQueue.playing = null;
        console.log(serverQueue + "****** shifted " + serverQueue.songs);
        play(guild, channel, voiceChannel, serverQueue.songs[0]);
    }
    voiceChannel.leave();
    console.log("Left channel");
});