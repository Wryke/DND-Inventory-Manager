// Ability score fields, keyed by the server's field names
const ABILITY_SCORES = [
    { field: "strength_score", label: "Strength", abbreviation: "STR" },
    { field: "dexterity_score", label: "Dexterity", abbreviation: "DEX" },
    { field: "constitution_score", label: "Constitution", abbreviation: "CON" },
    { field: "intelligence_score", label: "Intelligence", abbreviation: "INT" },
    { field: "wisdom_score", label: "Wisdom", abbreviation: "WIS" },
    { field: "charisma_score", label: "Charisma", abbreviation: "CHA" }
]

// D&D ability modifier: 10-11 is +0, each 2 points above or below changes it by 1
function getAbilityModifier(score) {
    return Math.floor((score - 10) / 2)
}

// Show modifiers the way a character sheet does: +2, +0, -1
function formatModifier(modifier) {
    return modifier >= 0 ? `+${modifier}` : String(modifier)
}

export {
    ABILITY_SCORES,
    getAbilityModifier,
    formatModifier
}
