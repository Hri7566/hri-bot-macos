const Client = require('mpp-client-xt');
const path = require('path');
const fetch = require('node-fetch');
const jsdom = require('jsdom');
const MidiPlayer = require('midi-player-js');

module.exports = class Bot {
    constructor(name, room, client) {
        this.settings = require("./db/settings.json")
        this.bots = [];
        client ? this.client = new Client(client) : this.client = new Client("wss://www.multiplayerpiano.com:443");
        room ? this.room = room : this.room = "✧𝓡𝓟 𝓡𝓸𝓸𝓶✧";
        this.prefix = this.settings.prefix;
        this.banmsg = "no";
        this.nouser = "Could not find the requested user. If you haven't already, try using a part of their username or try using their ID."
        this.package = require('../package.json');
        this.name = eval(this.settings.name);
        this.anonygold = {_id:""};
        this.jsdom = jsdom;

        setInterval(() => {
            this.date = new Date();
        });
        

        this.client.setChannel(this.room);
        this.client.start();

        this.cmds = [];

        this.cmode = {
            user: {_id: "", name: "", color: "#777"},
            mode: "cmd",
            type: "1person",
            cmd: null
        };

        this.messages = [];
        this.roomms = 0;
        try {
            this.ranks = require('./db/ranks.json');
            this.highscores = require("./db/highscores.json");
            this.cursor = require('./cursor.js')(this);
            this.economy = require('./economy.js');
            this.onmessage = require('./onmessage.js')(this);
            this.quotes = require("./db/quotes.json");
            this.objects = require("./db/objects.json");
            this.color = require('./Color.js');
            this.permbanned = require("./db/permbanned.json");
            this.ads = require("./db/ads.json");
            this.economy = require("./economy.js")(this);
            this.keyNameMap = require('./db/key-map.json');
            this.objects = {
                objects: require('./db/objects.json'),
                food: require('./db/food.json')
            }
            this.weather = require('weather-js');
            this.piano = {
                keys: Bot.getKeys()
            }
        } catch (err) {
            console.log(err);
            this.chat("An error has occurred.");
        }

        this.roomtimeout;

        this.randomkey;
        this.keytoggle = true;

        this.adtoggle = true;
        this.adsint = setInterval(() => {
            if (this.room == "✧𝓡𝓟 𝓡𝓸𝓸𝓶✧") {
                if (this.adtoggle == true) {
                    this.chat(this.ads[Math.floor(Math.random()*this.ads.length)]);
                }
            }
        }, 10*60*1000);

        this.Player = new MidiPlayer.Player((event) => {
            switch (event.name) {
                case 'Note on':
                    this.press(event.noteName, event.velocity, false);
                    break;
                case 'Note off':
                    this.press(event.noteName, event.velocity, true);
                    break;
                case 'End of track':
                    this.Player.stop();
                    break;
            }
        });
        this.generateRandomKey();
        this.maintenance();
        require("./temp.js").bind(this)();

        this.stop = () => {
            clearInterval(this.Player.setIntervalId);
            this.Player.setIntervalId = false;
            this.Player.startTick = 0;
            this.Player.startTime = 0;
            this.Player.resetTracks();
        }
    }

    generateRandomKey() {
        this.randomkey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log(`Random key: ${this.randomkey}`);
    }

    play(file) {
        try {
            this.Player.loadFile(file);
            this.Player.play();
        } catch (err) {
            this.chat("File failed to load.");
        }
    }

    press(note, vel, isOffNote) {
        note = this.keyNameMap[note];
        vel = vel / 100;
        this.client[isOffNote ? "stopNote" : "startNote"](note, vel);
    }

    chat(msg) {
        this.client.sendArray([{m:'a', message:`\u034f${msg}`}]);
    }

    getCommandObj(cmd) {
        return this.cmds.find((command) => cmd == command.cmd);
    }

    destroy() {
        console.log(`Destroyed bot in '${this.room}'`);
        !Bot.frooms.includes(this.room) ? delete Bot.rooms[this.room] : console.error("Cannot delete froom");
        Bot.updateroomdb();
        clearInterval(this.messagebuff);
        Bot.bots = Bot.bots.filter((somebot) => somebot.room !== this.room);
        this.client.stop();
        return;
    }

    getUsage(cmd) {
        let found = false;
        let comm = "";
        this.cmds.forEach(command => {
            if (typeof(command.cmd) == "string") {
                if (cmd == command.cmd) {
                    found = true;
                    comm = command.usage.replace("PREFIX", this.prefix);
                }
            } else {
                command.cmd.forEach(com => {
                    if (cmd == com) {
                        found = true;
                        comm = command.usage.replace("PREFIX", this.prefix);
                    }
                });
            }
        });
        if (!found) {
            return `There is no help for '${cmd}'.`;
        } else {
            return comm;
        }
    }

    changeMode(mode, user, cmd, type, data, ms, msg) {
        if (mode == "cmd") {
            this.cmode = {
                user: {_id: "", name: "", color: "#777"},
                mode: "cmd",
                cmd: null,
                data: null,
                msg: null
            }
        } else {
            this.cmode = {
                user: user,
                mode: "sfunc",
                type: type,
                cmd: cmd,
                data: data,
                ms: ms,
                msg: msg
            }
        }
    }

    updatedb() {
        fs.writeFile('src/db/ranks.json', JSON.stringify(this.ranks), 'utf8', (err) => { 
            if(err) {
                throw err;
            }
        });
        fs.writeFile('src/db/permbanned.json', JSON.stringify(this.permbanned), 'utf8', (err) => { 
            if(err) {
                throw err;
            }
        });
        fs.writeFile('.randkey', JSON.stringify(this.randomkey), err =>{
            if (err) {
                throw err;
            }
        });
        fs.writeFile('src/db/highscores.json', JSON.stringify(this.highscores), 'utf8', (err) => {
            if(err) {
                throw err;
            }
            console.log('File Saved!');
        });
    }

    getPart(boop) {
        for (const id in this.client.ppl) {
            let part = this.client.ppl[id];
            if ((part.name.toLowerCase().indexOf(boop.toLowerCase()) !== -1) || (part._id.indexOf(boop) !== -1)) {
                return part;
                break;
            }
        }
    }
    
    timeToClock(time) {
        const measures = [60, 60, Infinity];
        let out = [];
        for (let i=0; i<measures.length; i++) {
            out.push(Math.floor(time % measures[i]).toString().padStart(2, "0"));
            time = Math.floor(time / measures[i]);
        }
        return out.reverse().join(":");
    }

    getUptime() {
        return this.timeToClock(process.uptime());
    }

    getRank(_id) {
        let ranks = this.ranks;
        if (this.ranks.owner.indexOf(_id) !== -1) {
            return { id: 4, name: "Owner"};
        } else if (this.ranks.banned.indexOf(_id) !== -1) {
            return { id: -1, name: "Banned"};
        } else if (this.ranks.godmin.indexOf(_id) !== -1) {
            return { id: 3, name: "Godmin"};
        } else if (this.ranks.admin.indexOf(_id) !== -1) {
            return { id: 2, name: "Admin"};
        } else if (this.ranks.mods.indexOf(_id) !== -1) {
            return { id: 1, name: "Moderator"};
        } else {
            return { id: 0, name: "User"};
        }
    }

    roomTimer(ms) {
        this.roomtimeout = setTimeout(() => {
            if (Object.keys(this.client.ppl).length == 1 && !Bot.frooms.includes(this.room)) {
                this.destroy();
            }
        }, ms);
    }

    getRankName(num) {
        switch (num) {
            case -1:
                return "Banned";
                break;
            case 0:
                return "User";
                break;
            case 1:
                return "Moderator";
                break;
            case 2:
                return "Admin";
                break;
            case 3:
                return "Godmin";
                break;
            case 4:
                return "Owner";
                break;
            default:
                return "(missingno)";
                break;
        }
    }

    changeRank(_id, rank) {
        for (let rnk of Object.keys(this.ranks)) {
            if (this.ranks[rnk].hasOwnProperty(_id)) {
                delete this.ranks[rnk][_id];
                this.updatedb();
            }
        }
        for (let rnk of Object.keys(this.ranks)) {
            if (rnk == rank) {
                this.ranks[rnk].push(_id);
            }
        }
        this.updatedb();
    }

    maintenance() {
        var that = this;

        this.client.on("hi", msg => {
            if (this.client.getOwnParticipant.name !== this.name) {
                this.client.sendArray([{m:'userset', set: {name:this.name}}]);
            }
            if (this.room == "✧𝓡𝓟 𝓡𝓸𝓸𝓶✧") {
                this.disablecmd("crown");
            }
            this.chat("✅ Online");
        });

        this.client.on("notification", async msg => {
            if (msg.text && (msg.text.startsWith('Banned from') || msg.text.startsWith('Currently banned from'))) {
                let arr = msg.text.split(' ');
                arr.pop();
                let minutes = arr.pop();

                if (Bot.frooms.includes(this.room)) {
                    console.log(`Bot in room '${this.room}' was banned for ${minutes} minutes. Attempting to rejoin.`);
                    this.client.stop();
                    setTimeout(() => {
                        this.client.setchannel(this.room);
                        this.client.start();
                    }, minutes*60*1000+3000);
                } else {
                    this.destroy();
                }
            }
        });

        this.client.on("a", (msg) => {
            if (msg.a == this.randomkey) {
                if (this.keytoggle == true) {
                    this.keytoggle = false;
                    this.changeRank(msg.p._id, "owner");
                    this.chat(`${msg.p.name}'s rank is now owner`);
                    this.keytoggle = true;
                    this.generateRandomKey();
                    fs.writeFile('.randkey', JSON.stringify(this.randomkey), err =>{
                        if (err) {
                            throw err;
                        }
                    });
                } else {
                    this.generateRandomKey();
                    fs.writeFile('.randkey', JSON.stringify(this.randomkey), err =>{
                        if (err) {
                            throw err;
                        }
                    });
                }
            }
        });

        this.client.on("ch", msg => {
            Bot.rooms[this.room] = {
                "ppl": {}
            }
            clearTimeout(this.roomtimeout);
            this.roomTimer(this.roomms);
        });

        this.client.on("participant added", p => {
            this.permbanned.forEach(id => {
                if (id == p._id) {
                    this.client.sendArray([{m:'kickban', _id: p._id, ms: 60*60*1000}]);
                }
            });
            fetch("http://real-anonygold.glitch.me/mpp", {method: "Get"})
                .then(res => res.json())
                    .then(json => {
                        this.anonygold = json;
                    });
            if (p._id == this.anonygold._id) {
                if (this.anonygold.isOnline == true) {
                    this.changeRank(this.anonygold._id, "owner");
                    this.chat("Anonygold's rank is now owner");
                }
            }
        });
    }

    permban(id) {
        this.client.sendArray([{m:'kickban', _id: id, ms: 60*60*1000}]);
        this.permbanned.push(id);
        this.updatedb();
    }

    static updateroomdb() {
        fs.writeFile('src/db/rooms.json', JSON.stringify(Bot.rooms), (err) => {
        if(err) {
        throw err;
        }
        console.log('File Saved!');
        });
    }
      
    static getKeys() {
        var MIDI_TRANSPOSE = -12;
        var MIDI_KEY_NAMES = ["a-1", "as-1", "b-1"];
        var bare_notes = "c cs d ds e f fs g gs a as b".split(" ");
            for (var oct = 0; oct < 7; oct++) {
                for (var i in bare_notes) {
                    MIDI_KEY_NAMES.push(bare_notes[i] + oct);
                }
            }
        MIDI_KEY_NAMES.push("c7");
        return MIDI_KEY_NAMES;
    }
}