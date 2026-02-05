const IMAGES = "images/";
const DATA = [
    { name: "Blazing Colt", type: "atk", val: 10, cost: 1, img: "blazing_colt.png", count: 5 },
    { name: "Blazing Pegasus", type: "atk", val: 15, cost: 2, img: "blazing_pegasus.png", count: 2 },
    { name: "Angelic Stallion", type: "atk", val: 20, cost: 3, img: "angelic_stallion.png", count: 1 },
    { name: "Dark Knight", type: "def", val: 10, cost: 1, img: "dark_knight.png", count: 5 },
    { name: "Damned Knight", type: "def", val: 15, cost: 2, img: "damned_knight.png", count: 2 },
    { name: "Devil King", type: "def", val: 20, cost: 3, img: "devil_king.png", count: 1 },
    { name: "Queen's Mirror", type: "skl", val: 0, cost: 0, img: "queens_mirror.png", count: 3, effect: "reflect" },
    { name: "Reflection Torture", type: "skl", val: 0, cost: 0, img: "reflection_torture.png", count: 2, effect: "supref" },
    { name: "Castle Breaker", type: "skl", val: 0, cost: 0, img: "castle_breaker.png", count: 3, effect: "breakd" },
    { name: "Stealthy Shinobi", type: "skl", val: 0, cost: 0, img: "stealthy_shinobi.png", count: 3, effect: "disarm" },
    { name: "Secret Agent 12", type: "skl", val: 0, cost: 0, img: "secret_agent_12.png", count: 3, effect: "miss" }
];

let deck = [];
let pHP = 60, aiHP = 60, turnCount = 1;
let pHand = [], aiHand = [], pField = [null, null, null], aiField = [null, null, null];
let actions = 0, discarded = false, selectedIdx = null, sacrifices = [];
let isProcessing = false;

function init() {
    deck = [];
    DATA.forEach(card => { for(let i=0; i<card.count; i++) deck.push({...card}); });
    deck.sort(() => Math.random() - 0.5);

    pHP = 60; aiHP = 60; turnCount = 1;
    pField = [null, null, null]; aiField = [null, null, null];
    pHand = []; aiHand = [];
    
    document.getElementById('game-log').innerHTML = '';
    addToLog("Duel started!", "sys");

    for(let i=0; i<3; i++) {
        let c1 = drawCard(); if(c1) pHand.push(c1);
        let c2 = drawCard(); if(c2) aiHand.push(c2);
    }
    render();
}

function drawCard() {
    if(deck.length === 0) return null;
    return deck.splice(0, 1)[0];
}

function addToLog(msg, type = "sys") {
    const ul = document.getElementById('game-log');
    if(!ul) return;
    const li = document.createElement('li');
    li.innerText = msg;
    li.className = `log-${type}`;
    ul.appendChild(li);
    const box = document.getElementById('log-box');
    if(box) box.scrollTop = box.scrollHeight;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function render() {
    document.getElementById('p-hp').innerText = pHP;
    document.getElementById('ai-hp').innerText = aiHP;
    document.getElementById('turn-count').innerText = turnCount;
    
    // Disable controls during AI turn
    const disabledState = (isProcessing);
    document.getElementById('btn-discard').disabled = (discarded || selectedIdx === null || disabledState);
    document.getElementById('btn-end').disabled = disabledState;
    document.getElementById('btn-concede').disabled = disabledState;

    const preview = document.getElementById('selection-preview');
    if (preview) preview.innerText = selectedIdx !== null ? pHand[selectedIdx].name.toUpperCase() : "";

    const handDiv = document.getElementById('hand');
    handDiv.innerHTML = '';
    pHand.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = `card ${selectedIdx === i ? 'selected' : ''}`;
        div.style.backgroundImage = `url('${IMAGES}${c.img}')`;
        if(!isProcessing) {
            div.onclick = () => { selectedIdx = i; sacrifices = []; render(); updateInstr(); };
        }
        handDiv.appendChild(div);
    });

    for(let i=0; i<3; i++) {
        renderField('p-'+i, pField[i], i);
        renderField('ai-'+i, aiField[i], i);
    }
}

function renderField(id, card, col) {
    const slot = document.getElementById(id);
    if (!slot) return;
    slot.innerHTML = '';
    slot.classList.remove('highlight');
    
    if(card) {
        const div = document.createElement('div');
        const isSacTarget = sacrifices.includes(col);
        div.className = `card ${card.charging ? 'charging' : ''} ${isSacTarget ? 'sac-target' : ''}`;
        div.style.backgroundImage = `url('${IMAGES}${card.img}')`;
        
        if(id.startsWith('p') && !isProcessing) {
            div.onclick = (e) => { 
                e.stopPropagation(); 
                if (isSacTarget && sacrifices.length === getCost()) {
                    clickSlot(col);
                } else {
                    toggleSac(col); 
                }
            };
        }
        slot.appendChild(div);
    } 

    if (selectedIdx !== null && id.startsWith('p') && !isProcessing) {
        const costNeeded = getCost();
        const cardToPlay = pHand[selectedIdx];
        const isSlotAvailable = (pField[col] === null || sacrifices.includes(col));
        const laneRulePassed = !(cardToPlay.type === 'atk' && aiField[col] && aiField[col].type === 'atk');

        if (sacrifices.length === costNeeded && isSlotAvailable && laneRulePassed) {
            slot.classList.add('highlight');
        }
    }
}

function getCost() {
    if (selectedIdx === null) return 0;
    let c = pHand[selectedIdx];
    if (c.type === 'skl') return 0;
    let onBoard = pField.filter(x => x !== null).length;
    if (onBoard === 0 && c.val === 10) return 0;
    return c.cost;
}

function toggleSac(col) {
    if (isProcessing || selectedIdx === null || pField[col] === null) return;
    const targetCost = getCost();
    if (sacrifices.includes(col)) sacrifices = sacrifices.filter(s => s !== col);
    else if (sacrifices.length < targetCost) sacrifices.push(col);
    render(); updateInstr();
}

function updateInstr() {
    const instr = document.getElementById('instruction');
    if (!instr) return;
    if (selectedIdx === null) { instr.innerText = "Select a card from your hand"; return; }
    const cost = getCost();
    instr.innerText = sacrifices.length < cost ? `Select ${cost - sacrifices.length} more Sacrifices` : "Select a slot to summon";
}

function clickSlot(col) {
    if (isProcessing || selectedIdx === null || actions >= 2) return;
    const cardToPlay = pHand[selectedIdx];
    const costNeeded = getCost();
    const isSlotValid = (pField[col] === null || sacrifices.includes(col));

    if (sacrifices.length === costNeeded && isSlotValid) {
        if (cardToPlay.type === 'atk' && aiField[col] && aiField[col].type === 'atk') {
            alert("Cannot play an Attack facing another Attack!");
            return;
        }

        sacrifices.forEach(s => pField[s] = null);
        let card = pHand.splice(selectedIdx, 1)[0];
        card.charging = (card.type === 'atk');
        pField[col] = card;
        
        addToLog(`Player summoned ${card.name}`, "p");

        selectedIdx = null; sacrifices = []; actions++;
        render(); updateInstr();
    }
}

function discardCard() {
    if (selectedIdx !== null && !discarded && !isProcessing) {
        let c = pHand.splice(selectedIdx, 1)[0];
        addToLog(`Player discarded ${c.name}`, "p");
        selectedIdx = null; discarded = true; render();
    }
}

function resolveCombat(offField, defField, isAiAtk) {
    let attackerName = isAiAtk ? "AI" : "Player";
    let defenderName = isAiAtk ? "Player" : "AI";

    offField.forEach((atk, i) => {
        if (!atk || atk.charging) return;

        // 1. OFFENSIVE SKILLS (Break D)
        if (atk.type === 'skl' && atk.effect === 'breakd') {
            let def = defField[i];
            if (def && def.type === 'def') {
                addToLog(`${attackerName} used Castle Breaker!`, isAiAtk ? "ai" : "p");
                addToLog(`${defenderName}'s ${def.name} was destroyed!`, "dmg");
                defField[i] = null; // Destroy Defense
                offField[i] = null; // Consume Skill
            }
        }
        
        // 2. STANDARD ATTACKS
        else if (atk.type === 'atk') {
            let dmg = atk.val;
            let def = defField[i];
            
            if (def) {
                if (def.type === 'skl') {
                    addToLog(`${defenderName}'s ${def.name} triggered!`, isAiAtk ? "p" : "ai");
                    if (def.effect === 'disarm') {
                        offField[i] = null; 
                        dmg = 0;
                        addToLog(`${attackerName}'s ${atk.name} was Disarmed!`, "sys");
                    } else if (def.effect === 'reflect') {
                        if (isAiAtk) aiHP -= dmg; else pHP -= dmg;
                        addToLog(`Reflected ${dmg} dmg to ${attackerName}`, "dmg");
                        dmg = 0;
                    } else if (def.effect === 'supref') {
                        let refDmg = dmg * 2;
                        if (isAiAtk) aiHP -= refDmg; else pHP -= refDmg;
                        addToLog(`Super Reflected ${refDmg} dmg to ${attackerName}!`, "dmg");
                        dmg = 0;
                    } else if (def.effect === 'miss') {
                        addToLog(`Attack Missed!`, "sys");
                        dmg = 0;
                    }
                    defField[i] = null; 
                } 
                else if (def.type === 'def') {
                    if (def.val > dmg) {
                        let thorns = def.val - dmg;
                        if (isAiAtk) aiHP -= thorns; else pHP -= thorns;
                        addToLog(`Thorn Damage! ${attackerName} took ${thorns}`, "dmg");
                    }
                    let blocked = Math.min(dmg, def.val);
                    addToLog(`${def.name} blocked ${blocked} dmg`, "sys");
                    dmg = Math.max(0, dmg - def.val);
                }
            }
            
            if (dmg > 0) {
                if (isAiAtk) pHP -= dmg; else aiHP -= dmg;
                addToLog(`${attackerName} dealt ${dmg} dmg with ${atk.name}`, "dmg");
            }
        }
    });
}

function checkGameOver() {
    if (aiHP <= 0 || pHP <= 0) {
        let msg = aiHP <= 0 ? "VICTORY! The Devil King has fallen." : "DEFEAT! Your soul belongs to the abyss.";
        addToLog("GAME OVER", "sys");
        setTimeout(() => { alert(msg); init(); }, 100);
        return true;
    }
    return false;
}

// --- NEW FUNCTION: CONCEDE GAME ---
function concedeGame() {
    if (confirm("Are you sure you want to surrender? This counts as a loss.")) {
        addToLog("Player surrendered.", "sys");
        alert("DEFEAT! You chose the easy way out.");
        init();
    }
}

async function endTurn() {
    isProcessing = true;
    render(); 

    addToLog("--- Enemy Reaction Phase ---", "sys");
    resolveCombat(aiField, pField, true);
    render();
    if(checkGameOver()) { isProcessing = false; return; }
    
    await sleep(800);

    addToLog("--- AI Action Phase ---", "sys");
    aiAction();
    render();
    
    await sleep(800);

    addToLog("--- Player Start Phase ---", "sys");
    pField.forEach(c => { if(c) c.charging = false; });
    aiField.forEach(c => { if(c) c.charging = false; });

    resolveCombat(pField, aiField, false);
    render();
    if(checkGameOver()) { isProcessing = false; return; }

    actions = 0; discarded = false; turnCount++;
    while(pHand.length < 3) {
        let card = drawCard();
        if(card) pHand.push(card); else break;
    }
    while(aiHand.length < 3) {
        let card = drawCard();
        if(card) aiHand.push(card); else break;
    }

    isProcessing = false;
    render();
    checkGameOver();
}

function aiAction() {
    let possibleMoves = [];

    // 1. CALCULATE EVERY POSSIBLE MOVE
    aiHand.forEach((card, hIdx) => {
        let fieldCount = aiField.filter(c => c !== null).length;
        let cost = card.cost;
        if (fieldCount === 0 && card.val === 10) cost = 0; 

        if (fieldCount >= cost) {
            let filledSlots = aiField.map((c, i) => c !== null ? i : -1).filter(i => i !== -1);
            filledSlots.sort((a, b) => getCardValue(aiField[a]) - getCardValue(aiField[b]));
            let sacIndices = filledSlots.slice(0, cost);
            
            for(let slot=0; slot<3; slot++) {
                if (aiField[slot] === null || sacIndices.includes(slot)) {
                    let move = {
                        card: card,
                        handIdx: hIdx,
                        slot: slot,
                        sacrifices: sacIndices,
                        score: 0
                    };
                    move.score = evaluateMove(move);
                    possibleMoves.push(move);
                }
            }
        }
    });

    possibleMoves = possibleMoves.filter(m => m.score > -50);
    possibleMoves.sort((a, b) => b.score - a.score);

    if (possibleMoves.length > 0) {
        let best = possibleMoves[0];
        let oppCard = pField[best.slot];
        if (best.card.type === 'atk' && oppCard && oppCard.type === 'atk') return; 

        best.sacrifices.forEach(idx => aiField[idx] = null);
        if(best.sacrifices.length > 0) addToLog(`AI sacrificed ${best.sacrifices.length} card(s)`, "ai");
        
        addToLog(`AI summoned ${best.card.name}`, "ai");
        aiField[best.slot] = {...best.card, charging: (best.card.type === 'atk')};
        aiHand.splice(best.handIdx, 1);
        return;
    } 
    
    let trashIdx = aiHand.findIndex(c => c.effect === 'miss' || c.effect === 'breakd' || c.val === 10);
    if (trashIdx === -1 && aiHand.length > 0) trashIdx = 0; 

    if (trashIdx !== -1 && aiHand.length >= 3) {
        let discarded = aiHand.splice(trashIdx, 1)[0];
        addToLog(`AI discarded ${discarded.name} (No moves)`, "ai");
        let newCard = drawCard();
        if(newCard) aiHand.push(newCard);
    } else {
        addToLog("AI passes turn", "ai");
    }
}

function getCardValue(card) {
    if (!card) return 0;
    if (card.type === 'atk') return card.val;
    if (card.type === 'def') return card.val;
    return 5; 
}

function evaluateMove(move) {
    let score = 0;
    let oppCard = pField[move.slot];
    let card = move.card;

    if (oppCard && oppCard.type === 'atk' && !oppCard.charging) {
        if (card.effect === 'supref') score += 1200; 
        else if (card.effect === 'reflect') score += 1100;
        else if (card.effect === 'disarm') score += 1150; 
        else if (card.effect === 'miss') score += 800; 
        else if (card.type === 'def') {
            score += 500; 
            if (card.val > oppCard.val) score += 200; 
        }
        else score -= 1000;
    }
    else if (card.type === 'atk') {
        if (!oppCard) score += 300; 
        else if (oppCard.type === 'def' && card.val > oppCard.val) score += 150; 
        else if (oppCard.type === 'def') score -= 50; 
    }
    else if (card.effect === 'breakd') {
        if (oppCard && oppCard.type === 'def') score += 400; 
        else score -= 100; 
    }

    let sacValue = 0;
    move.sacrifices.forEach(idx => { sacValue += getCardValue(aiField[idx]); });

    if (score < 400) { 
        score -= sacValue; 
    }

    return score;
}

init();
