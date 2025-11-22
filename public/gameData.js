import { sendMsg } from "./script.js";

class Skill {
    constructor(name, flairtext, action) {
        this.name = name;
        this.flairtext = flairtext;
        this.action = action;
    }
    static use(target=null) {
        action(target);

    }
}

new Skill("Fireball", (target) => {
    target.damage(5);
})
class Class {
    constructor(name, primaryAbility, savingThrows, armorProficiencies, weaponProficiencies, toolProficiencies, skillChoices, numSkillChoices, skills) {
        this.name = name;
        this.primaryAbility = primaryAbility;
        this.savingThrows = savingThrows;
        this.armorProficiencies = armorProficiencies;
        this.weaponProficiencies = weaponProficiencies;
        this.toolProficiencies = toolProficiencies;
        this.skillChoices = skillChoices;
        this.numSkillChoices = numSkillChoices;
        this.skills = skills; 
    }
}