// Game state
const game = {
    depth: 0,
    maxDepth: 0,
    fuel: 10,
    maxFuel: 10,
    money: 0,
    power: 1,
    efficiency: 1,
    oreChance: 0.1,
    drilling: false,
    drillInterval: null,
    fuelInterval: null,
    ores: {
        iron: { name: "Iron", value: 5, count: 0, color: "#b3b3b3" },
        copper: { name: "Copper", value: 10, count: 0, color: "#ff9900" },
        silver: { name: "Silver", value: 25, count: 0, color: "#c0c0c0" },
        gold: { name: "Gold", value: 50, count: 0, color: "#ffd700" },
        diamond: { name: "Diamond", value: 100, count: 0, color: "#b9f2ff" },
        unobtanium: { name: "Unobtanium", value: 500, count: 0, color: "#00ff00" }
    },
    upgrades: {
        fuel: { baseCost: 50, level: 0 },
        power: { baseCost: 100, level: 0 },
        efficiency: { baseCost: 200, level: 0 },
        scanner: { baseCost: 150, level: 0 }
    },
    discoveries: [
        { depth: 50, text: "You've found strange carvings in the rock... who made these?" },
        { depth: 100, text: "The drill sensors are picking up unusual energy readings..." },
        { depth: 150, text: "There's a hollow chamber here with artificial structures!" },
        { depth: 200, text: "You've uncovered ancient machinery of unknown origin!" },
        { depth: 250, text: "The core... it's not natural. It's some kind of construct!" }
    ],
    foundDiscoveries: []
};

// DOM elements
const elements = {
    depth: document.getElementById('depth'),
    fuel: document.getElementById('fuel'),
    money: document.getElementById('money'),
    power: document.getElementById('power'),
    drillBtn: document.getElementById('drill-btn'),
    refuelBtn: document.getElementById('refuel-btn'),
    drillDisplay: document.getElementById('drill-display'),
    drillBit: document.getElementById('drill-bit'),
    oresList: document.getElementById('ores-list'),
    sellAllBtn: document.getElementById('sell-all-btn'),
    dialogue: document.getElementById('dialogue'),
    buyButtons: document.querySelectorAll('.buy-btn')
};

// Initialize the game
function init() {
    updateUI();
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    elements.drillBtn.addEventListener('mousedown', startDrilling);
    elements.drillBtn.addEventListener('mouseup', stopDrilling);
    elements.drillBtn.addEventListener('mouseleave', stopDrilling);
    elements.refuelBtn.addEventListener('click', refuel);
    elements.sellAllBtn.addEventListener('click', sellAllOres);
    
    elements.buyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const upgradeType = button.dataset.upgrade;
            buyUpgrade(upgradeType);
        });
    });
}

// Start drilling
function startDrilling() {
    if (game.fuel <= 0) {
        showDialogue("Out of fuel! Refuel to continue drilling.");
        return;
    }
    
    if (!game.drilling) {
        game.drilling = true;
        elements.drillBtn.textContent = "DRILLING...";
        
        // Drill every second
        game.drillInterval = setInterval(() => {
            game.depth += game.power;
            if (game.depth > game.maxDepth) {
                game.maxDepth = game.depth;
                checkDiscoveries();
            }
            
            // Chance to find ore
            if (Math.random() < game.oreChance + (game.upgrades.scanner.level * 0.05)) {
                spawnOre();
            }
            
            updateUI();
        }, 1000);
        
        // Consume fuel continuously
        game.fuelInterval = setInterval(() => {
            game.fuel -= 10 * game.efficiency;
            if (game.fuel <= 0) {
                game.fuel = 0;
                stopDrilling();
                showDialogue("Fuel depleted!");
            }
            updateUI();
        }, 1000);
    }
}

// Stop drilling
function stopDrilling() {
    if (game.drilling) {
        game.drilling = false;
        clearInterval(game.drillInterval);
        clearInterval(game.fuelInterval);
        elements.drillBtn.textContent = "DRILL (10ml/s)";
        updateUI();
    }
}

// Spawn a random ore
function spawnOre() {
    const oreTypes = Object.keys(game.ores);
    let weights = [0.4, 0.3, 0.15, 0.1, 0.04, 0.01]; // Base weights
    weights = weights.map((w, i) => w + (game.upgrades.scanner.level * 0.02 * (i + 1)));
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let selectedOre = null;
    
    for (let i = 0; i < weights.length; i++) {
        if (random < weights[i]) {
            selectedOre = oreTypes[i];
            break;
        }
        random -= weights[i];
    }
    
    if (!selectedOre) selectedOre = oreTypes[0];
    
    // Create ore visual
    const ore = document.createElement('div');
    ore.className = 'ore';
    ore.style.backgroundColor = game.ores[selectedOre].color;
    ore.style.left = `${10 + Math.random() * 80}%`;
    ore.style.top = '0';
    
    elements.drillDisplay.appendChild(ore);
    
    // Animate ore falling
    let pos = 0;
    const fallInterval = setInterval(() => {
        pos += 5;
        ore.style.top = `${pos}px`;
        
        if (pos >= elements.drillDisplay.clientHeight - 40) {
            clearInterval(fallInterval);
            ore.remove();
            collectOre(selectedOre);
        }
    }, 50);
}

// Collect ore
function collectOre(oreType) {
    game.ores[oreType].count++;
    showDialogue(`Found ${game.ores[oreType].name}!`);
    updateInventory();
}

// Update inventory display
function updateInventory() {
    elements.oresList.innerHTML = '';
    for (const oreType in game.ores) {
        if (game.ores[oreType].count > 0) {
            const oreDiv = document.createElement('div');
            oreDiv.innerHTML = `${game.ores[oreType].name}: ${game.ores[oreType].count} ($${game.ores[oreType].value} each)`;
            elements.oresList.appendChild(oreDiv);
        }
    }
}

// Sell all ores
function sellAllOres() {
    let total = 0;
    for (const oreType in game.ores) {
        total += game.ores[oreType].count * game.ores[oreType].value;
        game.ores[oreType].count = 0;
    }
    
    if (total > 0) {
        game.money += total;
        showDialogue(`Sold all ores for $${total}!`);
        updateUI();
        updateInventory();
    } else {
        showDialogue("No ores to sell!");
    }
}

// Buy an upgrade
function buyUpgrade(type) {
    const upgrade = game.upgrades[type];
    const cost = upgrade.baseCost * (upgrade.level + 1);
    
    if (game.money >= cost) {
        game.money -= cost;
        upgrade.level++;
        
        // Apply upgrade
        switch (type) {
            case 'fuel':
                game.maxFuel += 10;
                game.fuel = game.maxFuel;
                showDialogue("Fuel tank upgraded!");
                break;
            case 'power':
                game.power++;
                showDialogue("Drill power increased!");
                break;
            case 'efficiency':
                game.efficiency *= 0.9; // 10% reduction
                showDialogue("Fuel efficiency improved!");
                break;
            case 'scanner':
                showDialogue("Ore scanner upgraded!");
                break;
        }
        
        // Update upgrade cost display
        document.querySelector(`button[data-upgrade="${type}"]`).previousElementSibling.textContent = 
            `Cost: $${upgrade.baseCost * (upgrade.level + 1)}`;
        
        updateUI();
    } else {
        showDialogue("Not enough money!");
    }
}

// Refuel drill
function refuel() {
    const cost = game.maxFuel - game.fuel;
    if (cost <= 0) {
        showDialogue("Fuel tank is already full!");
        return;
    }
    
    if (game.money >= cost) {
        game.money -= cost;
        game.fuel = game.maxFuel;
        showDialogue(`Refueled for $${cost}!`);
        updateUI();
    } else {
        showDialogue(`Need $${cost} to refuel!`);
    }
}

// Check for discoveries at new depths
function checkDiscoveries() {
    for (const discovery of game.discoveries) {
        if (game.maxDepth >= discovery.depth && !game.foundDiscoveries.includes(discovery.depth)) {
            game.foundDiscoveries.push(discovery.depth);
            showDialogue(discovery.text);
            break; // Only show one discovery at a time
        }
    }
}

// Show dialogue message
function showDialogue(message) {
    elements.dialogue.textContent = message;
}

// Update all UI elements
function updateUI() {
    elements.depth.textContent = game.depth;
    elements.fuel.textContent = Math.floor(game.fuel);
    elements.money.textContent = game.money;
    elements.power.textContent = game.power;
    
    // Enable/disable buttons based on game state
    elements.drillBtn.disabled = game.fuel <= 0;
    elements.refuelBtn.disabled = game.fuel >= game.maxFuel || game.money <= 0;
}

// Initialize the game when the page loads
window.onload = init;
