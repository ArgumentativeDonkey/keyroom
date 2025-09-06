import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc} from 'firebase/firestore';
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const messagesRef = collection(db, "messages");
const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
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
        "#e63946", // red
        "#f07c1eff", // orange
        "#2a9d8f", // teal
        "#457b9d", // blue
        "#b48c70ff", // slate
        "#e9c46a", // yellow
        "#a29bfe", // purple
        "#06d6a0", // mint
        "#ef476f", // pink
        "#118ab2"  // deep blue
    ];

    // Count how many colors are already assigned
    const assigned = Object.keys(localStorage).filter(k => k.startsWith("color_")).length;

    // Pick next color from palette, wrap around if > 10
    const index = Math.floor(Math.random()*10);
    color = palette[index] || "#ffffff"; // fallback, just in case

    localStorage.setItem(storageKey, color);
    return color;
}

onSnapshot(messagesQuery, (snapshot) => {
    document.getElementById("messages").innerHTML = ""
    snapshot.forEach((doc) => {
        const message = doc.data();
        const msg = document.createElement("p");
        const tstamp = parseTimestamp(message.timestamp);
        msg.innerHTML = `<span style="background-color:${message.color}; color: 'white';padding: 4px;border-radius:2px;">[${message.writer}] ${message.text} (${tstamp})</span>`;
        document.getElementById("messages").appendChild(msg);

    })
    messages.scrollTop = messages.scrollHeight;
})
async function sendMsg(message, writer, color) {
    try {
        await addDoc(collection(db, "messages"), {

            text: message,
            writer: writer,
            color: color,
            timestamp: serverTimestamp()
        });
        console.log("Data sent!")
    } catch (e) {
        console.error("Shit.", e);
    }
}
document.addEventListener("keydown", (e) => {
    if (e.keyCode == 13) {
        sendMsg(document.getElementById("message-input").value, username, getUserColor(username));
        document.getElementById("message-input").value = "";
    }
})
var username
/*
document.getElementById("send-button").addEventListener("click", () => {
    sendMsg(document.getElementById("message-input").value, username, getUserColor(username));
})
    */
if (!localStorage.getItem("username")) {
    username = prompt("Enter username");
    if(username == ("" || " ")){
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
            userP.innerHTML = `<span style="background-color:${user.color}; color: 'white';padding: 4px;border-radius:2px;">[${user.name}]</span>`;
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