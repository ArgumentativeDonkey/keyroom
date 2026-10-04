import Popup from "./popup.js";

// The Minigame class represents an instance of a minigame.
export default class Minigame {
    static defenseCap = 0.8;
    lives = 3;
    actionsPerRound = 2;
    defenseBase = 0.1;
    defenseModifier = 0;
    score = 0;

    static all_goblins = [
        {
            name: "👾",
            defense: 0.2,
            attack: 0.1,
            score: 4,
        },
        {
            name: "👺",
            defense: 0.1,
            attack: 0.3,
            score: 4,
        },
        {
            name: "👹",
            defense: 0.2,
            attack: 0.3,
            score: 8
        },
        {
            name: "👿",
            defense: 0.3,
            attack: 0.5,
            score: 12
        },
        {
            name: "👻",
            defense: 0.5,
            attack: 0.6,
            score: 19
        }
    ];

    /** @type{string[]} */
    goblins = [];

    durabilities = {
        sword: 5,
        teeth: 2,
        shield: 5,
        arm: 2,
    };

    static hitAreas = [
        "This one hits you in the chest.",
        "This one rips your organs out.",
        "This one claws your eyes.",
        "This one is really scary and you get really scared.",
        "This one eats your foot."
    ]
    static sayings = [
        "Do it.",
        "You're ready.",
        "Keep going.",
        "You got this.",
        "Finish them off.",
        "You can be strong.",
        "Don't fear.",
        "Crush them."
    ];
    static criticalSayings = [
        "You're overwhelmed.",
        "Give up.",
        "The end is nigh.",
        "Is this the end?",
        "This is your fate.",
        "I fear we are in danger.",
    ];
    static deathSayings = [
        "We have withered away.",
        "Your soul has gone.",
        "Your body has crumbled.",
        "Game Over"
    ]
    
    /** @type{string} */
    name;

    /**
     * 
     * @param {string} name 
     */
    constructor(name) {
        this.name = name;
    }
    
    async run() {
        await Popup.quick(`Welcome to the game, ${this.name}`, "continue");
        let shouldContinue = await Popup.quick("This game will take a few minutes. If you want to quit in the middle of the game, you must reload the page.<br />Continue?", "confirm");
        if (!shouldContinue) {
            return;
        }
        let shouldTutorial = await Popup.quick("Do you want a tutorial?", "confirm");
        if (shouldTutorial) {
            await Popup.quick(`You have ${this.lives} lives.`, "ok");
            await Popup.quick("These are goblins:<br><span class='gob'>👾👺👹👿👻</span>", "continue");
            await Popup.quick("Every time one of them successfully attack you, you lose one life.<br />", "continue");
            await Popup.quick("Basically, you want to stay alive as long as possible.", "ok");
            await Popup.quick(`You have three main ways to defend against your impending death. You choose ${this.actionsPerRound} of them any given turn.`, "continue");
            await Popup.quick("These are 🗡️ Attack, 🛡 Defend, and 💖 Special.", "continue");
            let atk = false;
            let def = false;
            let spc = false;
            while (!(atk && def && spc)) {
                let choice = await Popup.quick("Click on each action to learn more.", "3options", "🗡️ Attack", "🛡 Defend", "💖 Special");
                switch (choice) {
                    case "🗡️ Attack":
                        atk = true;
                        await Popup.quick("Attacking your opponents causes damage to them. You aren't very good at aiming, so your attacks will just hit one random goblin.", "ok");
                        break;
                    case "🛡 Defend":
                        def = true;
                        await Popup.quick("Defending against attacks makes it harder for the goblins to hit you.", "ok");
                        break;
                    case "💖 Special":
                        spc = true;
                        await Popup.quick("Your special abilities heal, nurture, and help you in various different ways.", "ok");
                        break;
                    default:
                        let c = await Popup.quick("Leaving so soon?", "confirm");
                        if (c) {                        
                            atk = true;
                            def = true;
                            spc = true;
                        }
                }
            }
            await Popup.quick("Without further ado, let's get into the game...", "ok");
        }
        this.addRandomGoblin();
        this.addRandomGoblin();
        while (this.lives > 0) {
            await this.tick();
            await this.gobsTaks();
            if (this.goblins.length == 0) {
                this.addRandomGoblin();
            }
            for (let i = 0; i < Math.sqrt(this.score) / 5; i++) {
                if (Math.random() < 0.5) {
                    this.addRandomGoblin();
                }
            }
            
        }
        await Popup.quick(`${Minigame.deathSayings[Math.floor(Math.random() * Minigame.deathSayings.length)]}<br />Score: ${Math.floor(this.score * 10)/10}`);
        
    }

    async tick() {
        console.log("tick");
        this.defenseModifier = 0;
        let actionsRemaining = this.actionsPerRound;

        let saying = Minigame.sayings[Math.floor(Math.random() * Minigame.sayings.length)];

        if (this.lives == 1) {
            saying = Minigame.criticalSayings[Math.floor(Math.random() * Minigame.criticalSayings.length)];
        }

        console.trace(actionsRemaining);
        while (actionsRemaining > 0) {
            let choice = await Popup.quick(`${saying}<br/><span class='gob'>${this.goblins.join('')}</span>`, "3options", "🗡️ATK", "🛡DEF", "💖SPC");
            switch (choice) {
                case "🗡️ATK":
                    if (this.goblins.length == 0) {
                        await Popup.quick("There is nothing to attack.", "ok");
                        actionsRemaining++;
                        continue;
                    }
                    let attack = await Popup.quick("🗡️ATK", "3options", "Sword", "Punch", "Bite");
                    switch (attack) {
                        case "Sword":
                            if (!await this.attack("sword")) {
                                actionsRemaining++;
                            }
                            break;
                        case "Punch":
                            if (!await this.attack("hand")) {
                                actionsRemaining++;
                            }
                            break;
                        case "Bite":
                            if (!await this.attack("teeth")) {
                                actionsRemaining++;
                            }
                            break;
                        default:
                            await Popup.quick("You must choose.", "ok");
                            actionsRemaining++;
                    }
                    break;
                case "🛡DEF":
                    let defense = await Popup.quick("🛡DEF", "3options", "Arm", "Shield", "Quatre-Vignt-Dix-Neuf");
                    switch (defense) {
                        case "Arm":
                            if (!await this.defend("arm")) {
                                actionsRemaining++;
                            }
                            break;
                        case "Shield":
                            if (!await this.defend("shield")) {
                                actionsRemaining++;
                            }
                            break;
                        case "Quatre-Vignt-Dix-Neuf":
                            if (!await this.defend("quatre-vignt-dix-neuf")) {
                                actionsRemaining++;
                            }
                            break;
                        default:
                            await Popup.quick("You must choose.", "ok");
                            actionsRemaining++;
                    }
                    break;
                case "💖SPC":
                    let special = await Popup.quick("💖SPC", "3options", "Pray", "Repair", "Rest");
                    switch (special) {
                        case "Pray":
                            await this.special("mystery");
                            break;
                        case "Repair":
                            await this.special("repair");
                            break;
                        case "Rest":
                            await this.special("health");
                            break;
                        default:
                            await Popup.quick("You must choose.", "ok");
                            actionsRemaining++;
                    }
                    break;
                default:
                    await Popup.quick("You must choose.", "continue");
                    actionsRemaining += 1;
            }
            actionsRemaining--;
        }
        console.log("tock");
    }

    async gobsTaks() {
        let all = this.goblins;
        for (let i = 0; i < all.length && this.lives > 0; i++) {
            await this.gobTak(all[i]);
        }
    }

    /**
     * 
     * @param {string} name 
     */
    async gobTak(name) {
        let gob = Minigame.getGoblin(name);
        if (Math.random() < gob.attack) {
            let def = this.defenseBase + this.defenseModifier;
            if (def > Minigame.defenseCap) {
                def = Minigame.defenseCap;
            }

            if (Math.random() < def) {
                await Popup.quick(`You narrowly avoid this one's attack.<br /><span class='gob'>${name}</span>`, "continue");
            } else {
                await Popup.quick(`${Minigame.hitAreas[Math.floor(Math.random() * Minigame.hitAreas.length)]}<br /><span class='gob'>${name}</span>`, "continue");
                this.lives -= 1;
            }
        } else {
            await Popup.quick(`This one misses.<br /><span class='gob'>${name}</span>`, "continue");
        }
    }
    
    /**
     * 
     * @param {"mystery"|"repair"|"health"} item 
     */
    async special(item) {
        switch (item) {
            case "health":
                await Popup.quick("You try to rest and heal...", "continue");
                if (Math.random() < 0.5) {
                    if (Math.random() < 0.3) {
                        this.durabilities.arm++;
                        await Popup.quick("And breathe some life into your arm.", "ok");
                    } else {
                        this.lives++;
                        await Popup.quick("And heal one heart.", "ok");
                    }
                } else {
                    await Popup.quick("But the goblins are too scary.", "ok");
                }
                break;
            case "mystery":
                await Popup.quick("You pray to the gods for their divine intervention...", "continue");
                if (Math.random() < 0.2) {
                    let rand = Math.random();
                    if (rand < 0.2) {
                        this.lives += 5;
                        await Popup.quick("And they heal you. You feel warmth coursing through your veins.", "ok");
                    } else if (rand < 0.4) {
                        this.actionsPerRound++;
                        await Popup.quick("And they give you haste.", "ok");
                    } else if (rand < 0.8 && this.goblins.length != 0) {
                        let gobIdx = Math.floor(Math.random() * this.goblins.length);
                        await Popup.quick(`And they smite a goblin for you.<br /><span class='gob'>${this.goblins[gobIdx]}</span>`, "ok");
                        this.goblins.splice(gobIdx, 1);
                    } else if ((this.defenseBase != Minigame.defenseCap) && rand < 0.9) {
                        this.defenseBase += 0.1;
                        await Popup.quick("And they give you more resistance.", "ok");
                    } else {
                        await Popup.quick("However, they are tired of you and decrease your fame.", "ok");
                        this.score -= Math.random() * 10;
                        if (this.score < 0) {
                            this.score = 0;
                        }
                    }
                } else {
                    await Popup.quick("But they ignore your pleas for help.", "ok");
                }
                break;
            case "repair":
                await Popup.quick("You try to repair some of your tools...", "continue");
                if (Math.random() < 0.5) {
                    switch (Math.floor(Math.random() * 3)) {
                        case 0:
                            this.durabilities.shield = 5;
                            await Popup.quick("And repair your shield.", "ok");
                            break;
                        case 1:
                            this.durabilities.sword = 5;
                            await Popup.quick("And repair your sword.", "ok");
                            break;
                        case 2:
                            this.durabilities.teeth = 5;
                            await Popup.quick("And sharpen your teeth.", "ok");
                            break;
                    }
                } else {
                    await Popup.quick("But you can't.", "ok");
                }
                break;
        }
    }

    /**
     * 
     * @param {"arm"|"shield"|"quatre-vignt-dix-neuf"} defense 
     */
    async defend(defense) {
        let likelihood = 0.5;
        if (defense == "arm") {
            likelihood == 0.7;
        } else if (defense == "shield") {
            likelihood == 0.9;
        }

        if (defense == "arm") {
            if (this.durabilities.arm == 0) {
                await Popup.quick("Your arm is mangled.", "ok");
                return false;
            }
            this.durabilities.arm--;
        } else if (defense == "shield") {
            if (this.durabilities.shield == 0) {
                await Popup.quick("Your shield is broken.", "ok");
                return false;
            }
            this.durabilities.shield--;
        }
        
        switch (defense) {
            case "arm":
                await Popup.quick("You hold your arm out...", "continue");
                break;
            case "shield":
                await Popup.quick("You hold up your shield...", "continue");
                break;
            case "quatre-vignt-dix-neuf":
                await Popup.quick("You attempt to confuse yourself, and therefore confuse the enemy, with the French word for 99...", "continue");
                break;
        }

        if (Math.random() < likelihood || this.goblins.length == 0) {
            switch (defense) {
                case "arm":
                    await Popup.quick("And hold it unwaveringly before your eyes.", "continue");
                    this.defenseModifier += 0.3;
                    this.score += 2 * Math.random();
                    break;
                case "shield":
                    await Popup.quick("And hold up your shield.", "continue");
                    this.defenseModifier += 0.4;
                    this.score += 3 * Math.random();
                    break;
                case "quatre-vignt-dix-neuf":
                    await Popup.quick("And it appears to work, because 99 equals 4 * 20 + 10 + 9.", "continue");
                    this.defenseModifier += 0.2;
                    this.score += 5 * Math.random();
                    break;
            }
        } else {
            switch (defense) {
                case "arm":
                    await Popup.quick("But hesitate because you like your arm and don't want to use it as a meatshield.", "continue");
                    this.durabilities.arm++;
                    break;
                case "shield":
                    await Popup.quick("But a goblin eats part of it.", "continue");
                    break;
                case "quatre-vignt-dix-neuf":
                    await Popup.quick("But the goblins seem unfazed. You are now confused.", "continue");
                    this.defenseModifier -= 0.1;
                    break;
            }
        }

        return true;
        
    }

    /**
     * 
     * @param {"sword"|"hand"|"teeth"} weapon 
     */
    async attack(weapon) {
        let likelihood = 0.5;
        if (weapon == "sword") {
            likelihood = 0.9;
        } else if (weapon == "teeth") {
            likelihood = 0.7;
        }

        if (weapon == "sword") {
            if (this.durabilities.sword == 0) {
                await Popup.quick("Your sword is broken.", "ok");
                return false;
            }
            this.durabilities.sword--;
        } else if (weapon == "teeth") {
            if (this.durabilities.teeth == 0) {
                await Popup.quick("Your teeth hurt.", "ok");
                return false;
            }
            this.durabilities.teeth--;
        }

        let gobIdx = Math.floor(Math.random() * this.goblins.length);

        console.log(likelihood)
        
        if (Math.random() < likelihood) {
            switch (weapon) {
                case "sword":
                    await Popup.quick(`You swing your sword...<br /><span class='gob'>${this.goblins[gobIdx]}</span>`, "continue");
                    break;
                case "teeth":
                    await Popup.quick(`You prepare to take a big bite...<br /><span class='gob'>${this.goblins[gobIdx]}</span>`, "continue");
                    break;
                case "hand":
                    await Popup.quick(`You swing a punch...<br /><span class='gob'>${this.goblins[gobIdx]}</span>`, "continue");
                    break;
            }
            let gob = Minigame.getGoblin(this.goblins[gobIdx]);

            if (Math.random() < gob.defense) {
                switch (weapon) {
                    case "sword":
                        await Popup.quick(`But they expertly doge out of the way.<br /><span class='gob'>${this.goblins[gobIdx]}</span>`, "ok");
                        break;
                    case "teeth":
                        await Popup.quick(`But they don't want to become your midnight snack.<br /><span class='gob'>${this.goblins[gobIdx]}</span>`, "ok");
                        break;
                    case "hand":
                        await Popup.quick(`But they grab your hand and obnoxiously yell "stick shift!" While moving it around.<br /><span class='gob'>${this.goblins[gobIdx]}</span>`, "ok");
                        break;
                }
            } else {
                this.score += gob.score * Math.random();
                switch (weapon) {
                    case "sword":
                        await Popup.quick(`And you lop off their head!<br /><span class='gob'>${this.goblins[gobIdx]}</span>`, "ok");
                        break;
                    case "teeth":
                        await Popup.quick(`And you eat them whole!<br /><span class='gob'>${this.goblins[gobIdx]}</span>`, "ok");
                        break;
                    case "hand":
                        await Popup.quick(`And you bonk them in the noggin!<br /><span class='gob'>${this.goblins[gobIdx]}</span>`, "ok");
                        break;
                }
                this.goblins.splice(gobIdx, 1);
            }
        } else {
            switch (weapon) {
                case "sword":
                    await Popup.quick(`You sprain your wrist.<br /><span class='gob'>${this.goblins[gobIdx]}</span>`);
                    break;
                case "teeth":
                    await Popup.quick(`You bite your tongue.<br /><span class='gob'>${this.goblins[gobIdx]}</span>`);
                    break;
                case "hand":
                    await Popup.quick(`Your punch is too weak.<br /><span class='gob'>${this.goblins[gobIdx]}</span>`);
                    break;
            }
        }
        return true;
    }

    addRandomGoblin() {
        let goblin = Minigame.all_goblins[Math.floor(Math.random() * Minigame.all_goblins.length)];

        this.goblins.push(goblin.name);
    }
    /**
     * gets a specific goblin by name.
     * @param {string} name 
     */
    static getGoblin(name) {
        for (const gob of Minigame.all_goblins) {
            if (gob.name == name) {
                return gob;
            }
        }
        return null;
    }
}