//This file contains the main JavaScript code that controls the Echo Bot.

//File system.
const fs = require('fs');
//Command line YouTube video downloader.
const ytdl = require('ytdl-core');
//Config.json file.
const config = require("./config.json");
//YouTube APIs.
const YouTube = require('simple-youtube-api');
const youtube = new YouTube(config.googleapikey);
//Discord.js library.
const Discord = require('discord.js');
//Interface for reading data from a Readable stream.
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});
//Discord bot.
const client = new Discord.Client();
//Music queue object.
const musicQueue = new Map();

//Array of the possible commands.
const commands = ["!help", "!ping", "!idk", "!play"];

//Runs when the bot is ready.
client.on("ready", () => {
	console.log("Running!");
	client.user.setActivity(`Serving ${client.guilds.size} servers`);
	client.user.setActivity("Youtube", {type: "WATCHING"})
});

//Outputs warning message to the console.
client.on('warn', console.warn);

//Runs when there is an error.
client.on('error', console.error);

//Runs when the bot disconnects.
client.on('disconnect', () => {
	console.log('I just disconnected, making sure you know, I will reconnect now...');
	restart();
});

//Runs when bot reconnects to the server.
client.on('reconnecting', () => console.log('I am reconnecting now!'));

//Creates a guild.
client.on("guildCreate", guild => {
	console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
	client.user.setActivity(`Serving ${client.guilds.size} servers.`);
});

//Deletes a guild.
client.on("guildDelete", guild => {
	console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
	client.user.setActivity(`Serving ${client.guilds.size} servers.`);
});

//Runs when the bot receives a message.
client.on("message", async message => {
	if(message.author.bot) return;
	console.log(message.content);
	serverQueue = musicQueue.get(message.guild.id);
	if (!serverQueue) {
		serverQueue = {
			dispatcher: null,
			connection: null,
			songs: [],
			streamOptions: {seek: 0, volume: 1, passes: 4},
			playing: null
		}
		musicQueue.set(message.guild.id, serverQueue);
	}
	var channel = message.channel;
	const args = message.content.trim().split(" ");
	const cmd = args[0].toLowerCase();
	var serverQueue = musicQueue.get(message.guild.id);
	args.shift();
	var msg = message.content.toLowerCase();
	if (cmd.indexOf("hi") > -1 || cmd.indexOf("hello") > -1 || cmd.indexOf("hey") > -1) {
		//Generate random bot response.
		responses = ["Hi", "Hello", "Hey"];
		suffixes = ["!", " there.", " there!"];
		channel.send(choice(responses) + choice(suffixes));
	}
	//This switch statement responds to various commands.
	switch (cmd.split(config.prefix)[1]) {
		case "commands":
			channel.send("Echo Bot can do many things. Here are the commands Echo Bot will respond to: " + commands + ".");
			break;
		//Restart the client.
		case "restart":
			restart(client);
		//Tell the user where to ask for help.
		case "help":
			channel.send("Ask for help in #help!");
			break;
		//Tell the user the latency.
		case "ping":
			const m = await channel.send("Ping?");
			m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`).catch(O_o=>{});
			break;
		//Does not seem to do anything.
		case "say":
			message.delete().catch(O_o=>{}); 
			channel.send(args.join(" "));
			break;
		//Displays "I do not know." in many different languages.
		case "idk":
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
		//Repeats what you tell Echo Bot to say. Only the administrator can use this command.
		case "type":
			message.delete().catch(O_o=>{});
			if (message.author.discriminator != "6632") {
				channel.send("You do not have permission to use this command. Only the administrator can run this command.");
				return;
			}
			var answer = "";
			readline.question("Type what Echo Bot should say: ", (answer) => {
				channel.send(answer);
			});
			break;
		//Spams the channel with '...'.
		case "spam":
			message.delete().catch(O_o=>{});
			if (args.length > 0) {
				for (var i = 0; i < args[0]; i ++) channel.send("...");
			}
			break;
		//Plays music.
		case "play":
			message.delete().catch(O_o => {});
			if (!message.member.voiceChannel) {
				message.reply("You need to join a voice channel first!");
			} else {
				var permissions = message.member.voiceChannel.permissionsFor(message.client.user);
				if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) message.reply("I don't have permission to join this voice channel!"); 
				//Check for permission to join.
				else play(message.guild, message.channel, message.member.voiceChannel, args.join(" "));
			}
			break;
		case "cache":
			id = args[0].split("=")[1];
			filename = "cached_music/" + id + ".mp3";
			ytdl(args[0]).pipe(fs.createWriteStream(filename));
			console.log("Done!");
			break;
		case "skip":
			//Skip the current song.
			if (!serverQueue.playing) {
				channel.send("There is nothing playing!"); 
			} else {
				serverQueue.playing = null;
				serverQueue.connection.dispatcher.end();
			}
			break;
		case "stop":
			//Stop the current song.
			if (!serverQueue.playing) {
				channel.send("There is nothing playing.");
			} else {
				serverQueue.songs.length = 0;
				serverQueue.playing = null;
				serverQueue.connection.dispatcher.end();
			}
			break;
		case "pause":
			//Pause the song.
			serverQueue.connection.dispatcher.pause();
			break;
		case "resume":
			//Resume the song.
			serverQueue.connection.dispatcher.resume();
			break;
		case "nowplaying":
			//The song that is currently playing.
			message.channel.send("Now Playing: " + serverQueue.songs[0]);
			break;
		case "queued":
			//Queued songs.
			message.channel.send("Queue: " + serverQueue.songs);
			break;
	}
});

//Gets a random value out of a specified array.
function choice(choices) {
	var index = Math.floor(Math.random() * choices.length);
	return choices[index];
}

//Plays music.
async function play(guild, channel, voiceChannel, input) {
	console.log(input);
	//Get the queue.
	serverQueue = musicQueue.get(guild.id);
	var url = input;
	isYTUrl = url.indexOf("=") > -1;
	if (!isYTUrl) {
		url = await getYTUrl(input).catch(console.log) + "";
	}
	//Add song to the queue.
	serverQueue.songs.push(url);
	if (serverQueue.playing != null) {
		return;
	}
	// if there are no songs, leave.
	if (!serverQueue.songs[0]) {
		voiceChannel.leave();
		return;
	}
	songid = url.split("=")[1];
	filename = "./cached_music/" + songid + ".mp3";
	console.log(!fs.existsSync(filename));
	if (!fs.existsSync(filename)) {
		console.log("Not using cache :(");
		await ytdl(url).pipe(fs.createWriteStream(filename));
	}
	serverQueue.playing = url;
	if (guild && voiceChannel) {
		//Connect to the voice channel.
		await voiceChannel.join().then(connection => { //Connection is an instance of VoiceConnection.
			serverQueue.connection = connection;
			channel.send("I have successfully connected to the channel!");
			//Play the file.
			const dispatcher = connection.playFile(filename);
			channel.send("Now Playing: " + url);
			serverQueue.playing = url;
			serverQueue.dispatcher = dispatcher;
			dispatcher.on("end", reason => {
				console.log(reason);
				console.log("*" + serverQueue.songs);
				serverQueue.songs.shift();
				if (serverQueue.songs.length > 1) {
					//Play the next song.
					play(guild, channel, voiceChannel, serverQueue.songs[0]);
				}
				voiceChannel.leave();
				console.log("Left channel");
			});
		}).catch(console.log);
	}
}

//Search YouTube for the song and return the URL of the song.
async function getYTUrl(search) {
	var url;
	//Search for a song.
	await youtube.searchVideos(search, 1).then((results) => {
		url = "https://www.youtube.com/watch?v=" + results[0].id;
	});
	return url;
}

//Restarts the bot.
function restart(client) {
	console.log("Restarting...");
	client.destroy().then(() => {
		client.login(config.token);
	});
}

//Login the bot with the token.
client.login(config.token);