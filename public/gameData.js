import { sendMsg } from "./script.js";

export class Skill {
    constructor(name, flairtext, action) {
        this.name = name;
        this.flairtext = flairtext;
        this.action = action;
    }
    static use(target = null) {
        action(target);

    }
}
export class Entity {
    constructor(name, level, stats, skills) {
        this.name = name;
        this.level = level;
        this.stats = stats;
        this.skills = skills; /*Skills should be an array of dictionaries of the use function, name, cooldown, and use chance. E.X:
        [{name: "Fireball", cooldown: 3, useChance: 0.3, use: function(target) {target.damage();}}]*/
    }
    damage(amount) {
        sendMsg(`${this.name} takes ${amount} damage!`);
    }
}
export class Player {
    constructor(name, playerClass, level, stats, skills) {
        this.name = name;
        this.playerClass = playerClass; /*Class name is assigned, then we fecth the class when needed based on the name.*/
        this.level = level; /*Int represting level.*/
        this.stats = stats; /*Array, in order Strength, Dexterity, Constitution, Wisdom, Intelligence, Charisma.*/
        this.skills = skills; /*Skills should be an array of dictionaries of the use function, name, cooldown, and use chance. E.X:
        [{name: "Fireball", cooldown: 3, useChance: 0.3, use: function(target) {target.damage();}}]*/
    }
}
export class Race {
    constructor(name, description, statBonuses, speed, size, languages) {
        this.name = name;
        this.description = description;
        this.statBonuses = statBonuses; /*Array, in order Strength, Dexterity, Constitution, Wisdom, Intelligence, Charisma.*/
        this.speed = speed; /*Int representing speed in feet. Standard is 30, should only vary by +- 1 increment of 5.*/
        this.size = size; /*Sizes are an int represented by 0-1, 0 for small, 1 for medium, 2 for large. They of course are displayed in text form in the game.*/
        this.languages = languages; /*Array of strings representing languages known. Strings. */
    }
}
export class Class {
    constructor(name, description, primaryAbility, savingThrows, armorProficiencies, weaponProficiencies, toolProficiencies, skillChoices, numSkillChoices, skills) {
        this.name = name;
        this.description = description;
        this.primaryAbility = primaryAbility;
        this.savingThrows = savingThrows; /* */
        this.armorProficiencies = armorProficiencies;
        this.weaponProficiencies = weaponProficiencies;
        this.toolProficiencies = toolProficiencies;
        this.skillChoices = skillChoices; /*Array of skill choices. Not going over the format again.*/
        this.numSkillChoices = numSkillChoices; /*Int representing how many skills can be chosen from the skillChoices array.*/
        this.skills = skills; /*Skills should be an array of dictionaries of the use function, name, and cooldown. E.X:
        [{name: "Fireball", cooldown: 3, use: function(target) {target.damage();}}]*/
    }

}
export class GameData {
    constructor() {
        this.Races = [];
        Races.push(new Race("Human",
            "Versatile and ambitious, humans are known for their adaptability and drive.",
            [1, 1, 1, 1, 1, 1],
            30,
            1,
            ["Common", "Dwarvish"]));
        this.Classes = [];
        Classes.push(new Class("Warrior",
            "A ferocious fighter who relies purely on skill and strength of arms.",
            "Strength",
            ["Strength", "Constitution"],
            ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
            ["Simple Weapons", "Martial Weapons"], [], [], [])); //Leaving those empty for now I'll fill them in in a sec.
    }

}