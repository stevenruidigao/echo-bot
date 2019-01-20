const fs = require('fs');
const ytdl = require('ytdl-core');
const Discord = require('discord.js');
const musicQueue = new Map();
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})
const config = require("./config.json");
const client = new Discord.Client();

client.on("ready", () => {
	console.log("Running!");
	client.user.setActivity(`Serving ${client.guilds.size} servers`);
    client.user.setActivity("Youtube", { type: "WATCHING"})
});

client.on("guildCreate", guild => {
	console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
	client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
	console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
	client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("message", async message => {
	serverQueue = musicQueue.get(message.guild.id);
	if (!serverQueue) {
		serverQueue = {
			dispatcher: null,
			connection: null,
			songs: [],
			//streamOptions: {seek: 0, volume: 1, passes: 4},
			playing: null
		}
		// songs[0] is current song
		musicQueue.set(message.guild.id, serverQueue);
	}
	if(message.author.bot) return;
	var channel = message.channel;
	const args = message.content.trim().split(/ +/g);
	const cmd = args[0].toLowerCase();
	var serverQueue = musicQueue.get(message.guild.id);
	args.shift();
	// console.log(args);
	var msg = message.content.toLowerCase();
	if (cmd.indexOf("hi") > -1 || cmd.indexOf("hello") > -1 || cmd.indexOf("yo") > -1 || cmd.indexOf("hey") > -1) {
		responses = ["Hi", "Hello", "Hey"];
		suffixes = ["!", " there.", " there!"];
		channel.send(choice(responses) + choice(suffixes));
	}
	if (msg.indexOf(config.prefix) !== 0) return;
	// console.log(cmd);
	switch (cmd) {
		case "!help":
			channel.send("Ask @stevenruidigao");
			break;
		case "!ping":
			const m = await channel.send("Ping?");
			m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`).catch(O_o=>{});
			break;
		case "!say":
			message.delete().catch(O_o=>{}); 
			const sayMessage = args.join(" ");
			channel.send(sayMessage);
			break;
		case "!idk":
			console.log("IIIDDDKKK: " + cmd + " : " + cmd === "idk");
			channel.send(
				"Eu não sei \n" +
				"I don't know \n" +
				"我不知道 \n" +
				"Je ne sais pas \n" +
				"No sé \n" +
				"몰라요? \n" +
				"知りません? \n" +
				"Nescio"
			) 
			break;
		case "!type":
			message.delete().catch(O_o=>{});
			if (message.author.discriminator != "6632") {
				channel.send("You don't have the permission to use this command");
				return;
			}
			var answer = ""
			readline.question("Type what Echo Bot should say: ", (answer) => {
				channel.send(answer);
			});
			break;
		case "!spam":
			message.delete().catch(O_o=>{});
			if (args.length > 0) {
				for (var i = 0; i < args[0]; i ++) channel.send("...");
			}
			break;
		case "!play":
			id = args[0].split("=")[1];
			play(message.guild, message.channel, message.member.voiceChannel, id);
			break;	
		case "!cache":
			id = args[0].split("=")[1];
			filename = "cached_music/" + id + ".mp3";
			ytdl(args[0]).pipe(fs.createWriteStream(filename));
			console.log("Done!");
			break;
		case "!skip":
			serverQueue.playing = null;
			serverQueue.connection.dispatcher.end();
			break;
		case "!stop":
			serverQueue.songs.length = 0;
			serverQueue.playing = null;
			serverQueue.connection.dispatcher.end();
			break;
		case "!np":
			message.channel.send("Now Playing: https://www.youtube.com/watch?v=" + serverQueue.songs[0]);
			break;
		case "!queued":
			message.channel.send("Queue: " + serverQueue.songs);
			break;
	}
});
function choice(choices) {
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}
async function play(guild, channel, voiceChannel, songid) {
	console.log("sid: " + songid);
	if (songid == null) {
		console.log("null");
		return;
	}
	serverQueue = musicQueue.get(guild.id);
	// console.log(serverQueue.songs);
	serverQueue.songs.push(songid);
	console.log("songs1: " + serverQueue.songs);
	console.log(!(!serverQueue.playing));
	if (serverQueue.playing) {
		return;
	}
	console.log(guild && voiceChannel);
	if (guild && voiceChannel && !guild.voiceConnection) {
		await voiceChannel.join().then(connection => { // Connection is an instance of VoiceConnection
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
	}
	else {
		console.log("Not using cache :(");
		ytdl(url).pipe(fs.createWriteStream(filename));
	}
	const dispatcher = serverQueue.connection.playFile(filename);//, serverQueue.streamOptions);
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
}
client.login(config.token);