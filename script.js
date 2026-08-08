let tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
    try { tg.expand(); } catch(e){}
}

// SUPABASE SOZLAMALARI
const SUPABASE_URL = "https://sxfbkkdulcxirrndwomg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZmJra2R1bGN4aXJybmR3b21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMjI2MDAsImV4cCI6MjEwMTY5ODYwMH0.wpFsDk43hGPqdmHnQwVnCx2dkAbcNqQup5gzgVCopZU";

let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let user = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) 
    ? tg.initDataUnsafe.user 
    : { id: Math.floor(Math.random() * 899999) + 100000, first_name: "O'yinchi", username: "player" };

let balance = parseFloat(localStorage.getItem('kryze_balance')) || 0;
let totalEarned = parseFloat(localStorage.getItem('kryze_total_earned')) || balance;
let lastTime = parseInt(localStorage.getItem('kryze_last_time')) || 0;
let usedPromos = JSON.parse(localStorage.getItem('kryze_used_promos')) || [];

const shopConfig = [
    { id: 1, name: "Kichik Mayner", price: 10000, cps: 0.1, image: "https://cdn-icons-png.flaticon.com/512/6298/6298533.png" },
    { id: 2, name: "O'rta Mayner", price: 25000, cps: 0.3, image: "https://cdn-icons-png.flaticon.com/512/6298/6298583.png" },
    { id: 3, name: "Katta Mayner", price: 50000, cps: 0.7, image: "https://cdn-icons-png.flaticon.com/512/2091/2091665.png" },
    { id: 4, name: "Super Mayner", price: 100000, cps: 1.5, image: "https://cdn-icons-png.flaticon.com/512/3135/3135706.png" }
];

let minerCounts = JSON.parse(localStorage.getItem('kryze_miner_counts')) || { 1: 0, 2: 0, 3: 0, 4: 0 };

function switchTab(tabName, el) {
    let tabs = document.querySelectorAll('.tab-content');
    let navs = document.querySelectorAll('.nav-item');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    navs.forEach(nav => nav.classList.remove('active'));

    let targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) targetTab.classList.add('active');
    if (el) el.classList.add('active');

    if (tabName === 'shop') renderShop();
    if (tabName === 'my-miners') renderMyMiners();
    if (tabName === 'leaderboard') loadLeaderboard();
}

function getTotalCPS() {
    let total = 0;
    shopConfig.forEach(item => {
        let count = minerCounts[item.id] || 0;
        total += count * item.cps;
    });
    return parseFloat(total.toFixed(2));
}

function buyMiner(shopId) {
    let item = shopConfig.find(s => s.id === shopId);
    if (!item) return;

    if (balance >= item.price) {
        balance -= item.price;
        minerCounts[shopId] = (minerCounts[shopId] || 0) + 1;

        saveLocalState();
        updateDisplay();
        renderShop();
        alert(item.name + " sotib olindi! 🎉");
    } else {
        alert("Mablag' yetarli emas! Narxi: " + item.price.toLocaleString() + " koin");
    }
}

function renderShop() {
    let container = document.getElementById('shop_list');
    let html = '';
    shopConfig.forEach(item => {
        let owned = minerCounts[item.id] || 0;
        html += '<div class="card">' +
            '<img src="' + item.image + '" class="card-img" alt="">' +
            '<div class="card-info">' +
                '<div class="card-title">' + item.name + '</div>' +
                '<div class="card-sub">Tezlik: <strong style="color: #38bdf8;">+' + item.cps + ' koin/sek</strong></div>' +
                '<div class="card-sub">Narxi: <strong style="color: #f59e0b;">' + item.price.toLocaleString() + '</strong> koin</div>' +
                '<div class="card-sub" style="color: #4ade80; margin-top:2px;">Sizda bor: <strong>' + owned + ' dona</strong></div>' +
            '</div>' +
            '<button class="btn btn-buy" onclick="buyMiner(' + item.id + ')">Olish</button>' +
        '</div>';
    });
    container.innerHTML = html;
}

function renderMyMiners() {
    let container = document.getElementById('my_miners_list');
    let hasAnyMiner = false;
    let html = '';

    shopConfig.forEach(item => {
        let count = minerCounts[item.id] || 0;
        if (count > 0) {
            hasAnyMiner = true;
            let totalCps = parseFloat((count * item.cps).toFixed(2));
            html += '<div class="card">' +
                '<img src="' + item.image + '" class="card-img" alt="">' +
                '<div class="card-info">' +
                    '<div class="card-title">' + item.name + '</div>' +
                    '<div class="card-sub">Soni: <strong style="color: #f59e0b;">' + count + ' dona</strong></div>' +
                    '<div class="card-sub">Umumiy tezlik: <strong style="color: #38bdf8;">+' + totalCps + ' koin/sek</strong></div>' +
                '</div>' +
                '<span style="font-size: 11px; background: rgba(52, 211, 153, 0.2); border: 1px solid #34d399; padding: 4px 8px; border-radius: 6px; color: #34d399;">Faol</span>' +
            '</div>';
        }
    });

    if (!hasAnyMiner) {
        container.innerHTML = '<div class="balance-card" style="color: #64748b;">Sizda hali hech qanday mayner yo\'q. Do\'kondan sotib oling!</div>';
    } else {
        container.innerHTML = html;
    }
}

async function syncWithDatabase() {
    if (!supabaseClient || !user || !user.id) return;
    try {
        let userData = {
            telegram_id: user.id,
            first_name: user.first_name || 'O\'yinchi',
            username: user.username || '',
            balance: parseFloat(balance.toFixed(1)),
            total_earned: parseFloat(totalEarned.toFixed(1)),
            cps: getTotalCPS(),
            miner_counts: minerCounts,
            last_active: Date.now()
        };

        await supabaseClient.from('users').upsert(userData, { onConflict: 'telegram_id' });
    } catch (err) {
        console.log("Sync error:", err);
    }
}

async function loadLeaderboard() {
    let container = document.getElementById('leaderboard_list');
    container.innerHTML = "Yuklanmoqda...";

    if (!supabaseClient) {
        container.innerHTML = "Bazaga ulanib bo'lmadi.";
        return;
    }

    try {
        await syncWithDatabase();

        let { data, error } = await supabaseClient
            .from('users')
            .select('first_name, balance, total_earned, cps, last_active');

        if (error) {
            container.innerHTML = "Xatolik: " + error.message;
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = "Hali reytingda hech kim yo'q.";
            return;
        }

        let now = Date.now();

        let processedData = data.map(item => {
            let cps = item.cps || 0;
            let lastActive = item.last_active || 0;
            let currentTotal = item.total_earned !== undefined && item.total_earned !== null ? item.total_earned : item.balance;

            if (cps > 0 && lastActive > 0) {
                let secondsOffline = Math.floor((now - lastActive) / 1000);
                if (secondsOffline > 0) {
                    currentTotal += secondsOffline * cps;
                }
            }

            return {
                ...item,
                calculatedTotal: currentTotal
            };
        });

        processedData.sort((a, b) => b.calculatedTotal - a.calculatedTotal);

        let html = '';
        processedData.slice(0, 100).forEach((item, index) => {
            let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1);
            
            html += '<div class="leader-item">' +
                '<div style="display: flex; align-items: center; gap: 10px;">' +
                    '<span class="rank">' + medal + '</span>' +
                    '<div style="text-align: left;">' +
                        '<div style="font-weight: bold; color: #f8fafc;">' + (item.first_name || 'O\'yinchi') + '</div>' +
                        '<div style="font-size: 11px; color: #94a3b8;">' + (item.cps || 0) + ' koin/sek</div>' +
                    '</div>' +
                '</div>' +
                '<div style="text-align: right;">' +
                    '<div style="font-weight: bold; color: #38bdf8;">' + Math.floor(item.calculatedTotal || 0).toLocaleString() + ' 🪙</div>' +
                    '<div style="font-size: 10px; color: #64748b;">Jami ishlab topilgan</div>' +
                '</div>' +
            '</div>';
        });

        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = "Reytingni yuklab bo'lmadi.";
    }
}

function claimPromo() {
    let code = document.getElementById('promoInput').value.trim().toLowerCase();
    if (!code) {
        alert("Promokodni kiriting!");
        return;
    }

    if (code === 'pull') {
        if (usedPromos.includes('pull')) {
            alert("Siz bu promokoddan foydalanib bo'lgansiz!");
        } else {
            balance += 100000;
            totalEarned += 100000;
            usedPromos.push('pull');
            saveLocalState();
            updateDisplay();
            document.getElementById('promoInput').value = '';
            alert("Tabriklaymiz! 100,000 koin hisobingizga qo'shildi! 🎉");
        }
    } else {
        alert("Noto'g'ri promokod kiritildi!");
    }
}

function initOfflineEarnings() {
    let now = Date.now();
    let totalCps = getTotalCPS();
    if (totalCps > 0 && lastTime > 0) {
        let secondsPassed = Math.floor((now - lastTime) / 1000);
        if (secondsPassed >= 3) {
            let earned = parseFloat((secondsPassed * totalCps).toFixed(2));
            balance += earned;
            totalEarned += earned;
            updateDisplay();
            saveLocalState();
            setTimeout(() => {
                alert("Siz yo'qligingizda maynerlaringiz " + earned + " koin ishlab berdi! 🚀");
            }, 500);
        }
    }
    updateDisplay();
}

function saveLocalState() {
    localStorage.setItem('kryze_balance', balance);
    localStorage.setItem('kryze_total_earned', totalEarned);
    localStorage.setItem('kryze_miner_counts', JSON.stringify(minerCounts));
    localStorage.setItem('kryze_used_promos', JSON.stringify(usedPromos));
    localStorage.setItem('kryze_last_time', Date.now());
    
    syncWithDatabase();
}

function tapCoin() {
    balance += 1;
    totalEarned += 1;
    updateDisplay();
    saveLocalState();
}

function updateDisplay() {
    document.getElementById('balance').innerText = balance.toFixed(1);
    document.getElementById('cps').innerText = getTotalCPS();
}

setInterval(() => {
    let totalCps = getTotalCPS();
    if (totalCps > 0) {
        balance += totalCps;
        totalEarned += totalCps;
        updateDisplay();
        saveLocalState();
    }
}, 1000);

window.addEventListener('pagehide', saveLocalState);
window.addEventListener('beforeunload', saveLocalState);

updateDisplay();
initOfflineEarnings();
syncWithDatabase();
