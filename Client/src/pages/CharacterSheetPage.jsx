import { useEffect, useState } from "react"

import { getCharacterSheet } from "../api/characterTraits"
import {
    ABILITY_SCORES,
    getAbilityModifier,
    formatModifier
} from "../utils/abilityScores"
import ClassesSection from "../components/characterSheet/ClassesSection"
import SkillsSection from "../components/characterSheet/SkillsSection"
import ProficienciesSection from "../components/characterSheet/ProficienciesSection"
import WeaponMasteriesSection from "../components/characterSheet/WeaponMasteriesSection"
import "../styles/CharacterSheet.css"

// A character with all of its traits. Core fields are edited from the
// character card; classes, skills, proficiencies, and masteries are edited here.
// App renders this with key={character_id}, so switching characters starts fresh.
function CharacterSheetPage({ selectedCharacter, lookups }) {

    // --- State ---
    const [sheet, setSheet] = useState(null)
    const [error, setError] = useState("")

    // --- Use Effects ---

    // Reload whenever the selected character changes (including after an edit)
    useEffect(() => {
        let ignore = false

        async function loadSheet() {
            try {
                const data = await getCharacterSheet(selectedCharacter.name)

                if (!ignore) {
                    setSheet(data)
                    setError("")
                }
            }
            catch (error) {
                if (!ignore) {
                    setError(error.message)
                }
            }
        }

        loadSheet()

        // Drop the response if a newer request has started
        return () => {
            ignore = true
        }
    }, [selectedCharacter])

    // --- Event Handlers ---

    // Each trait route returns the updated list, so swap it into the sheet
    function updateSheetList(listName, list) {
        setSheet((currentSheet) => {
            return {
                ...currentSheet,
                [listName]: list
            }
        })
    }

    // --- Render ---
    if (error) {
        return (
            <div className="character-sheet">
                <h1>{selectedCharacter.name}</h1>
                <p role="alert">Unable to load character sheet: {error}</p>
            </div>
        )
    }

    if (!sheet) {
        return (
            <div className="character-sheet">
                <h1>{selectedCharacter.name}</h1>
                <p>Loading character sheet...</p>
            </div>
        )
    }

    const totalLevel = sheet.classes.reduce((total, characterClass) => {
        return total + characterClass.class_level
    }, 0)

    // Routes use the current name, which changes if the character is renamed
    const characterName = selectedCharacter.name

    return (
        <div className="character-sheet">

            {/* --- Overview --- */}
            <header className="character-sheet-header">
                <h1>{sheet.name}</h1>

                <p>
                    {sheet.species_name ?? "No species"}
                    {" · "}
                    {sheet.background_name ?? "No background"}
                    {totalLevel > 0 && ` · Level ${totalLevel}`}
                </p>

                <p>Max Carry Weight: {sheet.max_weight} lbs</p>
            </header>

            {/* --- Ability Scores --- */}
            <section className="character-sheet-section">
                <h2>Ability Scores</h2>

                <div className="ability-score-cards">
                    {ABILITY_SCORES.map((ability) => {
                        const score = sheet[ability.field]

                        return (
                            <div className="ability-score-card" key={ability.field}>
                                <span className="ability-score-name" title={ability.label}>
                                    {ability.abbreviation}
                                </span>
                                <span className="ability-score-modifier">
                                    {formatModifier(getAbilityModifier(score))}
                                </span>
                                <span className="ability-score-value">{score}</span>
                            </div>
                        )
                    })}
                </div>
            </section>

            <ClassesSection
                characterName={characterName}
                classes={sheet.classes}
                classOptions={lookups.classes}
                onChange={(list) => updateSheetList("classes", list)}
            />

            <SkillsSection
                characterName={characterName}
                skills={sheet.skills}
                skillOptions={lookups.skills}
                onChange={(list) => updateSheetList("skills", list)}
            />

            <ProficienciesSection
                characterName={characterName}
                proficiencies={sheet.proficiencies}
                proficiencyOptions={lookups.proficiencies}
                onChange={(list) => updateSheetList("proficiencies", list)}
            />

            <WeaponMasteriesSection
                characterName={characterName}
                masteries={sheet.weapon_masteries}
                masteryOptions={lookups.weaponMasteries}
                onChange={(list) => updateSheetList("weapon_masteries", list)}
            />
        </div>
    )
}

export default CharacterSheetPage
