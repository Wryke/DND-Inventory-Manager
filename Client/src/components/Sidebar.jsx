function Sidebar(props) {
    return (
        <div className="sidebar">

            <div className="sidebar-navigation">
                <button
                    className={
                        props.currentPage === "home"
                            ? "sidebar-button active"
                            : "sidebar-button"
                    }
                    onClick={() => props.setCurrentPage("home")}
                >
                    Home
                </button>

                <button
                    className={
                        props.currentPage === "account"
                            ? "sidebar-button active"
                            : "sidebar-button"
                    }
                    onClick={() => props.setCurrentPage("account")}
                >
                    Account
                </button>

                <button
                    className={
                        props.currentPage === "characters"
                            ? "sidebar-button active"
                            : "sidebar-button"
                    }
                    onClick={() => props.setCurrentPage("characters")}
                >
                    Characters
                </button>

                {props.selectedCharacter && (
                    <>
                        <button
                            className={
                                props.currentPage === "sheet"
                                    ? "sidebar-button active"
                                    : "sidebar-button"
                            }
                            onClick={() => props.setCurrentPage("sheet")}
                        >
                            Character Sheet
                        </button>

                        <button
                            className={
                                props.currentPage === "inventory"
                                    ? "sidebar-button active"
                                    : "sidebar-button"
                            }
                            onClick={() => props.setCurrentPage("inventory")}
                        >
                            Inventory
                        </button>

                        <button
                            className={
                                props.currentPage === "equipment"
                                    ? "sidebar-button active"
                                    : "sidebar-button"
                            }
                            onClick={() => props.setCurrentPage("equipment")}
                        >
                            Equipment
                        </button>
                    </>
                )}
            </div>

            <button
                className="sidebar-button"
                onClick={() => props.handleLogout()}
            >
                Log Out
            </button>

        </div>
    )
}

export default Sidebar