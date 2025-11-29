import { Popup } from "./popup.js"
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDocs, deleteDoc, where, getDoc } from 'firebase/firestore';
import { Class, Entity, Player, Skill, GameData } from "./gameData.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
var gameData = new GameData(); //Import data for the game
var messages = 0;
var nNotify = false;
var gameInitiated = false;
var notifiedGameInit = false;
const firebaseConfig = {

    apiKey: "AIzaSyDmpLh9AVbQo4XorhNUpwgkZYv8D8USIhI",

    authDomain: "keyroom-5ff86.firebaseapp.com",

    databaseURL: "https://keyroom-5ff86-default-rtdb.firebaseio.com",

    projectId: "keyroom-5ff86",

    storageBucket: "keyroom-5ff86.firebasestorage.app",

    messagingSenderId: "1018869008518",

    appId: "1:1018869008518:web:f905e1823b56efb5e36907",

    measurementId: "G-XSVCBN7EDG"

};

import { hasher } from "./hashutil.js";

// Can they send messages?
let cansendmessages = true;
const timeout = 1000;
async function sendMail(recipient, sender, message) {
    if (recipient === sender) {
        Popup.quick("<span class='material-symbols-outlined'>warning</span><br>Error: There is no need to summon yourself");
        return;
    }

    try {
        const snap = await getDocs(
            query(collection(db, "connectedUsers"), where("name", "==", recipient))
        );

        if (snap.empty) {
            Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: ${recipient} not found.`);
            return;
        }

        const userDoc = snap.docs[0];
        const userData = userDoc.data();

        if ((elapsedSecondsSince(userData.lastSummoned) < 360) && userData.lastSummoned) {
            console.log("elapsedSecs:" + elapsedSecondsSince(userData.lastSummoned) < 360);
            Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: ${recipient} was summoned less than 6 minutes ago.`);
            return;
        }


        if (!userData.email) {
            Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: ${recipient} has not set an email address.`);
            return;
        }

        const templateParams = {
            name: recipient,
            to_email: userData.email,
            from_name: sender,
            message: "You have been summoned! From " + sender + ": " + message
        };

        await emailjs.send("service_sam1rgy", "template_107udmm", templateParams);

        await setDoc(userDoc.ref, { lastSummoned: serverTimestamp() }, { merge: true });
        sendMsg(`${recipient} has been summoned by ${sender}.`, "System", "#4c5b8c");

        console.log("Email sent to " + userData.email);
    } catch (err) {
        console.error("Error sending mail:", err);
    }
}


function doDelay() {
    cansendmessages = false;
    setTimeout(() => {
        cansendmessages = true;
        document.getElementById("message-input").placeholder = "Type a message...";
    }, timeout);
}
(function () {
    emailjs.init("qTMLE2J7_unL-JsP0");
})();
let currentRoom = "&general"
document.getElementById("messages").setAttribute("data-theme", "normal");
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const messagesRef = collection(db, currentRoom);
const musicRef = collection(db, "music");
const messagesQuery = query(musicRef, orderBy("timestamp", "asc"));
const musicQuery = query(messagesRef, orderBy("timestamp", "asc"));
const tellRef = collection(db, "tellMsgs");
const tellQuery = query(tellRef, orderBy("timestamp", "asc"));
var UsersShown = false;
function parseTimestamp(input) {
    let date;

    if (input && typeof input.toDate === "function") {
        date = input.toDate();
    } else if (input && typeof input === "object") {
        const seconds = BigInt(input.seconds ?? input._seconds ?? 0);
        const nanos = BigInt(input.nanoseconds ?? input._nanoseconds ?? 0);
        const millis = seconds * 1000n + nanos / 1000000n;
        date = new Date(Number(millis));
    } else if (typeof input === "string") {
        const d = new Date(input);
        if (!isNaN(d)) date = d;
    }

    if (!date) return "??:?? ?/??/??";

    const opts = { timeZone: "America/Denver", hour: "2-digit", minute: "2-digit" };
    const time = new Intl.DateTimeFormat("en-US", opts).format(date);

    const m = date.toLocaleDateString("en-US", { timeZone: "America/Denver", month: "numeric" });
    const d = date.toLocaleDateString("en-US", { timeZone: "America/Denver", day: "numeric" });
    const yr = date.toLocaleDateString("en-US", { timeZone: "America/Denver", year: "2-digit" });

    return `${time} ${m}/${d}/${yr}`;
}
function elapsedSecondsSince(timestamp) {
    let pastDate;

    if (!timestamp) {
        return 0;
    }

    if (timestamp.toDate) {
        pastDate = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        pastDate = timestamp;
    } else if (typeof timestamp === "string") {
        pastDate = new Date(timestamp);
    } else {
        throw new Error("Invalid timestamp format");
    }

    if (isNaN(pastDate)) {
        throw new Error("Invalid date format");
    }

    const now = new Date();
    const elapsedMs = now - pastDate;
    return Math.floor(elapsedMs / 1000);
}

function getUserColor(username, hashe) {
    if (hashe) {
        if (username === "Key") return "000000";
        if (username === "Leif") return "63e3bf";
        if (username === "TellBot") return "6437c4";
    } else if (!hashe) {
        if (username === "Key") return "transparent; background-image: repeating-linear-gradient(45deg, #000000, #000010, #000000 var(--stripe-width)); animation: stripes var(--anim-time) linear infinite; background-position: 0 0; background-size: var(--stripe-calc) var(--stripe-calc)";
        if (username === "Leif") return "transparent; background-image: repeating-linear-gradient( 45deg, #63e3bf, #7383eb, #63e3bf var(--stripe-width) ); animation: stripes var(--anim-time) linear infinite; background-position: 0 0; background-size: var(--stripe-calc) var(--stripe-calc)";
        if (username === "TellBot") return "#6437c4";
    }
    var palette;
    if (!hashe) {
        palette = [
            "#e63946", "#f07c1e", "#2a9d8f", "#457b9d", "#b48c70",
            "#e9c46a", "#a29bfe", "#06d6a0", "#ef476f", "#118ab2"
        ];
    } else if (hashe) {
        palette = [
            "e63946", "f07c1e", "2a9d8f", "457b9d", "b48c70",
            "e9c46a", "a29bfe", "06d6a0", "ef476f", "118ab2"
        ];
    }

    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palette.length;
    return palette[index];
}

async function showLatestXkcd(number) {
    try {
        const response = await fetch("https://xkcd.vercel.app/?comic=latest");
        const data = await response.json();
        console.log(number);
        if (Number.isInteger(number) && number <= data.num) {
            console.log("numver")
            const response = await fetch(`https://xkcd.vercel.app/?comic=${number}`)
            const newdata = await response.json()
            const html = `
            <a href="https://xkcd.com/${newdata.num}/" target="_blank" rel="noopener noreferrer">
                <h2>${newdata.title} (#${newdata.num})</h2>
                <img src="${newdata.img}" alt="${newdata.alt}" style="max-width:100%">
            </a>`;
            return html;
        } else if (Number.isInteger(number)) {
            return "<p>That xkcd doesn\'t exists yet!</p>"
        } else {
            const html = `
            <a href="https://xkcd.com/${data.num}/" target="_blank" rel="noopener noreferrer">
                <h2>${data.title} (#${data.num})</h2>
                <img src="${data.img}" alt="${data.alt}" style="max-width:100%">
            </a>`;
            return html;
        }
    } catch (err) {
        console.error("Error fetching xkcd:", err);
        return null;
    }
}

let unsubscribeMessages = null;
function scrollToBottom(container) {
    const imgs = container.querySelectorAll("img");
    if (imgs.length === 0) {
        container.scrollTop = container.scrollHeight;
        return;
    }
    let loadedCount = 0;
    imgs.forEach(img => {
        if (img.complete) {
            loadedCount++;
        } else {
            img.addEventListener("load", () => {
                loadedCount++;
                if (loadedCount === imgs.length) {
                    container.scrollTop = container.scrollHeight;
                }
            });
        }
    });
    if (loadedCount === imgs.length) {
        container.scrollTop = container.scrollHeight;
    }
}

function listenToRoom(roomName) {
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    currentRoom = roomName;
    const messagesRef = collection(db, currentRoom);
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

    unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        document.head.querySelector('title').innerText = `Keyroom - ${currentRoom}`;
        if (!nNotify) {
            messages = snapshot.size;
            nNotify = true;
        } else if (snapshot.size > messages) {
            messages = snapshot.size;
            if (document.hidden) {
                console.log("New message detected in background");
                document.head.querySelector('title').innerText = `NEW MESSAGE — Keyroom — ${currentRoom}`;
            }
        }

        const messagesEl = document.getElementById("messages");
        messagesEl.innerHTML = "";
        snapshot.forEach((doc) => {
            const message = doc.data();
            const tstamp = parseTimestamp(message.timestamp);



            const msgDiv = document.createElement("div");
            msgDiv.className = "message";

            const avatar = document.createElement("img");
            avatar.className = "avatar";
            getDocs(query(collection(db, "connectedUsers"), where("name", "==", message.writer)))
                .then(snap => {
                    if (!snap.empty) {
                        const userData = snap.docs[0].data();
                        if (userData.profilePic) {
                            avatar.src = userData.profilePic;
                        } else {
                            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.writer)}&background=${getUserColor(message.writer)}&rounded=true`;
                        }
                    } else if (message.writer === "TellBot") {
                        avatar.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDlzJDyJ_J6vRQmfW4D-ve6PWtLk6XLdu_3w&s";
                    } else {
                        avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.writer)}&background=${getUserColor(message.writer, true)}&rounded=true`;
                    }
                    avatar.alt = message.writer;
                })
                .catch(err => {
                    console.error("Error fetching user data:", err);
                    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.writer)}&background=random&rounded=true`;
                    avatar.alt = message.writer;
                });
            avatar.src = `https://ui-avatars.com/api/?name=${message.writer}&background=random&rounded=true`;
            avatar.alt = message.writer;

            const content = document.createElement("div");
            content.className = "msgContent";

            if (message.raw) {
                content.innerHTML = `<span class="usernameBg">${message.writer}</span>${message.text}`;
            } else {
                content.style.display = "inline-block";
                content.innerHTML = `<span class="usernameBg">${message.writer}</span>
                                     <span class="msgText"><span style='font-size:10px;margin:0;padding:0;color:"black";'></span>: ${message.text}</span>
                                     <span class="iden">${message.iden}<b>${tstamp}</b></span>`;
            }

            msgDiv.appendChild(avatar);
            msgDiv.appendChild(content);
            messagesEl.appendChild(msgDiv);
        });
        scrollToBottom(messagesEl);
        console.log("2")
    });
}

const banned = ["<", "fuck"];
const bannedeq = ["'&lt;'", "a very bad word", "a bad word"];
function checkBannedWords(string, banlist) {
    if (!string) {
        string = "";
    }
    if (!banlist) {
        banlist = banned;
    }
    for (let i = 0; i < banlist.length; i++) {
        if (string.includes(banlist[i].toLowerCase())) {
            Popup.quick(`<span class="material-symbols-outlined">dangerous</span><br>Your message was blocked due to the inclusion of ${bannedeq[i]}.`, "ok")
            return false;
        }
    }
    return true;
}
const notifiedInbox = {};
function replaceWithBossBattle() {
    console.log("replaced with boss battle");
}
async function doBossDamage(damage) {
    const bossRef = collection(db, "bossBattle");
    const snapshot = getDocs(bossRef)
    var boss = null;
    snapshot.forEach(doca => {
        const data = doca.data();
        if (data.active) {
            boss = doc(db, "bossBattle", doca.id);
        }
    });
    if (!bossRef) {
        Popup.quick("<span class='material-symbols-outlined'>warning</span><br>Error: There is no active boss battle. Idk how the hell you initiated this function.");
        return;
    }

    await addDoc(boss, {
        health: FieldValue.increment(-damage)
    }, { merge: true });
}
async function initiateBossBattle() {
    sendMsg("You dare awaken me from my slumber? Prepare to face the wrath of the Phospholipid Bilayer!", "Phospholipid Bilayer", "#228B22", false, true);
    const bossRef = collection(db, "bossBattle");
    const snapshot = await getDocs(bossRef);
    await addDoc(bossRef, {
        health: 100,
        active: true
    }, { merge: true });
    await new Promise(resolve => setTimeout(resolve, 3000));
    replaceWithBossBattle();
}
async function scheckInbox(username) {
    const tellRef = collection(db, "tellMsgs");
    const snapshot = await getDocs(tellRef);
    let inboxCounter = 0;

    snapshot.forEach(doca => {
        const data = doca.data();
        if (data.reciepient === username || data.reciepient === "*") {
            inboxCounter++;
        }
    });
    console.log(notifiedInbox[username]);
    console.log(inboxCounter);
    if (inboxCounter > 0 &&
        (notifiedInbox[username] === undefined || notifiedInbox[username] !== inboxCounter)) {

        sendMsg(
            `You have ${inboxCounter} unread messages. Type !inbox to view them.`,
            "TellBot",
            "#6437c4",
            false,
            true
        );
        notifiedInbox[username] = inboxCounter;
    }
    /*if (!gameInitiated && !notifiedGameInit) {
        sendMsg(
            `Welcome! It seems you have not yet initiated yourself into the game! Please type !initiate into &game at the next possible convient moment.`,
            "System",
            "#4c5b8c",
            false,
            true
        );
        notifiedGameInit = true;
    }
        */
}


const banphrases = ["sucks", "is a loser", "hates Key", "hates everybody", "likes dying in holes", "likes holes", "likes *******", "hates themself", "hit their head on a door", "likes bagels. Bagels? I love bagels! Bagels are round. The sun is round. The sun is yellow. Bananas are yellow. Bananas have spots. Old people have spots. Old people live long lives. Life? That's my favorite cereal! I once bought a box of life for $10. $10!? That's crazy! I was crazy once. They locked me in a room, and fed me bagels.", "died due to [intentional game design]", "<img src='https://m.media-amazon.com/images/I/414LBqeOktL.jpg' width='300px'>", "loves Trump", "loves Biden", "loves American politics", "was pushed off a cliff by a donkey"];
function rndList(list) {
    if (!list) {
        list = banphrases;
    }
    let random = Math.floor(Math.random() * list.length);
    return list[random];
}
export async function sendMsg(message, writer, color, raw) {
    try {
        console.log(message);
        var checkInbox = false;
        if (raw !== true) raw = false;
        if (message.trim() === "") { return; }
        if (typeof message === 'string') {
            if ((currentRoom !== "/codeinject" && currentRoom !== `${username}`) && writer !== "xkcd" && !checkBannedWords(message)) {
                console.log(currentRoom);
                message = rndList();
            }
            if (message.split(" ")[0].trim() == "!image") {
                message = `<img src="${message.split(" ")[1]}" alt="Image" style="max-width:1200px; max-height:200px;">`;
            } else if (message.split(" ")[0].trim() === "!video") {
                const input = message.split(" ").slice(1).join(" ");
                if (!input) {
                    Popup.quick("<span class='material-symbols-outlined'>warning</span><br>Usage: !video [YouTube_Video_ID or URL]<br>Example: !video dQw4w9WgXcQ");
                    return;
                }
                if (currentRoom !== "&music") {
                    Popup.quick("<span class='material-symbols-outlined'>warning</span><br>You must be in the &music room to change videos!");
                    return;
                }
                const videoId = extractVideoId(input);
                if (!videoId) {
                    Popup.quick("<span class='material-symbols-outlined'>warning</span><br>Invalid YouTube video ID or URL!<br>Example: !video dQw4w9WgXcQ");
                    return;
                }
                changeVideo(videoId, writer);
                return;
            }
        }
        if (currentRoom == "&game") {
            processGameInput(message, writer);
        }
        if (message.split(" ")[0].trim() == "!link") {
            message = `<a href="${message.split(" ")[1]}" target="_blank" rel="noopener noreferrer">${message.split(" ")[1]}</a>`;
        } else if (message.split(" ")[0].trim() === "!edit") {
            const newText = message.replace("!edit ", "") + " (<i>edited</i>)";
            const snapshot = await getDocs(query(collection(db, currentRoom), orderBy("timestamp", "desc")));
            let found = false;

            for (const doca of snapshot.docs) {
                const data = doca.data();
                if (data.writer === writer) {
                    const docRef = doc(db, currentRoom, doca.id);
                    await setDoc(docRef, {
                        text: newText,
                        writer,
                        color,
                        timestamp: serverTimestamp(),
                        raw
                    }, { merge: true });
                    found = true;
                    break;
                }


                if (docFound) {
                    found = true;
                } else {
                    Popup.quick(`<span class="material-symbols-outlined">warning</span><br>Error: No message found with ID ${targetId}.`);
                    return;
                }
            }

            if (!found) {
                Popup.quick("<span class='material-symbols-outlined'>warning</span><br>Error: No message found to edit.");
            }
            return;
        } else if (message.split(" ")[0].trim() === "!editId") {
            const targetId = message.split(" ")[1].trim();
            const snapshot = await getDocs(query(collection(db, currentRoom), orderBy("timestamp", "desc")));
            let docFound = null;
            const newText = message.split(" ").slice(2).join(" ");

            for (const doca of snapshot.docs) {
                if (doca.data().iden === targetId && doca.data().writer === writer) {
                    docFound = doca;
                    break;
                }
            }

            if (docFound) {
                const docRef = doc(db, currentRoom, docFound.id);
                const timestamp = docFound.data().timestamp;
                await setDoc(docRef, {
                    text: newText,
                    writer,
                    color,
                    timestamp,
                    raw
                }, { merge: true });

                return;
            } else {
                Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: No message found with ID ${targetId}.`);
            }

            if (!found) {
                Popup.quick("<span class='material-symbols-outlined'>warning</span><br>Error: No message found to edit.");
            }
            return;
        } else if (message.split(" ")[0].trim() === "!editProfilePic") {
            const newPicUrl = message.split(" ")[1];
            const userDocRef = doc(db, "connectedUsers", writer);
            await setDoc(userDocRef, {
                profilePic: newPicUrl
            }, { merge: true });
            Popup.quick(`<span class='material-symbols-outlined'>account_circle</span><br>Profile picture updated!<br><img width='100px' src=${newPicUrl}/>`);
            return;

        } else if (message.split(" ")[0].trim() === "!setEmail") {
            const email = message.split(" ")[1];
            const userDocRef = doc(db, "connectedUsers", writer);
            await setDoc(userDocRef, {
                email: email
            }, { merge: true });
            Popup.quick(`<span class="material-symbols-outlined">mail</span><br>Email updated to ${email}`, "ok")
            return;

        } else if (message.split(" ")[0].trim() === "!delete") {
            try {
                const targetId = message.split(" ")[1].trim();
                const snapshot = await getDocs(query(collection(db, currentRoom), orderBy("timestamp", "desc")));
                let docFound = null;

                for (const doca of snapshot.docs) {
                    if (doca.data().iden === targetId && doca.data().writer === writer) {
                        docFound = doca;
                        break;
                    }
                }

                if (docFound) {
                    const docRef = doc(db, currentRoom, docFound.id);
                    await deleteDoc(docRef);
                    return;
                } else {
                    Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: No message found with ID ${targetId}.`);
                }
            } catch (err) {
                console.error("Error deleting message:", err);
            }

        } else if (message.trim() === "!inbox") {
            checkInbox = true;
        } else if (message.trim() === "!clearInbox") {
            const targetId = message.split(" ")[1].trim();
            const snapshot = await getDocs(query(collection(db, "tellMsgs"), orderBy("timestamp", "desc")));
            let docFound = null;

            for (const doca of snapshot.docs) {
                if (doca.data().writer === username) {
                    const docRef = doc(db, currentRoom, docFound.id);
                    await deleteDoc(docRef);
                }
            }
        } else if (message.trim() === "!logOut") {
            localStorage.removeItem('username');
            localStorage.removeItem('password');
            Popup.quick("Reloading...", "_");
            setTimeout(() => {
                window.location.reload(true);
            }, 100);
            await onload();
            return;
        } else if (message.split(" ")[0].trim() === "!showIden") {
            document.getElementById("messages").classList.add("showIden");
        } else if (message.split(" ")[0].trim() === "!hideIden") {
            document.getElementById("messages").classList.remove("showIden");
        } else if (message.split(" ")[0].trim() === "!flip") {
            document.getElementById("messages").style.transform = "scaleY(-1) rotate(1deg)";
        } else if (message.split(" ")[0].trim() === "!unflip") {
            document.getElementById("messages").style.transform = "scaleY(1) rotate(0deg)";
        } else if (message.split(" ")[0].trim() === "!rainbow") {
            color = "transparent; background-image: repeating-linear-gradient( 45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff, #ff0000 var(--stripe-width)); animation: stripes var(--anim-time) linear infinite; background-position: 0 0; background-size: var(--stripe-calc) var(--stripe-calc)";
            message = `<span>${message.split(" ").splice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!rotate" && (currentRoom == "/codeinject" || currentRoom == `&${username}`)) {
            message = `<span style="display:inline-block; transform:rotate(${message.split(" ")[1]}deg);">${message.split(" ").slice(2).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!unrainbow") {
            color = "white";
            message = `<span>${message.split(" ").splice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!shrink") {
            message = `<span style="font-size:0.5em;">${message.split(" ").splice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!grow") {
            message = `<span style="font-size:2em;">${message.split(" ").splice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!spin" && (currentRoom == "/codeinject" || currentRoom == `&${username}`)) {
            message = `<span style="display:inline-block; animation: spin 2s linear infinite;">${message.split(" ").splice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!code") {
            message = `<code>${message.split(" ").splice(1).join(" ")}</code>`;
        } else if (message.split(" ")[0].trim() === "!bold") {
            message = `<b>${message.split(" ").splice(1).join(" ")}</b>`;
            console.log("test");
        } else if (message.split(" ")[0].trim() === "!italic") {
            message = `<i>${message.split(" ").splice(1).join(" ")}</i>`;
        } else if (message.split(" ")[0].trim() === "!underline") {
            message = `<u>${message.split(" ").splice(1).join(" ")}</u>`;
        } else if (message.split(" ")[0].trim() === "!strikethrough") {
            message = `<s>${message.split(" ").splice(1).join(" ")}</s>`;
        } else if (message.split(" ")[0].trim() === "!reverse") {
            const text = message.split(" ").slice(1).join(" ");
            message = `<span>${text.split("").reverse().join("")}</span>`;
        } else if (message.split(" ")[0].trim() === "!upper") {
            message = `<span>${message.split(" ").slice(1).join(" ").toUpperCase()}</span>`;
        } else if (message.split(" ")[0].trim() === "!lower") {
            message = `<span>${message.split(" ").slice(1).join(" ").toLowerCase()}</span>`;
        } else if (message.split(" ")[0].trim() === "!wave") {
            const text = message.split(" ").slice(1).join(" ");
            message = `<span style="display:inline-block; animation: wave 2s infinite;">${text}</span>`;
        } else if (message.split(" ")[0].trim() === "!glitch") {
            const text = message.split(" ").slice(1).join(" ");
            message = `<span class="glitch" data-text="${text}">${text}</span>`;
        } else if (message.split(" ")[0].trim() === "!shrug") {
            message = `<span>${message.split(" ").slice(1).join(" ")} ¯\\_(ツ)_/¯</span>`;
        } else if (message.split(" ")[0].trim() === "!spoiler") {
            message = `<span style="background:black; color:black;" onmouseover="this.style.color='white'">${message.split(" ").slice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!blink") {
            message = `<span style="animation: blink 1s steps(2, start) infinite;">${message.split(" ").slice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!monospace") {
            message = `<span style="font-family:monospace;">${message.split(" ").slice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!shake") {
            message = `<span style="display:inline-block; animation: shake 0.5s infinite;">${message.split(" ").slice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!fade") {
            message = `<span style="animation: fadeIn 2s;">${message.split(" ").slice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!count") {
            const text = message.split(" ").slice(1).join(" ");
            message = `<span>${text} (${text.length} chars)</span>`;
        } else if (message.split(" ")[0].trim() === "!time") {
            message = `<span>${new Date().toLocaleTimeString()}</span>`;
        } else if (message.split(" ")[0].trim() === "!date") {
            message = `<span>${new Date().toLocaleDateString()}</span>`;
        } else if (message.split(" ")[0].trim() === "!rainbowtext") {
            const text = message.split(" ").slice(1).join(" ");
            message = `<span style="background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet); -webkit-background-clip: text; color: transparent;">${text}</span>`;
        } else if (message.split(" ")[0].trim() === "!binary") {
            let text = message.split(" ").slice(1).join(" ");
            text = text.split("").map(c => c.charCodeAt(0).toString(2)).join(" ");
            message = `<span>${text}</span>`;
        } else if (message.split(" ")[0].trim() === "!leet") {
            let text = message.split(" ").slice(1).join(" ");
            text = text.replace(/a/gi, "4").replace(/e/gi, "3").replace(/i/gi, "1").replace(/o/gi, "0").replace(/s/gi, "5").replace(/t/gi, "7");
            message = `<span>${text}</span>`;
        } else if (message.split(" ")[0].trim() === "!reversewords") {
            let text = message.split(" ").slice(1).reverse().join(" ");
            message = `<span>${text}</span>`;
        } else if (message.split(" ")[0].trim() === "!outline") {
            message = `<span style="color:black; -webkit-text-stroke:1px red;">${message.split(" ").slice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!glow") {
            message = `<span style="color:#fff; text-shadow:0 0 5px #0ff, 0 0 10px #0ff, 0 0 20px #0ff;">${message.split(" ").slice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!zebra") {
            let text = message.split(" ").slice(1).join(" ");
            message = `<span>${text.split("").map((c, i) => `<span style="background:${i % 2 ? "#000" : "#fff"};color:${i % 2 ? "#fff" : "#000"};">${c}</span>`).join("")}</span>`;
        } else if (message.split(" ")[0].trim() === "!wavey") {
            message = `<span style="text-decoration:underline wavy red;">${message.split(" ").slice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!stretch") {
            message = `<span style="letter-spacing:5px;">${message.split(" ").slice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!tight") {
            message = `<span style="letter-spacing:-1px;">${message.split(" ").slice(1).join(" ")}</span>`;
        } else if (message.split(" ")[0].trim() === "!hollow") {
            message = `<span style="color:transparent; -webkit-text-stroke:1px black;">${message.split(" ").slice(1).join(" ")}</span>`;
        }
        const messagesEl = document.getElementById("messages");
        const msgP = document.createElement("p");
        const iden = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log("iden:", iden);
        msgP.innerHTML = `<span class="usernameBg">${writer}</span>
                          <span class="msgText"> ${message} <b>(sending...)</b></span>
                          <span class="iden">${iden}</span>`;
        messagesEl.appendChild(msgP);
        scrollToBottom(messagesEl);
        console.log("3")


        await addDoc(collection(db, currentRoom), {
            text: message,
            writer: writer,
            color: color,
            timestamp: serverTimestamp(),
            raw: raw,
            iden: iden
        });
        if (checkInbox) {
            const snapshot = await getDocs(tellRef);

            snapshot.forEach(doca => {
                const data = doca.data();
                if (data.reciepient == username || data.reciepient === "*") {
                    var message = `${data.reciepient === "*" ? "Announcement from " : "From "}${data.writer}: ${data.text}`;
                    sendMsg(message, "TellBot", '#6437c4');
                    const docRef = doc(db, "tellMsgs", doca.id);
                    if (data.reciepient === username) {
                        deleteDoc(docRef);
                    } else if (data.timestamp > serverTimestamp() + 1 * 24 * 60 * 60 * 1000) {
                        deleteDoc(docRef);
                    }

                }
            });
        }
        if (message.split(" ")[0].trim() === "!summon") {
            if (message == "!summon Phospholipid Bilayer") {
                initiateBossBattle();
                return;
            }
            if (message.split(" ")[2] !== undefined) {
                const reciepient = message.split(" ")[1];
                const msg = message.split(" ").slice(2).join(" ");
                sendMail(reciepient, writer, msg);
            } else {
                const reciepient = message.split(" ")[1];
                sendMail(reciepient, writer, "");
            }
        }
        if (writer !== "TellBot") {
            scheckInbox(username);
        }


        resetRoomIfKey(message, writer, message.split(" ")[1]);

    } catch (e) {
        console.error(e);
    }
}

const allowedPingAll = ["Leif", "Key"];

async function tell(message, writer, reciepient) {
    try {
        if (reciepient == writer) {
            Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: There is no need to message yourself`);
            return;
        }

        if (reciepient == "*") {
            if (!allowedPingAll.includes(writer)) {
                Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: You are not allowed to send announcements to all users.`);
                return;
            }
        }

        await addDoc(collection(db, "tellMsgs"), {
            text: message,
            writer: writer,
            reciepient: reciepient,
            color: '#6437c4',
            timestamp: serverTimestamp(),
        });
        console.log("Data sent!")
        sendMsg(`Will tell ${reciepient}!`, "TellBot", '#6437c4');
    } catch (e) {
        console.error("Shit.", e);
    }
}
async function sendXkcd(what) {
    console.log(what)
    if (what == 'latest') {
        var msg = await showLatestXkcd();
        sendMsg(msg, "xkcd", '#516b94', true);
    } else if (Number.isInteger(Number(what))) {
        console.log(Number(what))
        var msg = await showLatestXkcd(parseInt(what));
        sendMsg(msg, "xkcd", '#516b94', true);
    }
}

async function validatePassword(username) {
    const res = await fetch("./passwords.json");
    const data = await res.json();
    console.log("validating password");
    if (data.hasOwnProperty(username)) {
        let storedPassword = localStorage.getItem("password");
        if (storedPassword && hasher(storedPassword) === data[username]) {
            return true;
        }
        let input = await Popup.quick("<span class='material-symbols-outlined'>vpn_key</span><br>Please enter your password.", "password");
        if (input && hasher(input) === data[username]) {
            localStorage.setItem("password", input);
            return true;
        }
        return false;
    } else {
        if (!(localStorage.getItem("seen-pwd-warning") === "true")) {
            await Popup.quick("<span class='material-symbols-outlined'>lock_open</span><br>You don't have a registered password. If you want one, please contact someone with Git access.", "ok");
            localStorage.setItem("seen-pwd-warning", true);
        }
        console.log("no password found, authenticating.");
        return true;
    }
}


// ANCHOR setUsername function
var username;
async function setUsername() {
    if (!localStorage.getItem("username")) {
        username = await Popup.quick("<span class='material-symbols-outlined'>person</span><br>Please enter your username.", "text");
        if (!checkBannedWords()) {
            await setUsername();
            return;
        }
        if (username == "xkcd") {
            username = "xkcd impersonator";
        }
        if (username == "" || username == " " || username == null || username == undefined) {
            await Popup.quick("<span class='material-symbols-outlined'>person_alert</span><br>Please enter a username!", "ok");
            await setUsername();
            return;
        }
        const ok = await validatePassword(username);
        if (!ok) {
            await Popup.quick("<span class='material-symbols-outlined'>vpn_key_alert</span><br>Password incorrect, please try again.", "ok");
            await setUsername();
            return;
        }

        localStorage.setItem("username", username);
        scrollToBottom(document.getElementById("messages"));
        console.log("4")
    } else {
        username = localStorage.getItem("username");
        if (username == "" || username == " " || username == null) {
            await Popup.quick("<span class='material-symbols-outlined'>warning</span><br>Something is really wrong. We'll try to fix it, but you should clear your cookies and try again.", "ok");
            localStorage.removeItem('username');
            await setUsername();
            return;
        } else {
            const ok = await validatePassword(username);
            if (!ok) {
                await Popup.quick("<span class='material-symbols-outlined'>vpn_key_alert</span><br>Password incorrect, please try again.", "ok");
                await setUsername();
                return;
            }
        }
    }
}
const userRef = collection(db, "connectedUsers");
const usersQuery = query(userRef, orderBy("lastActive", "asc"));
let userDocRef;
async function getUserLastActive(user) {
    const snapshot = await getDocs(userRef);
    var found = false;
    snapshot.forEach(doca => {
        const data = doca.data();
        if (data.name == user) {
            var message = `User ${user} was last seen on ${parseTimestamp(data.lastActive)}`;
            sendMsg(message, "LastActive", '#cf7e78');
            found = true;
        }

    });
    if (!found) {
        Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: user ${user} not found.`);
    }
}

function processKeydown(e) {
    if (e.keyCode == 13) {
        if (cansendmessages || username === "Key") {
            document.getElementById("message-input").placeholder = "Wow, what a big, beautiful box...";
            sendMsg(document.getElementById("message-input").value, username, getUserColor(username));
            var command = document.getElementById("message-input").value.split(" ")[0];
            var split = document.getElementById("message-input").value.split(" ");

            if (command == "!xkcd" && currentRoom == "&xkcd") {
                sendXkcd(split[1]);
            } else if (command == "!tell") {
                var messagestring = "";
                for (var i = 2; i < (split.length); i++) {
                    messagestring += ` ${split[i]}`
                    console.log(messagestring);
                }
                tell(messagestring, username, split[1])
            } else if (command == "!lastactive") {
                getUserLastActive(split[1]);
            }
            doDelay();
        } else {
            document.getElementById("message-input").placeholder = "wait a sec...";
        }
        document.getElementById("message-input").value = "";
    }
}
let currentVideoId = null;
let player;
let isSyncing = false;
let isLocalStateChange = false;
let lastPosition = 0;
let positionCheckInterval = null;
let playerReady = false;
let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
    deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('deviceId', deviceId);
}
function loadYouTubeAPI() {
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
}
window.onYouTubeIframeAPIReady = function () {
    console.log('YouTube API ready');
};

function loadYouTubeVideo(videoId, autoInit = true) {
    console.log("loading video:", videoId);
    currentVideoId = videoId;

    try {
        loadYouTubeAPI();
        const checkAPI = setInterval(() => {
            if (window.YT && window.YT.Player) {
                clearInterval(checkAPI);
                if (player && player.destroy) {
                    player.destroy();
                }

                player = new YT.Player('player', {
                    height: '315',
                    width: '560',
                    videoId: videoId,
                    playerVars: {
                        'autoplay': 0
                    },
                    events: {
                        'onReady': onPlayerReady,
                        'onStateChange': onPlayerStateChange
                    }
                });
                if (autoInit) {
                    manageMusic();
                }
            }
        }, 100);
    } catch (e) {
        console.error(e);
    }
}
async function changeVideo(videoId, changedBy) {
    try {
        const musicDocRef = doc(db, "music", "state");
        await setDoc(musicDocRef, {
            name: "state",
            videoId: videoId,
            position: 0,
            paused: true,
            updatedBy: changedBy,
            deviceId: deviceId,
            videoChangedAt: serverTimestamp(),
            timestamp: serverTimestamp()
        }, { merge: true });

        console.log(`Video changed to ${videoId} by ${changedBy}`);
        sendMsg(`Video changed to: https://youtube.com/watch?v=${videoId}`, "MusicBot", "#9b59b6");

    } catch (error) {
        console.error("Error changing video:", error);
        Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error changing video: ${error.message}`);
    }
}
async function manageMusic() {
    const musicDocRef = doc(db, "music", "state");
    onSnapshot(musicDocRef, async (docSnapshot) => {
        if (!docSnapshot.exists()) {
            console.log("No music state found");
            return;
        }

        const data = docSnapshot.data();
        console.log("Music state updated:", data);
        if (data.videoId && data.videoId !== currentVideoId) {
            console.log(`Video changed from ${currentVideoId} to ${data.videoId} by ${data.updatedBy}`);
            currentVideoId = data.videoId;
            playerReady = false;
            if (positionCheckInterval) {
                clearInterval(positionCheckInterval);
                positionCheckInterval = null;
            }
            loadYouTubeVideo(data.videoId, false);
            return;
        }
        if (data.deviceId === deviceId) {
            console.log("Ignoring own device update");
            return;
        }
        if (!playerReady) {
            console.log("Player not ready yet, waiting...");
            return;
        }
        if (data.position !== undefined && player && player.seekTo && !isSyncing) {
            const currentTime = getCurrentTime();
            const timeDiff = Math.abs(currentTime - data.position);

            if (timeDiff > 2) {
                console.log(`Syncing to ${data.position}s from ${data.updatedBy} (device: ${data.deviceId})`);
                isSyncing = true;
                lastPosition = data.position;
                seekTo(data.position);
                setTimeout(() => { isSyncing = false; }, 1000);
            }
        }
        if (data.paused !== undefined && player) {
            const currentState = player.getPlayerState();
            const isCurrentlyPlaying = currentState === YT.PlayerState.PLAYING;

            if (data.paused && isCurrentlyPlaying) {
                console.log(`${data.updatedBy} paused the video`);
                isLocalStateChange = true;
                pauseVideo();
                setTimeout(() => { isLocalStateChange = false; }, 500);
            } else if (!data.paused && !isCurrentlyPlaying) {
                console.log(`${data.updatedBy} played the video`);
                isLocalStateChange = true;
                isSyncing = true;
                seekTo(data.position);
                setTimeout(() => {
                    playVideo();
                    setTimeout(() => { isSyncing = false; }, 500);
                }, 100);
                setTimeout(() => { isLocalStateChange = false; }, 500);
            }
        }
    });
}
async function onPlayerReady(event) {
    console.log('Player ready');
    playerReady = true;
    const musicDocRef = doc(db, "music", "state");
    if (player && player.getVideoData) {
        const videoData = player.getVideoData();
        currentVideoId = videoData.video_id;
    }

    try {
        const docSnap = await getDoc(musicDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Initial sync to position:", data.position);

            if (data.position) {
                seekTo(data.position);
                lastPosition = data.position;
            }
            if (!data.paused) {
                setTimeout(() => {
                    playVideo();
                }, 500);
            }
        }
    } catch (error) {
        console.error("Error during initial sync:", error);
    }

    if (positionCheckInterval) {
        clearInterval(positionCheckInterval);
    }

    positionCheckInterval = setInterval(async () => {
        if (player && player.getCurrentTime && !isSyncing && !isLocalStateChange && playerReady) {
            const currentTime = player.getCurrentTime();
            const timeDiff = Math.abs(currentTime - lastPosition);

            if (timeDiff > 1.5) {
                console.log(`${username} manually seeked from ${lastPosition}s to ${currentTime}s`);

                await setDoc(musicDocRef, {
                    name: "state",
                    position: currentTime,
                    updatedBy: username,
                    deviceId: deviceId,
                    timestamp: serverTimestamp()
                }, { merge: true });

                lastPosition = currentTime;
            } else {
                lastPosition = currentTime;
            }
        }
    }, 300);
}
function extractVideoId(input) {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
        return input;
    }

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}
async function onPlayerStateChange(event) {
    if (!playerReady) return;

    const state = event.data;
    const musicDocRef = doc(db, "music", "state");

    if (isLocalStateChange) {
        console.log("Ignoring state change from remote sync");
        return;
    }

    const currentTime = getCurrentTime();

    if (state === YT.PlayerState.PLAYING) {
        console.log('Video is playing');
        lastPosition = currentTime;

        await setDoc(musicDocRef, {
            name: "state",
            paused: false,
            position: currentTime,
            updatedBy: username,
            deviceId: deviceId,
            timestamp: serverTimestamp()
        }, { merge: true });

    } else if (state === YT.PlayerState.PAUSED) {
        console.log('Video is paused');

        await setDoc(musicDocRef, {
            name: "state",
            paused: true,
            position: currentTime,
            updatedBy: username,
            deviceId: deviceId,
            timestamp: serverTimestamp()
        }, { merge: true });

    } else if (state === YT.PlayerState.ENDED) {
        console.log('Video ended');
        sendMsg(`Video ended`, "MusicBot", "#9b59b6");
    }
}

function pauseVideo() {
    if (player && player.pauseVideo) {
        player.pauseVideo();
    }
}

function playVideo() {
    if (player && player.playVideo) {
        player.playVideo();
    }
}

function seekTo(seconds) {
    if (player && player.seekTo) {
        player.seekTo(seconds, true);
    }
}

function getCurrentTime() {
    if (player && player.getCurrentTime) {
        return player.getCurrentTime();
    }
    return 0;
}

const messagesEl = document.getElementById("messages");

function clearRoomBorders() {
    document.getElementById("&random").classList.remove('roomActive');
    document.getElementById("&xkcd").classList.remove('roomActive');
    document.getElementById("&spam").classList.remove('roomActive');
    document.getElementById("&general").classList.remove('roomActive');
    document.getElementById("/codeinject").classList.remove('roomActive');
    document.getElementById("&boom").classList.remove('roomActive');
    document.getElementById("&game").classList.remove('roomActive');
    document.getElementById("&music").classList.remove('roomActive');
    document.getElementById("&").classList.remove('roomActive');
    document.getElementById("&random").classList.add('room');
    document.getElementById("&xkcd").classList.add('room');
    document.getElementById("&spam").classList.add('room');
    document.getElementById("&general").classList.add('room');
    document.getElementById("/codeinject").classList.add('room');
    document.getElementById("&boom").classList.add('room');
    document.getElementById("&game").classList.add('room');
    document.getElementById("&").classList.add('room');
    document.getElementById("&music").classList.add('room');
}
import { writeBatch } from "firebase/firestore";

async function resetRoomIfKey(message, writer, room) {
    try {
        const parts = message.trim().split(" ");
        const cmd = parts[0].toLowerCase();
        const targetRoom = room || parts[1] || currentRoom;

        if ((('&' + writer) === targetRoom || writer === "Key" || writer === "Leif") && cmd === "!reset") {
            console.log("Resetting room:", targetRoom);
            const snapshot = await getDocs(collection(db, targetRoom));
            const batch = writeBatch(db);

            snapshot.forEach((docItem) => {
                const docRef = doc(db, targetRoom, docItem.id);
                batch.delete(docRef);
            });

            await batch.commit();

            sendMsg(`All messages in room ${targetRoom} have been reset by ${username}.`, "System", "#4c5b8c");
        }
    } catch (error) {
        console.error("Error in resetRoomIfKey:", error);
        Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: failed to reset room: ${error.message}`);
    }
}
async function switchRoom(room, messageStyling) {
    nNotify = false;
    if (!messageStyling) {
        messageStyling = "normal";
    }
    if (room !== "music") {
        if (document.getElementById("player").tagName.toLowerCase() !== "div") {
            //            player.mute();
        }

    } else if (room === "music") {
        if (document.getElementById("player").tagName.toLowerCase() !== "div") {
            //            player.unMute();
        }
    }
    currentRoom = room
    document.body.setAttribute("data-format", messageStyling);
    listenToRoom(room)
    clearRoomBorders();
    if (room == `${"&"}${username}`) {
        document.getElementById("&").classList.add('roomActive');
    }
    document.getElementById(room).classList.add('roomActive');
    document.getElementById(room).classList.remove('room');
}
async function onload() {
    const bossRef = collection(db, "bossBattle");
    const snapshot = await getDocs(bossRef)
    var boss = null;
    snapshot.forEach(doca => {
        const data = doca.data();
        if (data.active) {
            replaceWithBossBattle();
        }
    });

    userDocRef = null;
    username = null;
    document.removeEventListener("keydown", (e) => { processKeydown(e) });

    await setUsername();
    if (username == "xkcd") {
        username = "xkcd impersonator";
    }
    userDocRef = doc(db, "connectedUsers", username)
    document.addEventListener("keydown", (e) => { processKeydown(e) });
    messagesEl.scrollTop = messagesEl.scrollHeight;
    await setDoc(userDocRef, {
        name: username,
        color: getUserColor(username),
        lastActive: serverTimestamp(),
        gameInitiated: gameInitiated
    }, { merge: true });
    setInterval(async () => {
        await setDoc(userDocRef, {
            name: username,
            color: getUserColor(username),
            lastActive: serverTimestamp()
        }, { merge: true });
    }, 15000);
    onSnapshot(usersQuery, (snapshot) => {
        document.getElementById("connectedUsers").innerHTML = "<p class='userP'><b>Connected Users</b></p>"
        snapshot.forEach((doc) => {
            const user = doc.data();
            if (elapsedSecondsSince(user.lastActive) <= 16) {
                const userP = document.createElement("p");
                userP.innerHTML = `<span style="color: "black";" class="usernameBg">${user.name}</span>`;
                document.getElementById("connectedUsers").appendChild(userP);
            }
            if (user.name == username && user.gameInitiated && !gameInitiated) {
                gameInitiated = true;
            }
        })
        const messagesEl = document.getElementById("messages");
        if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

    })
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
            document.head.querySelector('title').innerText = `Keyroom - ${currentRoom}`;
        }
    });

    document.getElementById("showUsers").addEventListener("click", () => {
        if (UsersShown) {
            document.getElementById("showUsers").innerHTML = "Show Users";
            document.getElementById("messages").style.display = "block";
            document.getElementById("connectedUsers").style.display = "none";
            UsersShown = false;
        } else if (!UsersShown) {
            document.getElementById("showUsers").innerHTML = "Hide Users";
            document.getElementById("messages").style.display = "none";
            document.getElementById("connectedUsers").style.display = "block";
            UsersShown = true;
        }
    })
    document.getElementById("showRooms").addEventListener("click", () => {
        if (UsersShown) {
            document.getElementById("showRooms").innerHTML = "Show Rooms";
            document.getElementById("messages").style.display = "block";
            document.getElementById("rooms").style.display = "none";
            UsersShown = false;
        } else if (!UsersShown) {
            document.getElementById("showRooms").innerHTML = "Hide Rooms";
            document.getElementById("messages").style.display = "none";
            document.getElementById("rooms").style.display = "block";
            UsersShown = true;
        }
    })
    document.getElementById("&random").addEventListener("click", () => {
        switchRoom("&random");
    })
    document.getElementById("&general").addEventListener("click", () => {
        switchRoom("&general");
    })
    document.getElementById("&xkcd").addEventListener("click", () => {
        switchRoom("&xkcd");
    })
    document.getElementById("&spam").addEventListener("click", () => {
        switchRoom("&spam");
    })
    document.getElementById("/codeinject").addEventListener("click", () => {
        switchRoom("/codeinject");
    })
    document.getElementById("&boom").addEventListener("click", () => {
        switchRoom("&boom");
    })
    document.getElementById("&game").addEventListener("click", () => {
        switchRoom("&game");
    })
    document.getElementById("&music").addEventListener("click", () => {
        switchRoom("&music", "music");
        loadYouTubeVideo('YsdaAQzdmpo');
        manageMusic();
        console.log("loading");
    })
    document.getElementById("&").addEventListener("click", () => {
        switchRoom(`&${username}`);
    })
    document.getElementById("&general").classList.add('roomActive');
    document.getElementById("&general").classList.remove('room');
    listenToRoom('&general');
}

function processGameInput(input) {
    if (input == "!initiate") {
        initiateGame();
    }
}
function checkIfPositive(num) {
    if (num > 0) {
        return "+" + num;
    } else {
        return num;
    }
}
async function initiateGame() {
    //This is going to set the initation but i don't wanna do it until its done
    /*gameInitiated = true;
    userDocRef = doc(db, "connectedUsers", username)
    setDoc(userDocRef, {
        name: username,
        color: getUserColor(username),
        lastActive: serverTimestamp(),
        gameInitiated: gameInitiated
    }, { merge: true });
    */
    var AvailableRaces = gameData.Races;
    var playerSelectedRace = null;
    var playerSelectedClass = null;
    var raceOptions = (function () { var races = gameData.Races; var returnStr = ""; for (var i = 0; i < races.length; i++) { if (i + 1 != races.length) { returnStr += `${races[i].name}, `; } else { returnStr += `and ${races[i].name}`; } } return returnStr; }())
    await Popup.quick(`Welcome to the Grand Game, ${username}. We're glad to see you!`, "ok");
    while (playerSelectedRace == null) {
        var race = await Popup.quick(`First off, you'll need to choose the race (species), or your character. Your options are ${raceOptions}. To view more information about a race, type it's name into the below box.`, "text");
        var rRace = race.trim().toLowerCase();
        rRace = rRace.charAt(0).toUpperCase() + rRace.slice(1);
        var isRace = (function () { for (var i = 0; i < AvailableRaces.length; i++) { if (AvailableRaces[i].name == rRace) { return true } else if (i + 1 == AvailableRaces.length) { return false; } } }())
        console.log(isRace);
        if (!isRace) {
            while (!isRace) {
                console.log(rRace);
                var SelRace = await Popup.quick(`Please input a valid race. Your options are ${raceOptions}. To view more information about a race, type it's name into the below box.`, "text");
                var rRace = SelRace.trim().toLowerCase();
                rRace = rRace.charAt(0).toUpperCase() + rRace.slice(1);
                isRace = (function () { for (var i = 0; i < AvailableRaces.length; i++) { if (AvailableRaces[i].name == rRace) { return true } else if (i + 1 == AvailableRaces.length) { return false; } } }());
                if (isRace) { race = rRace };
            }
        }
        race = (function () { for (var i = 0; i < AvailableRaces.length; i++) { if (AvailableRaces[i].name == race) { return AvailableRaces[i] } } }())
        var RaceStatString = ""
        var statArray = ["Strength", "Dexterity", "Constitution", "Wisdom", "Intelligence", "Charisma"];
        for (var i = 0; i < race.statBonuses.length; i++) {
            var lastNum = 0;
            var firstNum = null;
            for (var n = 0; n < race.statBonuses.length; n++) {
                if (race.statBonuses[n] != 0) {
                    if (firstNum == null) { firstNum = n }
                    lastNum = n;
                }
            }
            if (race.statBonuses[i] != 0) {
                if (i == firstNum) {
                    RaceStatString += `a ${checkIfPositive(race.statBonuses[i])} modifier to ${statArray[i]}, `
                } else if (i == lastNum) {
                    console.log("lastNum: " + lastNum);
                    console.log("i: " + i)
                    RaceStatString += ` and a ${checkIfPositive(race.statBonuses[i])} modifier to ${statArray[i]}`
                } else {
                    RaceStatString += ` ${checkIfPositive(race.statBonuses[i])} modifier to ${statArray[i]},`
                }
            }
        }
        var LanguageString = `${race.languages[0]} and ${race.languages[1]}`;
        if (await Popup.quick(`${race.description} Selecting ${race.name} as your race gives ${RaceStatString} alongside proficiency with ${race.toolProficiencies} and the ability to speak the ${LanguageString} tongues. Choose ${race.name} as your character's race?`, 'confirm')) {
            await Popup.quick(`You have selected ${race.name} as your character's race.`, 'continue')
            playerSelectedRace = race;
            playerSelectedRace = true;
        }
    }
    while (playerSelectedClass == null) {
        var classOptions = (function () { var Classes = gameData.Classes; var returnStr = ""; for (var i = 0; i < Classes.length; i++) { if (i + 1 != Classes.length) { returnStr += `${Classes[i].name}, `; } else { returnStr += `and ${Classes[i].name}`; } } return returnStr; }());
        var nClass = await Popup.quick(`Next, you need to choose a class for your character. Your class determines your skills, abilities, weapon and armor proficiences, and saving throw proficiencies. Your options are ${classOptions}. To view more information about a class, type it's name into the below box.`, "text");
    }

}
onload();
