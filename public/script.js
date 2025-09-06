import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';
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


// Initialize Firebase
var currentRoom = "&hunch"
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
var messagesRef = collection(db, currentRoom);
var messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
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
    if (username === "Key") return "#9ca060";

    const storageKey = `color_${username}`;
    let color = localStorage.getItem(storageKey);
    if (color) return color;

    const palette = [
        "#e63946",
        "#f07c1eff",
        "#2a9d8f",
        "#457b9d",
        "#b48c70ff",
        "#e9c46a",
        "#a29bfe",
        "#06d6a0",
        "#ef476f",
        "#118ab2"
    ];
    const assigned = Object.keys(localStorage).filter(k => k.startsWith("color_")).length;
    const index = Math.floor(Math.random() * 10);
    color = palette[index] || "#ffffff";

    localStorage.setItem(storageKey, color);
    return color;
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
        var i = 0
        snapshot.forEach((doc) => {
            i += 1
            const message = doc.data();
            const tstamp = parseTimestamp(message.timestamp);
            const raw = message.raw;
            if (raw) {
                const msgDiv = document.createElement("div");
                const msg = document.createElement("p");
                msg.innerHTML = `<span style="background-color:${message.color};" class="usernameBg">${message.writer}</span>`
                msgDiv.appendChild(msg);
                msgDiv.innerHTML += message.text;
                messagesEl.appendChild(msgDiv);
            } else {
                const msg = document.createElement("p");
                msg.innerHTML = `<span style="background-color:${message.color};" class="usernameBg">${message.writer}</span><span class="msgText"> ${message.text} <b>(${tstamp})</b></span>`;
                messagesEl.appendChild(msg);
            }
        });
        scrollToBottom(messagesEl);
    });
}
async function sendMsg(message, writer, color, raw) {
    try {
        if (raw !== true) {
            raw = false
        }
        await addDoc(collection(db, currentRoom), {

            text: message,
            writer: writer,
            color: color,
            timestamp: serverTimestamp(),
            raw: raw
        });
        console.log("Data sent!")
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
document.addEventListener("keydown", (e) => {
    if (e.keyCode == 13) {
        sendMsg(document.getElementById("message-input").value, username, getUserColor(username));
        if (document.getElementById("message-input").value.split(" ")[0] == "!xkcd" && currentRoom == "&xkcd") {
            sendXkcd(document.getElementById("message-input").value.split(" ")[1]);

        }
        document.getElementById("message-input").value = "";
    }
})
var username
if (!localStorage.getItem("username")) {
    username = prompt("Enter username");
    if (username == ("" || " ")) {
        alert("Please enter a username!");
        document.location.reload();
    }

    localStorage.setItem("username", username);
} else {
    username = localStorage.getItem("username");
}
messages.scrollTop = messages.scrollHeight;

const userRef = collection(db, "connectedUsers");
const usersQuery = query(userRef, orderBy("lastActive", "asc"));
const userDocRef = doc(db, "connectedUsers", username);
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
    messages.scrollTop = messages.scrollHeight;
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
function clearRoomBorders () {
    document.getElementById("&random").style.border = "none"
    document.getElementById("&xkcd").style.border = "none"
    document.getElementById("&spam").style.border = "none"
    document.getElementById("&hunch").style.border = "none"
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
document.getElementById("&hunch").style.border = "black solid 1px";
listenToRoom('&hunch')
