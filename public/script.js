import { Popup } from "./popup.js"
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDocs, deleteDoc, where } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
async function sendMail(recipient, sender) {
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

        if ((elapsedSecondsSince(userData.lastSummoned) < 43200)&&userData.lastSummoned) {
            console.log("elapsedSecs:"+elapsedSecondsSince(userData.lastSummoned) < 43200);
            Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: ${recipient} was summoned less than 12 hours ago.`);
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
            message: "You have been summoned!"
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
// Initialize Firebase
let currentRoom = "&hunch"
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const messagesRef = collection(db, currentRoom);
const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
const tellRef = collection(db, "tellMsgs");
const tellQuery = query(tellRef, orderBy("timestamp", "asc"));
var UsersShown = false;
function parseTimestamp(input) {
    let date;

    // Firestore Timestamps have toDate()
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

    // Compact formatter: "17:30 8/9/25"
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
        if (username === "Key") return "7a3bff";
        if (username === "Leif") return "63e3bf";
        if (username === "TellBot") return "6437c4";
    } else if (!hashe) {
        if (username === "Key") return "transparent; background-image: repeating-linear-gradient(45deg, #7a3bff, #9b59ff, #7a3bff var(--stripe-width)); animation: stripes var(--anim-time) linear infinite; background-position: 0 0; background-size: var(--stripe-calc) var(--stripe-calc)";
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
                            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.writer)}&background=random&rounded=true`;
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
                content.innerHTML = `<span class="usernameBg" style="background-color:${message.color};">${message.writer}</span>${message.text}`;
            } else {
                content.innerHTML = `<span class="usernameBg" style="background-color:${message.color};">${message.writer}</span>
                                     <span class="msgText"><b>${tstamp}</b><br>${message.text}</span>
                                     <span class="iden">${message.iden}</span>`;
            }

            msgDiv.appendChild(avatar);
            msgDiv.appendChild(content);
            messagesEl.appendChild(msgDiv);
        });
        scrollToBottom(messagesEl);
    });
}

const banned = ["<", "fuck", "shit"];
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
function replaceWithBossBattle(){
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
    }, {merge: true});
}
async function initiateBossBattle() {
    sendMsg("You dare awaken me from my slumber? Prepare to face the wrath of the Phospholipid Bilayer!", "Phospholipid Bilayer", "#228B22", false, true);
    const bossRef = collection(db, "bossBattle");
    const snapshot = await getDocs(bossRef);
    await addDoc(bossRef, {
            health: 100,
            active: true
    }, {merge: true});
    await new Promise(resolve => setTimeout(resolve, 3000));
    replaceWithBossBattle();
}
async function scheckInbox(username) {
    const tellRef = collection(db, "tellMsgs");
    const snapshot = await getDocs(tellRef);
    let inboxCounter = 0;

    snapshot.forEach(doca => {
        const data = doca.data();
        if (data.reciepient === username) {
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
        var checkInbox = false;
        if (raw !== true) raw = false;
        if (typeof message === 'string') {
            if (!checkBannedWords(message) &&  (currentRoom !== "/codeinject"&&currentRoom!==`${username}`) && writer !== "xkcd") {
                console.log(currentRoom);
                message = rndList();
            }
            if (message.split(" ")[0] == "!image") {
                message = `<img src="${message.split(" ")[1]}" alt="Image" style="max-width:1200px; max-height:200px;">`;
            } else if (message.split(" ")[0] == "!link") {
                message = `<a href="${message.split(" ")[1]}" target="_blank" rel="noopener noreferrer">${message.split(" ")[1]}</a>`;
            } else if (message.split(" ")[0] === "!edit") {
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
            } else if (message.split(" ")[0] === "!editId") {
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
            } else if (message.split(" ")[0] === "!editProfilePic") {
                const newPicUrl = message.split(" ")[1];
                const userDocRef = doc(db, "connectedUsers", writer);
                await setDoc(userDocRef, {
                    profilePic: newPicUrl
                }, { merge: true });
                Popup.quick(`<span class='material-symbols-outlined'>account_circle</span><br>Profile picture updated!<br><img width='100px' src=${newPicUrl}/>`);
                return;

            } else if (message.split(" ")[0] === "!setEmail") {
                const email = message.split(" ")[1];
                const userDocRef = doc(db, "connectedUsers", writer);
                await setDoc(userDocRef, {
                    email: email
                }, { merge: true });
                Popup.quick(`<span class="material-symbols-outlined">mail</span><br>Email updated to ${email}`, "ok")
                return;

            } else if (message.split(" ")[0] === "!delete") {
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
            }else if (message.trim() === "!logOut") {
                localStorage.removeItem('username');
                localStorage.removeItem('password');
                onload();
                return;
            } else if (message.split(" ")[0] === "!showIden") {
                document.getElementById("messages").classList.add("showIden");
            } else if (message.split(" ")[0] === "!hideIden") {
                document.getElementById("messages").classList.remove("showIden");
            }
            else if (message.split(" ")[0] === "!flip") {
                document.getElementById("messages").style.transform = "scaleY(-1) rotate(1deg)";
            } else if (message.split(" ")[0] === "!unflip") {
                document.getElementById("messages").style.transform = "scaleY(1) rotate(0deg)";
            } else if (message.split(" ")[0] === "!rainbow") {
                color = "transparent; background-image: repeating-linear-gradient( 45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff, #ff0000 var(--stripe-width)); animation: stripes var(--anim-time) linear infinite; background-position: 0 0; background-size: var(--stripe-calc) var(--stripe-calc)";
                message = `<span>${message.split(" ").splice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!rotate" && (currentRoom == "/codeinject"||currentRoom==`&${username}`)) {
                message = `<span style="display:inline-block; transform:rotate(${message.split(" ")[1]}deg);">${message.split(" ").slice(2).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!unrainbow") {
                color = "white";
                message = `<span>${message.split(" ").splice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!shrink") {
                message = `<span style="font-size:0.5em;">${message.split(" ").splice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!grow") {
                message = `<span style="font-size:2em;">${message.split(" ").splice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!spin" && (currentRoom == "/codeinject"||currentRoom==`&${username}`)) {
                message = `<span style="display:inline-block; animation: spin 2s linear infinite;">${message.split(" ").splice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!code") {
                message = `<code>${message.split(" ").splice(1).join(" ")}</code>`;
            } else if (message.split(" ")[0] === "!bold") {
                message = `<b>${message.split(" ").splice(1).join(" ")}</b>`;
            } else if (message.split(" ")[0] === "!italic") {
                message = `<i>${message.split(" ").splice(1).join(" ")}</i>`;
            } else if (message.split(" ")[0] === "!underline") {
                message = `<u>${message.split(" ").splice(1).join(" ")}</u>`;
            } else if (message.split(" ")[0] === "!strikethrough") {
                message = `<s>${message.split(" ").splice(1).join(" ")}</s>`;
            } else if (message.split(" ")[0] === "!reverse") {
                const text = message.split(" ").slice(1).join(" ");
                message = `<span>${text.split("").reverse().join("")}</span>`;
            } else if (message.split(" ")[0] === "!upper") {
                message = `<span>${message.split(" ").slice(1).join(" ").toUpperCase()}</span>`;
            } else if (message.split(" ")[0] === "!lower") {
                message = `<span>${message.split(" ").slice(1).join(" ").toLowerCase()}</span>`;
            } else if (message.split(" ")[0] === "!wave") {
                const text = message.split(" ").slice(1).join(" ");
                message = `<span style="display:inline-block; animation: wave 2s infinite;">${text}</span>`;
            } else if (message.split(" ")[0] === "!glitch") {
                const text = message.split(" ").slice(1).join(" ");
                message = `<span class="glitch" data-text="${text}">${text}</span>`;
            } else if (message.split(" ")[0] === "!shrug") {
                message = `<span>${message.split(" ").slice(1).join(" ")} ¯\\_(ツ)_/¯</span>`;
            } else if (message.split(" ")[0] === "!spoiler") {
                message = `<span style="background:black; color:black;" onmouseover="this.style.color='white'">${message.split(" ").slice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!blink") {
                message = `<span style="animation: blink 1s steps(2, start) infinite;">${message.split(" ").slice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!monospace") {
                message = `<span style="font-family:monospace;">${message.split(" ").slice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!shake") {
                message = `<span style="display:inline-block; animation: shake 0.5s infinite;">${message.split(" ").slice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!fade") {
                message = `<span style="animation: fadeIn 2s;">${message.split(" ").slice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!count") {
                const text = message.split(" ").slice(1).join(" ");
                message = `<span>${text} (${text.length} chars)</span>`;
            } else if (message.split(" ")[0] === "!time") {
                message = `<span>${new Date().toLocaleTimeString()}</span>`;
            } else if (message.split(" ")[0] === "!date") {
                message = `<span>${new Date().toLocaleDateString()}</span>`;
            } else if (message.split(" ")[0] === "!rainbowtext") {
                const text = message.split(" ").slice(1).join(" ");
                message = `<span style="background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet); -webkit-background-clip: text; color: transparent;">${text}</span>`;
            } else if (message.split(" ")[0] === "!binary") {
                let text = message.split(" ").slice(1).join(" ");
                text = text.split("").map(c => c.charCodeAt(0).toString(2)).join(" ");
                message = `<span>${text}</span>`;
            } else if (message.split(" ")[0] === "!leet") {
                let text = message.split(" ").slice(1).join(" ");
                text = text.replace(/a/gi, "4").replace(/e/gi, "3").replace(/i/gi, "1").replace(/o/gi, "0").replace(/s/gi, "5").replace(/t/gi, "7");
                message = `<span>${text}</span>`;
            } else if (message.split(" ")[0] === "!reversewords") {
                let text = message.split(" ").slice(1).reverse().join(" ");
                message = `<span>${text}</span>`;
            } else if (message.split(" ")[0] === "!outline") {
                message = `<span style="color:black; -webkit-text-stroke:1px red;">${message.split(" ").slice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!glow") {
                message = `<span style="color:#fff; text-shadow:0 0 5px #0ff, 0 0 10px #0ff, 0 0 20px #0ff;">${message.split(" ").slice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!zebra") {
                let text = message.split(" ").slice(1).join(" ");
                message = `<span>${text.split("").map((c, i) => `<span style="background:${i % 2 ? "#000" : "#fff"};color:${i % 2 ? "#fff" : "#000"};">${c}</span>`).join("")}</span>`;
            } else if (message.split(" ")[0] === "!wavey") {
                message = `<span style="text-decoration:underline wavy red;">${message.split(" ").slice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!stretch") {
                message = `<span style="letter-spacing:5px;">${message.split(" ").slice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!tight") {
                message = `<span style="letter-spacing:-1px;">${message.split(" ").slice(1).join(" ")}</span>`;
            } else if (message.split(" ")[0] === "!hollow") {
                message = `<span style="color:transparent; -webkit-text-stroke:1px black;">${message.split(" ").slice(1).join(" ")}</span>`;
            }






        }
        const messagesEl = document.getElementById("messages");
        const msgP = document.createElement("p");
        const iden = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log("iden:", iden);
        msgP.innerHTML = `<span style="background-color:${color};" class="usernameBg">${writer}</span>
                          <span class="msgText"> ${message} <b>(sending...)</b></span>
                          <span class="iden">${iden}</span>`;
        messagesEl.appendChild(msgP);
        scrollToBottom(messagesEl);

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
                if (data.reciepient == username) {

                    var message = `From ${data.writer}: ${data.text}`;
                    sendMsg(message, "TellBot", '#6437c4');
                    const docRef = doc(db, "tellMsgs", doca.id);
                    deleteDoc(docRef);

                }
            });
        }
        if (message.split(" ")[0] === "!summon") {
            if (message == "!summon Phospholipid Bilayer") {
                initiateBossBattle();
                return;
            }
            const reciepient = message.split(" ")[1];
            sendMail(reciepient, writer);
        }
        if (writer !== "TellBot") {
            scheckInbox(username);
        }


        resetRoomIfKey(message, writer, message.split(" ")[1]);

    } catch (e) {
        console.error(e);
    }
}


async function tell(message, writer, reciepient) {
    try {
        if (reciepient == writer) {
            Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: There is no need to message yourself`);
            return;
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
        if(!(localStorage.getItem("seen-pwd-warning") === "true" )) {
            await Popup.quick("<span class='material-symbols-outlined'>lock_open</span><br>You don't have a registered password. If you want one, please contact someone with Git access.", "ok");
            localStorage.setItem("seen-pwd-warning", true);
        }
        console.log("no password found, authenticating.");
        return true;
    }
}


var username;
async function setUsername() {
    if (!localStorage.getItem("username")) {
        username = await Popup.quick("<span class='material-symbols-outlined'>person</span><br>Please enter your username.", "text");
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

const messagesEl = document.getElementById("messages");

function clearRoomBorders() {
    document.getElementById("&random").classList.remove('roomActive');
    document.getElementById("&xkcd").classList.remove('roomActive');
    document.getElementById("&spam").classList.remove('roomActive');
    document.getElementById("&hunch").classList.remove('roomActive');
    document.getElementById("/codeinject").classList.remove('roomActive');
    document.getElementById("&boom").classList.remove('roomActive');
    document.getElementById("&gamescripts").classList.remove('roomActive');
    document.getElementById("&").classList.remove('roomActive');
    document.getElementById("&random").classList.add('room');
    document.getElementById("&xkcd").classList.add('room');
    document.getElementById("&spam").classList.add('room');
    document.getElementById("&hunch").classList.add('room');
    document.getElementById("/codeinject").classList.add('room');
    document.getElementById("&boom").classList.add('room');
    document.getElementById("&gamescripts").classList.add('room');
    document.getElementById("&").classList.add('room');
}
import { writeBatch } from "firebase/firestore";

async function resetRoomIfKey(message, writer, room) {
    try {
        const parts = message.trim().split(" ");
        const cmd = parts[0].toLowerCase();
        const targetRoom = room || parts[1] || currentRoom;

        if ((writer === "Key" || writer === "Leif") && cmd === "!reset") {
            console.log("Resetting room:", targetRoom);
            const snapshot = await getDocs(collection(db, targetRoom));
            const batch = writeBatch(db);

            snapshot.forEach((docItem) => {
                const docRef = doc(db, targetRoom, docItem.id);
                batch.delete(docRef);
            });

            await batch.commit();

            sendMsg(`All messages in room ${targetRoom} have been reset by Key.`, "System", "#4c5b8c");
        }
    } catch (error) {
        console.error("Error in resetRoomIfKey:", error);
        Popup.quick(`<span class='material-symbols-outlined'>warning</span><br>Error: failed to reset room: ${error.message}`);
    }
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
    
    await setUsername();
    userDocRef = doc(db, "connectedUsers", username)
    document.addEventListener("keydown", (e) => { processKeydown(e) });
    messagesEl.scrollTop = messagesEl.scrollHeight;
    await setDoc(userDocRef, {
        name: username,
        color: getUserColor(username),
        lastActive: serverTimestamp()
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
                userP.innerHTML = `<span style="background-color:${user.color};" class="usernameBg">${user.name}</span>`;
                document.getElementById("connectedUsers").appendChild(userP);
            }
        })
        const messagesEl = document.getElementById("messages");
        if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

    })
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
        currentRoom = "&random"
        listenToRoom('&random')
        clearRoomBorders();
        document.getElementById("&random").classList.add('roomActive');
        document.getElementById("&random").classList.remove('room');
    })
    document.getElementById("&hunch").addEventListener("click", () => {
        currentRoom = "&hunch";
        listenToRoom('&hunch');
        clearRoomBorders();
        document.getElementById("&hunch").classList.add('roomActive');
        document.getElementById("&hunch").classList.remove('room');

    })
    document.getElementById("&xkcd").addEventListener("click", () => {
        currentRoom = "&xkcd";
        listenToRoom('&xkcd');
        clearRoomBorders();
        document.getElementById("&xkcd").classList.add('roomActive');
        document.getElementById("&xkcd").classList.remove('room');
    })
    document.getElementById("&spam").addEventListener("click", () => {
        currentRoom = "&spam";
        clearRoomBorders();
        document.getElementById("&spam").classList.add('roomActive');
        document.getElementById("&spam").classList.remove('room');
        listenToRoom('&spam');
    })
    document.getElementById("/codeinject").addEventListener("click", () => {
        currentRoom = "/codeinject";
        clearRoomBorders();
        document.getElementById("/codeinject").classList.add('roomActive');
        document.getElementById("/codeinject").classList.remove('room');
        listenToRoom('/codeinject');
    })
    document.getElementById("&boom").addEventListener("click", () => {
        currentRoom = "&boom";
        clearRoomBorders();
        document.getElementById("&boom").classList.add('roomActive');
        document.getElementById("&boom").classList.remove('room');
        listenToRoom('&boom');
    })
    document.getElementById("&gamescripts").addEventListener("click", () => {
        currentRoom = "&gamescripts";
        clearRoomBorders();
        document.getElementById("&gamescripts").classList.add('roomActive');
        document.getElementById("&gamescripts").classList.remove('room');
        listenToRoom('&gamescripts');
    })
    document.getElementById("&").addEventListener("click", () => {
        currentRoom = `&${username}`;
        clearRoomBorders();
        document.getElementById("&").classList.add('roomActive');
        document.getElementById("&").classList.remove('room');
        listenToRoom(`${username}`);
    })
    document.getElementById("&hunch").classList.add('roomActive');
    document.getElementById("&hunch").classList.remove('room');
    listenToRoom('&hunch');
}
onload();