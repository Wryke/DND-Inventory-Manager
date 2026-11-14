import { useEffect, useState } from 'react'
import './App.css'

import HomePage from './pages/HomePage'
import AccountPage from './pages/AccountPage'
import CharactersPage from './pages/CharactersPage'
import InventoryPage from './pages/InventoryPage'
import EquipmentPage from './pages/EquipmentPage'
import LoginPage from './pages/LoginPage'

import Sidebar from './components/Sidebar'
import CharacterCard from './components/characters/CharacterCard'

import { 
    convertToGold 
} from './utils/currency'

import { 
    getCharacters, 
    createCharacter,
    updateCharacter, 
    deleteCharacter 
} from './api/characters'

import { 
    getCharacterInventory,
    addInventoryEntry,
    updateInventoryEntry,
    deleteInventoryEntry 
} from './api/inventory'

import { 
    getCharacterEquipment,
    getEquipmentSlots
} from "./api/equipment"

import {
    login,
    getCurrentUser,
    logout
} from "./api/auth"

import { 
    register,
    updateUser,
    deleteUser
} from "./api/users"

function App() {
    
    // --- State ---
    const [currentUser, setCurrentUser] = useState(null)
    const [authLoading, setAuthLoading] = useState(true)

    const [characters, setCharacters] = useState([])
    const [selectedCharacter, setSelectedCharacter] = useState(null)

    const [inventory, setInventory] = useState([])
    const [equipment, setEquipment] = useState([])
    
    const [equipmentSlots, setEquipmentSlots] = useState([])

    const [currentPage, setCurrentPage] = useState("home")

    // --- Derived Data ---
    const currentWeight = inventory.reduce((total, item) => {
        return total + (item.weight * item.quantity)
    }, 0)

    const inventoryValue = inventory.reduce((total, item) => {
        const unitGoldValue = convertToGold(item.cost_quantity, item.currency_code)

        return total + (unitGoldValue * item.quantity)
    }, 0)

    // -- Use Effects --
    useEffect(() => {        
        async function loadEquipmentSlots() {
            try {
                const data = await getEquipmentSlots()
                setEquipmentSlots(data)
            }
            catch (error) {
                console.error(error)
            }
        }

        async function checkAuth() {
            try{
                const user = await getCurrentUser()
                setCurrentUser(user)
            }
            catch {
                setCurrentUser(null)
            }
            finally {
                setAuthLoading(false)
            }
        }

        loadEquipmentSlots()
        checkAuth()
    }, [])

    useEffect(() => {
        async function loadCharacters() {
            try {
                const data = await getCharacters()
                setCharacters(data)
            }
            catch (error) {
                console.error(error)
            }
        }

        if (currentUser) {
            loadCharacters()
        }

    }, [currentUser])

    useEffect(() => {
        if (selectedCharacter === null) {
            return
        }

        async function loadInventory(){
            try {
                const data = await getCharacterInventory(selectedCharacter.name)

                setInventory(data)
            }
            catch (error) {
                console.error(error)
            }
        }

        async function loadEquipment(){
            try {
                const data = await getCharacterEquipment(selectedCharacter.name)

                setEquipment(data)
            }
            catch (error) {
                console.error(error)
            }
        }

        loadInventory()
        loadEquipment()
    }, [selectedCharacter])

    // Inventory Functions
    async function addInventoryItem(itemIndex, quantity, parentInventoryId) {

        if (
            typeof itemIndex !== "string" ||
            itemIndex === "" ||
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            return "Invalid Inventory Request"
        }

        const newEntry = {
            item_index: itemIndex,
            parent_inventory_id: parentInventoryId,
            quantity: quantity
        }

        try {
            const data = await addInventoryEntry(selectedCharacter.name, newEntry)

            setInventory((currentInventory) => {
                return [...currentInventory, data]
            })

            return null
        }
        catch (error) {
            console.error(error)
            return "Unable to add item. Please try again."
        }
    }

    async function updateInventoryItem(inventoryId, quantity, parentInventoryId) {
        const updatedEntry = {
            quantity: quantity,
            parent_inventory_id: parentInventoryId
        }

        try {
            const data = await updateInventoryEntry(selectedCharacter.name, inventoryId, updatedEntry)

            setInventory((currentInventory) => {
                return currentInventory.map((item) => {
                    if (item.inventory_id === inventoryId) {
                        return data
                    }

                    return item
                })
            })

            return null
        }
        catch (error) {
            console.error(error)
            return "Unable to update item. Please try again."
        }
    }

    async function removeInventoryItem(inventoryId) {
        try {
            const data = await deleteInventoryEntry(selectedCharacter.name, inventoryId)

            setInventory(data.inventory)

            return null
        }
        catch (error) {
            console.error(error)
            return "Unable to remove item. Please try again."
        }
    }

    // Character Functions
    async function addCharacter(name, maxWeight) {

        const newCharacter = {
            name: name,
            max_weight: Number(maxWeight)
        }

        try {
            const data = await createCharacter(newCharacter)

            setCharacters((currentCharacters) => {
                return [
                    ...currentCharacters,
                    data
                ]
            })
        } catch(error) {
            console.error(error)
            return error.message
        }

        return null
    }

    async function removeCharacter(characterId) {
        const character = characters.find((character) => {
            return character.character_id === characterId
        })

        if (!character) {
            return "Character not found"
        }

        try {
            await deleteCharacter(character.name)

            setCharacters((currentCharacters) => {
                return currentCharacters.filter((character) => {
                    return character.character_id !== characterId
                })
            })

            if (selectedCharacter?.character_id === characterId) {
                handleSelectCharacter(null)
            }
        }
        catch (error) {
            console.error(error)
            return error.message
        }

        return null
    }

    // --- Event Handlers ---
    // Clear all character data when the user logs out or deletes their account
    function clearCharacterData() {
        setSelectedCharacter(null)
        setCharacters([])
        setInventory([])
        setEquipment([])
    }

    function handleSelectCharacter(character){
        // Re-selecting the current character would clear its data without reloading it
        if (character?.character_id === selectedCharacter?.character_id) {
            return
        }

        // Clear the previous character's data; the effect loads the new one
        setInventory([])
        setEquipment([])
        setSelectedCharacter(character)
    }

    function handleEquipmentAdded (newEquipmentEntry){
        setEquipment([
            ...equipment,
            newEquipmentEntry
        ])
    }

    function handleEquipmentRemoved(equipmentId) {
        setEquipment((equipment) => {
            return equipment.filter((equipmentEntry) => {
                return equipmentEntry.equipment_id !== equipmentId
            })
        })
    }

    async function handleLogin(email, password) {
        try {
            await login(email, password)
            const user = await getCurrentUser()
            setCurrentUser(user)
            return null
        } catch(error){
            return error.message
        }
    }

    async function handleLogout() {
        try {
            await logout()
            setCurrentPage("home")
            setCurrentUser(null)
            clearCharacterData()
            return null
        } catch (error) {
            return error.message
        }
    }

    async function handleRegister(username, email, password) {
        try {
            await register(username, email, password)
            await login(email, password)
            const user = await getCurrentUser()
            setCurrentUser(user)
            return null
        } catch(error){
            return error.message
        }
    }

    async function handleUpdateUser(updatedFields) {
        try {
            await updateUser(updatedFields)

            const user = await getCurrentUser()
            setCurrentUser(user)

            return null
        } catch(error){
            return error.message
        }
    }

    async function handleDeleteUser(currentPassword) {
        try {
            await deleteUser(currentPassword)

            setCurrentUser(null)
            clearCharacterData()
            setCurrentPage("home")

            return null
        }
        catch (error) {
            return error.message
        }
    }

    async function handleUpdateCharacter(characterId, updatedFields) {
        const character = characters.find((character) => {
            return character.character_id === characterId
        })

        if (!character) {
            return "Character not found"
        }

        try {
            const updatedCharacter = await updateCharacter(
                character.name,
                updatedFields
            )

            setCharacters((currentCharacters) => {
                return currentCharacters.map((character) => {
                    if (character.character_id === characterId) {
                        return updatedCharacter
                    }

                    return character
                })
            })

            setSelectedCharacter((currentSelected) => {
                if (currentSelected?.character_id === characterId) {
                    return updatedCharacter
                }

                return currentSelected
            })

            return null
        } catch (error) {
            console.error(error)
            return error.message
        }
    }

    // --- Render ---
    const characterElements = characters.map((character) => {
        return (
            <CharacterCard
                key={character.character_id}
                character={character}
                selectedCharacter={selectedCharacter}
                selectCharacter={handleSelectCharacter}
                updateCharacter={handleUpdateCharacter}
                removeCharacter={removeCharacter}
            />
        )
    })

    if (authLoading) {
        return <p>Loading...</p>
    }

    if (!currentUser) {
        return <LoginPage 
            handleLogin={handleLogin}
            handleRegister={handleRegister}
        />
    }

    return (
        <>
            <div className="app-layout">

                <Sidebar 
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    selectedCharacter={selectedCharacter}
                    handleLogout={handleLogout}
                />

                <main className="main-content">

                    {currentPage === "home" && (
                        <HomePage />
                    )}

                    {currentPage === "account" && (
                        <AccountPage
                            currentUser={currentUser}
                            handleUpdateUser={handleUpdateUser}
                            handleDeleteUser={handleDeleteUser}
                        />
                    )}

                    {currentPage === "characters" && (
                        <CharactersPage
                            selectedCharacter={selectedCharacter}
                            addCharacter={addCharacter}
                            characterElements={characterElements}
                        />
                    )}

                    {currentPage === "inventory" && (
                        <InventoryPage
                            selectedCharacter={selectedCharacter}
                            currentWeight={currentWeight}
                            inventoryValue={inventoryValue}
                            addInventoryItem={addInventoryItem}
                            updateInventoryItem={updateInventoryItem}
                            removeInventoryItem={removeInventoryItem}
                            inventory={inventory}
                        />
                    )}

                    {currentPage === "equipment" && (
                        <EquipmentPage
                            selectedCharacter={selectedCharacter}
                            currentWeight={currentWeight}
                            inventoryValue={inventoryValue}
                            equipmentSlots={equipmentSlots}
                            equipment={equipment}
                            inventory={inventory}
                            onEquipmentAdded={handleEquipmentAdded}
                            onEquipmentRemoved={handleEquipmentRemoved}
                        />
                    )}
                </main>
            </div>
        </>
    )
}

export default App
