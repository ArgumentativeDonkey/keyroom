import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
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

function doDelay() {
    cansendmessages = false;
    setTimeout(() => {
        cansendmessages = true;
        document.getElementById("message-input").placeholder = "Type a message...";
    }, timeout);
}

// Initialize Firebase
var currentRoom = "&hunch"
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

function getUserColor(username) {
    if (username === "Key") return "transparent; background-image: repeating-linear-gradient(45deg, #7a3b3b, #b85c5c, #7a3b3b var(--stripe-width)); animation: stripes var(--anim-time) linear infinite; background-position: 0 0; background-size: var(--stripe-calc) var(--stripe-calc)";
    if (username === "Leif") return "transparent; background-image: repeating-linear-gradient( 45deg, #63e3bf, #7383eb, #63e3bf var(--stripe-width) ); animation: stripes var(--anim-time) linear infinite; background-position: 0 0; background-size: var(--stripe-calc) var(--stripe-calc)";

    const palette = [
        "#e63946", "#f07c1e", "#2a9d8f", "#457b9d", "#b48c70",
        "#e9c46a", "#a29bfe", "#06d6a0", "#ef476f", "#118ab2"
    ];

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
            const raw = message.raw;
            const msgDiv = document.createElement("div");
            if (raw) {
                const msg = document.createElement("p");
                msg.innerHTML = `<span style="background-color:${message.color};" class="usernameBg">${message.writer}</span>`;
                msgDiv.appendChild(msg);
                msgDiv.innerHTML += message.text;
            } else {
                const msg = document.createElement("p");
                msg.innerHTML = `<span style="background-color:${message.color};" class="usernameBg">${message.writer}</span><span class="msgText"> ${message.text} <b>(${tstamp})</b></span>`;
                msgDiv.appendChild(msg);
            }
            messagesEl.appendChild(msgDiv);
        });
        scrollToBottom(messagesEl);
    });

}
const banned = ["<"];
function checkBannedWords(string, banlist) {
    if (!string) {
        string = "";
    }
    if (!banlist) {
        banlist = banned;
    }
    for (let i = 0; i < banlist.length; i++) {
        if (string.includes(banlist[i].toLowerCase())) {
            return false;
        }
    }
    return true;
}
const banphrases = ["sucks", "is a loser", "hates Key", "hates everybody", "likes dying in holes", "likes holes", "likes *******", "hates themself", "hit their head on a door", "likes bagels. Bagels? I love bagels! Bagels are round. The sun is round. The sun is yellow. Bananas are yellow. Bananas have spots. Old people have spots. Old people live long lives. Life? That's my favorite cereal! I once bought a box of life for $10. $10!? That's crazy! I was crazy once. They locked me in a room, and fed me bagels.", "died due to [intentional game design]", "<img src='https://m.media-amazon.com/images/I/414LBqeOktL.jpg' max-width:300px>", "loves Trump", "loves Biden", "loves American politics", "was pushed off a cliff by a donkey"];
function rndList(list) {
    if (!list) {
        list = banphrases;
    }
    let random = Math.floor(Math.random() * list.length);
    return list[random];
}
export async function sendMsg(message, writer, color, raw) {
    try {
        if (raw !== true) raw = false;
        if (typeof message === 'string') {
            if (!checkBannedWords(message) && currentRoom !== "/codeinject" && writer !== "xkcd") {
                message = rndList();
            }
            if (message.split(" ")[0] == "!image") {
                message = `<img src="${message.split(" ")[1]}" alt="Image" style="max-width:1200px; max-height:200px;">`;
            } else if (message.split(" ")[0] == "!link") {
                message = `<a href="${message.split(" ")[1]}" target="_blank" rel="noopener noreferrer">${message.split(" ")[1]}</a>`;
            } else if (message.split(" ")[0] === "!edit") {
                const newText = message.replace("!edit ", "") + " <i>(edited)</i>";
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
                        sendMsg(`Error: No message found with ID ${targetId}.`, "System", "#874c60");
                        return;
                    }
                }

                if (!found) {
                    sendMsg("Error: No message found to edit.", "System", "#");
                }
                return;
            } else if (message.split(" ")[0] === "!delete") {
                const targetId = message.split(" ")[1];
                const snapshot = await getDocs(query(collection(db, currentRoom), orderBy("timestamp", "desc")));
                let docFound = null;

                for (const doca of snapshot.docs) {
                    if (doca.text === targetId) {
                        docFound = doca;
                        break;
                    }
                }

                if (docFound) {
                    const docRef = doc(db, currentRoom, docFound.id);
                    await deleteDoc(docRef);
                } else {
                    sendMsg(`Error: No message found with ID ${targetId}.`, "System", "#874c60");
                    return;
                }
            } else if (message.split(" ")[0] === "!showIden") {
                const elements = document.getElementsByClassName('iden');
                for (let i = 0; i < elements.length; i++) {
                    elements[i].classList.add("shownIden");
                    elements[i].classList.remove("iden");
                }
            }

        }
        const messagesEl = document.getElementById("messages");
        const msgP = document.createElement("p");
        const iden = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log("iden:", iden);
        msgP.innerHTML = `<span style="background-color:${color};" class="usernameBg">${writer}</span><span class="msgText"> ${message} <b>(sending...)</b></span><span class="iden">${iden}</span>`;
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

        resetRoomIfKey(message, writer, message.split(" ")[1]);

    } catch (e) {
        console.error(e);
    }
}


async function tell(message, writer, reciepient) {
    try {
        if (reciepient == writer) {
            sendMsg(`Error: There is no need to message yourself`, "TellBot", '#6437c4');
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
    console.log("validating password")
    if (data.hasOwnProperty(username)) {
        console.log("password found, asking for verification.")
        let input = prompt("Enter password");
        return data[username] === hasher(input);
    } else {
        console.log("no password found, authenticating.")
        return true;
    }
}

var username;
async function setUsername() {
    if (!localStorage.getItem("username")) {
        username = prompt("Enter username");
        if (username == "xkcd") {
            username = "xkcd impersonator";
        }
        if (username == "" || username == " " || username == null) {
            alert("Please enter a username!");
            setUsername();
            return;
        }
        const ok = await validatePassword(username);
        if (!ok) {
            alert("Password incorrect, please try again.");
            setUsername();
            return;
        }

        localStorage.setItem("username", username);
        scrollToBottom(document.getElementById("messages"));
    } else {
        username = localStorage.getItem("username");
        if (username == "" || username == " " || username == null) {
            alert("Something is really wrong. Clear your cookies and try again.");
            localStorage.removeItem('username');
            setUsername();
            return;
        }
    }
}
setUsername();
const userRef = collection(db, "connectedUsers");
const usersQuery = query(userRef, orderBy("lastActive", "asc"));
const userDocRef = doc(db, "connectedUsers", username);
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
        sendMsg(`User ${user} not found.`, "LastActive", '#cf7e78');
    }
}
document.addEventListener("keydown", (e) => { processKeydown(e) });

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
messagesEl.scrollTop = messagesEl.scrollHeight;


await setDoc(userDocRef, {
    name: username,
    color: getUserColor(username),
    lastActive: serverTimestamp()
});
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
function clearRoomBorders() {
    document.getElementById("&random").style.border = "none"
    document.getElementById("&xkcd").style.border = "none"
    document.getElementById("&spam").style.border = "none"
    document.getElementById("&hunch").style.border = "none"
    document.getElementById("/codeinject").style.border = "none"
    document.getElementById("&boom").style.border = "none"
    document.getElementById("&gamescripts").style.border = "none"
}
document.getElementById("&random").addEventListener("click", () => {
    currentRoom = "&random"
    listenToRoom('&random')
    clearRoomBorders();
    document.getElementById("&random").style.border = "black solid 1px";
})
document.getElementById("&hunch").addEventListener("click", () => {
    currentRoom = "&hunch";
    listenToRoom('&hunch');
    clearRoomBorders();
    document.getElementById("&hunch").style.border = "black solid 1px";

})
document.getElementById("&xkcd").addEventListener("click", () => {
    currentRoom = "&xkcd";
    listenToRoom('&xkcd');
    clearRoomBorders();
    document.getElementById("&xkcd").style.border = "black solid 1px";
})
document.getElementById("&spam").addEventListener("click", () => {
    currentRoom = "&spam";
    clearRoomBorders();
    document.getElementById("&spam").style.border = "black solid 1px";
    listenToRoom('&spam');
})
document.getElementById("/codeinject").addEventListener("click", () => {
    currentRoom = "/codeinject";
    clearRoomBorders();
    document.getElementById("/codeinject").style.border = "black solid 1px";
    listenToRoom('/codeinject');
})
document.getElementById("&boom").addEventListener("click", () => {
    currentRoom = "&boom";
    clearRoomBorders();
    document.getElementById("&boom").style.border = "black solid 1px";
    listenToRoom('&boom');
})
document.getElementById("&gamescripts").addEventListener("click", () => {
    currentRoom = "&gamescripts";
    clearRoomBorders();
    document.getElementById("&gamescripts").style.border = "black solid 1px";
    listenToRoom('&gamescripts');
})
document.getElementById("&hunch").style.border = "black solid 1px";
listenToRoom('&hunch')
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

            sendMsg(`All messages in room ${targetRoom} have been reset by Key.`, "System", "#");
        }
    } catch (error) {
        console.error("Error in resetRoomIfKey:", error);
        sendMsg(`Failed to reset room: ${error.message}`, "System", "#874c60");
    }
}

