/*
This file acts as the main chat logic for Keyroom.
Feel free to modify it as you wish!
*/

//refrences
import { Popup } from "./popup.js" //import the popup module for displaying popups.
import { initializeApp } from "firebase/app";
import {config} from './config.js'; //import config files. make sure your config file is named config.js and has the same structure as configexample.js!
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDocs, deleteDoc, where, getDoc } from 'firebase/firestore';
import { Class, Entity, Player, Skill, GameData } from "./gameData.js";
import { hasher } from "./hashutil.js"; //import the hasher function for password hashing



var gameData = new GameData(); //Import data for the game. the game is not complete. the game never will be complete.
var messages = 0;
var nNotify = false;
var gameInitiated = false;
var additionalRooms = []; //list of  additional rooms the user has joined. this is updated automatically from local storage and the add rooms menu.
var additionalRoomNames = []; //list of the names additional rooms the user has joined.
const firebaseConfig = { //firebase configuration object. automatically filled from config.js.

    apiKey: config.firebase.apiKey,

    authDomain: config.firebase.authDomain,

    databaseURL: config.firebase.databaseURL,

    projectId: config.firebase.projectId,

    storageBucket: config.firebase.storageBucket,

    messagingSenderId: config.firebase.messagingSenderId,

    appId: config.firebase.appId,

    measurementId: config.firebase.measurementId

};

/** 
 * Can they send messages?
 * @type {boolean}
 * */
let cansendmessages = true;
/**
 * Timeout (ms) for messages.
 * Users cannot send messages at a higher frequency than this.
 * @type {number}
 */
const timeout = 1000;
/**
 * Sends a recipient a message via "TellBot"
 * @param {string} recipient - The recipient of the mail
 * @param {string} sender - The person sending the mail
 * @param {string} message - The message being sent
 * @returns {null}
 */
async function sendMail(recipient, sender, message) { //this is the summoning function, assuming it has been enabled, which allows users to summon each other via email
    if (!config.emailJs.enabled) return;
    if (recipient === sender) { 
        Popup.err("There is no need to summon yourself");
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

        if ((elapsedSecondsSince(userData.lastSummoned) < config.emailJs.summonCooldown) && userData.lastSummoned) { //cooldown on summons, in seconds
            console.log("elapsedSecs:" + elapsedSecondsSince(userData.lastSummoned) < config.emailJs.summonCooldown);
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

        await emailjs.send(config.emailJs.serviceId, config.emailJs.templateId, templateParams);

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
    if (config.emailJs.enabled) emailjs.init(config.emailJs.key);
})();
let currentRoom = "&general"
document.getElementById("messages").setAttribute("data-theme", "normal");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tellRef = collection(db, "tellMsgs"); //the collection of messages in which tells are stored. tell messages are keyroom's internal mail system.
var UsersShown = false;
function parseTimestamp(input) { //used to parse timestamps from firestore into human readable format
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

    const opts = { timeZone: config.keyroom.timezone, hour: "2-digit", minute: "2-digit" };
    const time = new Intl.DateTimeFormat("en-US", opts).format(date);

    const m = date.toLocaleDateString("en-US", { timeZone: config.keyroom.timezone, month: "numeric" });
    const d = date.toLocaleDateString("en-US", { timeZone: config.keyroom.timezone, day: "numeric" });
    const yr = date.toLocaleDateString("en-US", { timeZone: config.keyroom.timezone, year: "2-digit" });

    return `${time} ${m}/${d}/${yr}`;
}
function elapsedSecondsSince(timestamp) { //calculate elapsed seconds since an event timestamp
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
/**
 * Get a pseudo-random color for a username
 * @param {string} username - The username we are getting the color for
 * @param {boolean} hashe - Whether to include the `#` in the color or not
 * @returns {string}
 */
function getUserColor(username, hashe) {
    // Special colors for Key, Leif, and TellBot
    // NOTE: Linear gradients are now removed due to the
    // fact that they are no longer visible any more.
    if (hashe) {
        if (username === "Key") return "000000";
        if (username === "Leif") return "63e3bf";
        if (username === "TellBot") return "6437c4";
    } else if (!hashe) {
        if (username === "Key") return "#000000";
        if (username === "Leif") return "#63e3bf";
        if (username === "TellBot") return "#6437c4";
    }
    var palette;
    if (!hashe) {
        palette = [
            "#e63946", "#f07c1e", "#2a9d8f", "#457b9d", "#b48c70",
            "#e9c46a", "#a29bfe", "#06d6a0", "#ef476f", "#118ab2"
        ];
    } else {
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
    console.log(`got color ${palette[index]} for user ${username}`);
    return palette[index];
}
/**
 * A function to return the HTML for an xkcd comic
 * @param {number|null} number - A number, if given, to show
 * @returns {string}
 */
async function showLatestXkcd(number) { 
    function generateXkcdTemplate(num, title, img, alt) {
        return `
        <a href="https://xkcd.com/${num}/" target="_blank" rel="noopener noreferrer">
            <h2>${title} (#${num})</h2>
            <img src="${img}" alt="${alt}" title="${alt}" style="max-width:100%"/>
        </a>
        `
    }

    try {
        const response = await fetch("https://xkcd.vercel.app/?comic=latest");
        const data = await response.json();
        console.log(number);
        if (Number.isInteger(number) && number <= data.num) {
            console.log("numver")
            const response = await fetch(`https://xkcd.vercel.app/?comic=${number}`)
            const newdata = await response.json()
            return generateXkcdTemplate(newdata.num, newdata.title, newdata.img, newdata.alt);
        } else if (Number.isInteger(number)) {
            return "<p>That xkcd doesn\'t exists yet!</p>"
        } else {
            return generateXkcdTemplate(data.num, data.title, data.img, data.alt);
        }
    } catch (err) {
        console.error("Error fetching xkcd:", err);
        Popup.err("Sorry, we couldn't get that xkcd.<br><small>Check console for more details.<small>");
        return null;
    }
}

let unsubscribeMessages = null;
function scrollToBottom(container) { //scrolls users to the bottom of the messages div.
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
/**
 * Create an avatar image element for a given user.
 * @param {boolean} rounded - Whether the avatar should be rounded or square (true for rounded, false for square). Defaults to rounded.
 * @param {string} writer - Whom the avatar is being created for. Defaults to the local user.
 * @returns {HTMLImageElement}
*/
async function createAvatar(rounded = true, writer = username) { 
    const avatar = document.createElement("img");
    if (rounded) avatar.className = "avatar"; else avatar.className = "squareAvatar";
    getDocs(query(collection(db, "connectedUsers"), where("name", "==", writer)))
        .then(snap => {
            if (!snap.empty) {
                const userData = snap.docs[0].data();
                if (userData.profilePic) {
                    avatar.src = userData.profilePic;
                } else {
                    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(writer)}&background=${getUserColor(writer).split("#").join('')}&rounded=${rounded}`;
                }
            } else if (writer === "TellBot") {
                avatar.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDlzJDyJ_J6vRQmfW4D-ve6PWtLk6XLdu_3w&s";
            } else {
                avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(writer)}&background=${getUserColor(writer, true).split("#").join('')}&rounded=${rounded}`;
            }
            avatar.alt = writer;
        })
        .catch(err => {
            console.error("Error fetching user data:", err);
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(writer)}&background=random&rounded=true`;
            avatar.alt = writer;
        });
    avatar.src = `https://ui-avatars.com/api/?name=${writer}&background=random&rounded=true`;
    avatar.alt = writer;
    return avatar;

}
/**
 * Begin listening to a room and update the messages in real-time.
 * @param {string} roomName - the name of the room to listen to.
 */
function listenToRoom(roomName) {
    document.getElementById("header").innerHTML = "& " + roomName.split("&").join("");
    // Set the lastRoom to the room name if it isn't /codeinject
    if (roomName != "/codeinject") {
        localStorage.setItem("lastRoom", roomName);
    }
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    currentRoom = roomName;
    const messagesRef = collection(db, currentRoom);
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

    unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        document.head.querySelector('title').innerText = `${config.keyroom.pageTitle} - ${currentRoom}`;
        if (!nNotify) {
            messages = snapshot.size;
            nNotify = true;
        } else if (snapshot.size > messages) {
            messages = snapshot.size;
            if (document.hidden) {
                console.log("New message detected in background");
                document.head.querySelector('title').innerText = `NEW MESSAGE — ${config.keyroom.pageTitle} — ${currentRoom}`;
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
                            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.writer)}&background=${getUserColor(message.writer).split("#").join('')}&rounded=true`;
                        }
                    } else if (message.writer === "TellBot") {
                        avatar.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDlzJDyJ_J6vRQmfW4D-ve6PWtLk6XLdu_3w&s";
                    } else {
                        avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.writer)}&background=${getUserColor(message.writer, true).split("#").join('')}&rounded=true`;
                    }
                    avatar.alt = message.writer;
                })
                .catch(err => {
                    console.error("Error fetching user data:", err);
                    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.writer)}&background=random&rounded=true`;
                    avatar.alt = message.writer;
                });
            // ANCHOR Message construction
            avatar.src = `https://ui-avatars.com/api/?name=${message.writer}&background=random&rounded=true`;
            avatar.alt = message.writer;
            avatar.onclick = function () {
                makeProfile(message.writer);
                document.getElementById("CharacterProfile").style.visibility = "visible";

            };

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

const banned = ["<", atob("ZnVjaw=="), atob("IGNjcCA=")];
const bannedeq = ["'&lt;'", "a very bad word", "a reference to the CCP"];
function checkBannedWords(string, banlist) { //check for banned words in a string
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
/**
 * Check a user's inbox for unread messages and notify them if there are any.
 * @param {string} username - the username to check the inbox for
 */
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


const banphrases = [ //banned phrases
    "sucks",
    "is a loser",
    "hates everybody",
    "likes dying in holes",
    "likes holes",
    "likes *******",
    "hates themself",
    "hit their head on a door",
    "likes bagels. Bagels? I love bagels! Bagels are round. The sun is round. The sun is yellow. Bananas are yellow. Bananas have spots. Old people have spots. Old people live long lives. Life? That's my favorite cereal! I once bought a box of life for $10. $10!? That's crazy! I was crazy once. They locked me in a room, and fed me bagels.",
    "died due to [intentional game design]",
    "<img src='https://m.media-amazon.com/images/I/414LBqeOktL.jpg' width='300px'>",
    (async () => {
        await Popup.quick("You probably know by now that you shouldn't be doing that.", "ok");
        await Popup.quick("So why do you keep doing it?", "ok");
        await Popup.quick("Anyway, you get your choice of what message you want to send.", "ok");
        let choice = await Popup.quick("Ok, here they are.", "3options", "random", "political", "bagels");
        switch (choice) {
            case "political":
                return "<img src='https://m.media-amazon.com/images/I/414LBqeOktL.jpg' width='300px'>";
            case "bagels":
                return "likes bagels. Bagels? I love bagels! Bagels are round. The sun is round. The sun is yellow. Bananas are yellow. Bananas have spots. Old people have spots. Old people live long lives. Life? That's my favorite cereal! I once bought a box of life for $10. $10!? That's crazy! I was crazy once. They locked me in a room, and fed me bagels.";
            default:
                return rndList(banphrases.slice(0, -1));
        }
    })

];
async function rndList(list) {
    if (!list) {
        list = banphrases;
    }
    let random = Math.floor(Math.random() * list.length);
    let theRandomListElement = list[random];
    if (typeof (theRandomListElement) == "function") {
        return await theRandomListElement();
    } else {
        return theRandomListElement;
    }
}
//#region function sendMsg()
// TODO: Remove the whole `color` thing from this.
/**
 * xx
 * @param {string} message - the message to be sent
 * @param {string} writer - the writer writing the message
 * @param {string} color - the color (only used for the default avatar at this point)
 * @param {boolean} raw - is it raw? a useless parameter that I implemented and should probably remove
 * @returns {null} - I don't think it returns anything at least
 */
export async function sendMsg(message, writer, color, raw) {
    document.documentElement.style.setProperty("--n-rooms", document.getElementById("roomsList").childElementCount - 1);
    try {
        console.log(message);
        var checkInbox = false;
        if (raw !== true) raw = false;
        if (message.trim() === "") { return; }
        if (typeof message === 'string') {
            if ((currentRoom !== "/codeinject" && currentRoom !== `${username}`) && writer !== "xkcd" && !checkBannedWords(message)) {
                console.log(currentRoom);
                message = await rndList();
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
                    message = "";
                    Popup.quick(`<span class="material-symbols-outlined">warning</span><br>Error: No message found with ID ${targetId}.`);
                    return;
                }
            }

            if (!found) {
                Popup.err("No message found to edit.");
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
                return;
            }

            if (!found) {
                Popup.err("No message found to edit.");
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
        } else if (message.split(" ")[0].trim() === "!setBio") {
            const bio = message.substring(message.indexOf(' ') + 1)
            const userDocRef = doc(db, "connectedUsers", writer);
            await setDoc(userDocRef, {
                bio: bio
            }, { merge: true });
            Popup.quick(`<span class="material-symbols-outlined">mail</span><br>Bio updated to ${bio}`, "ok")
            return;

        } else if (message.split(" ")[0].trim() === "!setPassword") {
            const newPassword = message.split(" ")[1];
            const userDocRef = doc(db, "connectedUsers", writer);
            const hashedPassword = hasher(newPassword);
            await setDoc(userDocRef, {
                password: hashedPassword
            }, { merge: true });
            Popup.quick(`<span class="material-symbols-outlined">key</span><br>Password updated!`, "ok")
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
                    return;
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
            localStorage.removeItem('additionalRooms');
            localStorage.removeItem('seen-pwd-warning');
            localStorage.removeItem('deviceId');
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
        // ANCHOR Send Message Code
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
        await addDoc(collection(db, "allMsgs"), {
            text: message,
            writer: writer,
            color: color,
            timestamp: serverTimestamp(),
            raw: raw,
            iden: iden,
            room: currentRoom
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
            if (message.split(" ")[2] !== undefined) {
                const reciepient = message.split(" ")[1];
                const msg = message.split(" ").slice(2).join(" ");
                sendMail(reciepient, writer, msg);
            } else {
                const reciepient = message.split(" ")[1];
                sendMail(reciepient, writer, "");
            }
        }
        var messagesSent = null;
        const snapshot = await getDocs(userRef);
        snapshot.forEach(doca => {
            const data = doca.data();
            if (data.name == writer) {
                messagesSent = data.messagesSent;
            }

        });
        if (messagesSent === null || messagesSent === undefined) { messagesSent = 1 } else { messagesSent += 1 };
        const userDocRef = doc(db, "connectedUsers", writer);
        await setDoc(userDocRef, {
            messagesSent: messagesSent
        }, { merge: true });
        if (writer !== "TellBot") {
            scheckInbox(username);
        }


        resetRoomIfAdmin(message, writer, message.split(" ")[1]);

    } catch (e) {
        console.error(e);
    }
}
/**
 * ANCHOR The action map
 * @type {{ [key: string]: (...args: unknown[]) => Promise<void> }}
 */
const actionsMap = {
    "message.jump": (async () => {
        document.getElementById("message-input").focus();
    }),
    "message.send.global": (async () => {
        sendMsg(document.getElementById("message-input").value, username);
    }),
    "profile.open.self": (async () => {
        if (document.getElementById("CharacterProfile").style.visibility == "visible") {
            document.getElementById("CharacterProfile").style.visibility = "hidden";
        } else {
            makeProfile(username);
            document.getElementById("CharacterProfile").style.visibility = "visible";
        }
        document.getElementById("closeProfile").focus();
    }),
    "profile.open": (
        /**
         * Open specified profile
         * @param {string} username 
         */
        async (username) => {
            if (document.getElementById("CharacterProfile").style.visibility == "visible") {
                document.getElementById("CharacterProfile").style.visibility = "hidden";
            } else {
                makeProfile(username);
                document.getElementById("CharacterProfile").style.visibility = "visible";
            }
            document.getElementById("closeProfile").focus();
        }
    )
};
async function addHotkeyListeners() { //load hotkeys from hotkeys.json and add event listeners
    const response = await fetch("hotkeys.json");
    var keybinds = await response.json();
    var actions = Object.keys(keybinds);
    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        const bind = keybinds[action];
        const binds = bind.split("+");
        if (binds.length > 3) {
            console.warn(`Keybind ${bind} for action ${action} has more than 3 keys, which is not supported.`);
            continue;
        }
        document.addEventListener('keydown', async function (event) {
            if ((!binds.includes("ctrl") || event.ctrlKey) && (!binds.includes("shift") || event.shiftKey) && (!binds.includes("alt") || event.altKey) && binds.includes(event.key.toLowerCase())) {
                event.preventDefault();
                let theActionThatWillBePerformed = actionsMap[action];
                if (theActionThatWillBePerformed === undefined || theActionThatWillBePerformed === null) {
                    console.warn(`Could not find action "${action}".`);
                } else {
                    await theActionThatWillBePerformed();
                }
            }
        });

    }

}
const allowedPingAll = config.keyroom.admin;
//#endregion
/**
 * Sends a tell message to a user. Tell messages are stored in the database and delivered when the user next checks their inbox. Users will be notified if they have messages in their inbox upon sending their first message after receiving a tell or reloading the page.
 * @param {string} message - the message to send
 * @param {string} writer - the person who sent the message
 * @param {string} reciepient - the person to recieve the message
 * @returns 
 */
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
async function sendXkcd(what) { //processor to send xkcds
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




// ANCHOR setUsername function
//#region setUsername function
var username;
async function setUsername() { //this function sets the username of a user upon loading in if none is stored in localStorage
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
async function validatePassword(username) {
    let snapshot = await getDocs(userRef);
    let passwordF = null;
    snapshot.forEach(doca => {
        const data = doca.data();
        if (data.name === username) {
            passwordF = data.password;

        }

    });

    console.log("validating password");
    if (passwordF !== null && passwordF !== undefined) {
        if (localStorage.getItem("password") && hasher(localStorage.getItem("password")) === passwordF) return true;
        let storedPassword = localStorage.getItem("password");
        let input = await Popup.quick("<span class='material-symbols-outlined'>vpn_key</span><br>Please enter your password.", "password");
        if (input && hasher(input) === passwordF) {
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
async function addRoomProcessor() {
    var roomName = await Popup.quick("Please enter the room name you'd like to join or create.", "text");
    if (roomName == null || roomName.trim() === "") {
        Popup.quick("<span class='material-symbols-outlined'>warning</span><br>Invalid room name.", "ok");
        return;
    }
    var roomsList = document.getElementById("roomsList");
    var newRoomLi = document.createElement("li");
    newRoomLi.classList.add("room");
    newRoomLi.id = `&${roomName.trim()}`;
    newRoomLi.innerHTML = `& ${roomName.trim()}`;
    newRoomLi.addEventListener("click", () => {
        switchRoom(`${"&" + roomName.trim()}`);
    })
    roomsList.append(newRoomLi);
    additionalRooms.push(newRoomLi.id);
    additionalRoomNames.push("& " + roomName.trim());
    localStorage.setItem("additionalRooms", JSON.stringify(additionalRoomNames));
    currentRoom = `&${roomName.trim()}`;
    switchRoom(currentRoom);
    document.documentElement.style.setProperty("--n-rooms", document.getElementById("roomsList").childElementCount - 1);

}

function areThereAnyPopupsThatAreNotCurrentlyHiddenAtTheTimeThisFunctionIsCalled() {
    for (let i = 0; i < Popup.popupList.length; i++) {
        if (Popup.popupList.at(i).shown()) {
            return true;
        }
    }
    return false;
}

function processKeydown(e) {
    if (e.keyCode == 13 && !areThereAnyPopupsThatAreNotCurrentlyHiddenAtTheTimeThisFunctionIsCalled()) {
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
//#region Youtube Sync
//it's best not to question this section. it exists. it works. just... don't question it.
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
//#endregion
const messagesEl = document.getElementById("messages");

function clearRoomBorders() {
    document.getElementById("&random").classList.remove('roomActive');
    document.getElementById("&xkcd").classList.remove('roomActive');
    document.getElementById("&spam").classList.remove('roomActive');
    document.getElementById("&general").classList.remove('roomActive');
    document.getElementById("/codeinject").classList.remove('roomActive');
    document.getElementById("&game").classList.remove('roomActive');
    document.getElementById("&music").classList.remove('roomActive');
    document.getElementById("&").classList.remove('roomActive');
    document.getElementById("&random").classList.add('room');
    document.getElementById("&xkcd").classList.add('room');
    document.getElementById("&spam").classList.add('room');
    document.getElementById("&general").classList.add('room');
    document.getElementById("/codeinject").classList.add('room');
    document.getElementById("&game").classList.add('room');
    document.getElementById("&").classList.add('room');
    document.getElementById("&music").classList.add('room');
    if (additionalRooms.length > 0) {
        additionalRooms.forEach(room => {
            document.getElementById(room).classList.remove('roomActive');
            document.getElementById(room).classList.add('room');
        });
    }
}
import { writeBatch } from "firebase/firestore";
async function addCustomCSSHandler(loadingFromStorage = false) {
    var css;
    if (!loadingFromStorage) {
        css = await Popup.quick("Please paste/enter your custom CSS below, or leave blank to cancel. We highly recommend writing the css in an external editor.", "textarea");
        if (css == null || css.trim() === "") {
            return;
        }
        localStorage.setItem("customCSS", css);
    } else if (localStorage.getItem("customCSS")) { css = localStorage.getItem("customCSS"); }
    var newStyles = document.createElement('style');
    newStyles.id = "customCSSStyles";
    newStyles.innerHTML = css;
    if (document.getElementById("customCSSStyles")) { document.getElementById("customCSSStyles").remove(); }
    if (css == null || css.trim() === "" || css === undefined) { return; }
    newStyles.innerHTML = css.replace(/;/g, ' !important;');
    document.head.appendChild(newStyles);
}
async function resetRoomIfAdmin(message, writer, room) { //function used to reset rooms. deleting a room's collection in firebase can also achieve this, as the room's collection will automatically be created again the next time a user sends a message to the room.
    try {
        const parts = message.trim().split(" ");
        const cmd = parts[0].toLowerCase();
        const targetRoom = room || parts[1] || currentRoom;

        if ((('&' + writer) === targetRoom || config.keyroom.admin.includes(writer)) && cmd === "!reset") {
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
/**
 * Creates a profile for the specified user in the CharacterProfile div.
 * @param {string} writer - the username of the profile to make
 */
async function makeProfile(writer) {
    var bio = "This user has not yet set a bio";
    var messagesSent = 0;
    const snapshot = await getDocs(userRef);
    snapshot.forEach(doca => {
        const data = doca.data();
        if (data.name == writer) {
            bio = data.bio;
            messagesSent = data.messagesSent || 0;
        }
    });
    if (bio == null || bio == undefined || bio.trim() === "") { bio = "This user has not yet set a bio"; }
    document.getElementById("yourBio").innerHTML = bio + "<br>" + `<br><b>Messages Sent:</b> ${messagesSent}`;
    if (document.getElementById("profileAvatar")) document.getElementById("profileAvatar").remove();
    document.getElementById("yourUsername").innerText = writer;
    let avatar = await createAvatar(false, writer);
    avatar.id = "profileAvatar";
    document.getElementById("CharacterProfile").append(avatar);
}
/**
 * Switch to the specified room, applying any message styling as necessary.
 * @param {string} room - the name of the room to switch to
 * @param {string} messageStyling - the name of the css theme to use for messages in this room. leave blank if there is none
 */
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
    let the_room = document.getElementById(room);
    if (!the_room) {
        //Popup.err("Switching rooms failed");
        //This smhow only happens when you (succesfully) switch to your private room so I'm commenting 
    } else {
        the_room.classList.add('roomActive');
        the_room.classList.remove('room');
    }
}
async function onload() { //this function runs when the page loads and handles all setup.
    //#region Onload hell

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
    if (localStorage.getItem("additionalRooms")) {
        const storedRooms = JSON.parse(localStorage.getItem("additionalRooms"));
        additionalRooms = [];
        additionalRoomNames = [];
        for (var i = 0; i < storedRooms.length; i++) {
            let roomName = storedRooms[i].substring(2).trim();
            var docsLink = document.getElementById("&");
            var newRoomLi = document.createElement("li");
            newRoomLi.classList.add("room");
            newRoomLi.id = `&${roomName}`;
            newRoomLi.innerHTML = `& ${roomName}`;
            docsLink.insertAdjacentElement("beforebegin", newRoomLi);
            additionalRooms.push(newRoomLi.id);
            newRoomLi.addEventListener("click", () => {
                const room = `&${roomName}`;
                switchRoom(room);
                console.log("switched to room: " + room);
            });
            additionalRoomNames.push(`& ${roomName}`);
        }
    }
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
            document.head.querySelector('title').innerText = `${config.keyroom.pageTitle} - ${currentRoom}`;
        }
    });
    console.log(username);
    if (username != "Key" && username != "Leif") {
        console.log("Username is NOT Key or Leif");
    } else {
        console.log("Username IS Key or Leif");
        console.log("Welcome, " + username + "!");
    }
    makeProfile(username);
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
    addHotkeyListeners();
    //#region Default room switching
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
    document.getElementById("newroom").addEventListener("click", async () => {
        await addRoomProcessor();
        document.documentElement.style.setProperty("--n-rooms", document.getElementById("roomsList").childElementCount - 1);
    })
    document.getElementById("deleteRooms").addEventListener("click", () => {
        removeRoom();
        document.documentElement.style.setProperty("--n-rooms", document.getElementById("roomsList").childElementCount - 1);
    });
    document.getElementById("customCSS").addEventListener("click", () => {
        addCustomCSSHandler();
    })
    document.getElementById("removeCustomCSS").addEventListener("click", () => {
        if (document.getElementById("customCSSStyles")) {
            document.getElementById("customCSSStyles").remove();
            localStorage.removeItem("customCSS");
            Popup.quick("<span class='material-symbols-outlined'>check_circle</span><br>Custom CSS removed.", "ok");
        } else {
            Popup.quick("<span class='material-symbols-outlined'>warning</span><br>No custom CSS to remove.", "ok");
        }
    });
    document.getElementById("&music").addEventListener("click", () => {
        switchRoom("&music", "music");
        loadYouTubeVideo('YsdaAQzdmpo');
        manageMusic();
        console.log("loading");
    })
    document.getElementById("&").addEventListener("click", () => {
        switchRoom(`&${username}`);
    })
    document.getElementById("you").addEventListener("click", () => {
        document.getElementById("CharacterProfile").style.visibility = "visible";
        makeProfile(username);
    })
    document.getElementById("closeProfile").addEventListener("click", () => {
        document.getElementById("CharacterProfile").style.visibility = "hidden";
    });

    if (localStorage.getItem("lastRoom")) {
        var oldRoom = localStorage.getItem("lastRoom");
        // Set room to &general if it is /codeinject to prevent
        // a malicious codeinject user from modifying the localStorage
        // key.
        // Note: /codeinject should never be set as the oldRoom regularly.
        if (oldRoom == "/codeinject") {
            console.log("Switching room back to general, /codeinject on startup not allowed.");
            oldRoom = "&general";
        }
        listenToRoom(oldRoom);
        document.getElementById(oldRoom).classList.add('roomActive');
        document.getElementById(oldRoom).classList.remove('room');
    } else {
        listenToRoom('&general');
        document.getElementById("&general").classList.add('roomActive');
        document.getElementById("&general").classList.remove('room');
    };
    document.documentElement.style.setProperty("--n-rooms", document.getElementById("roomsList").childElementCount - 1);
    await addCustomCSSHandler(true);
    document.documentElement.style.setProperty("--n-rooms", document.getElementById("roomsList").childElementCount - 1);
    //#endregion

}
async function removeRoom() {
    var roomToRemove = await Popup.quick("Please enter the name of the room you wish to delete (do not include the & symbol).", "text");
    var addRooms = localStorage.getItem("additionalRooms");
    roomToRemove = "& " + roomToRemove.trim();
    addRooms = JSON.parse(addRooms);
    let yesIBelieveIDidRemoveARoomToday = false;
    for (var i = 0; i < addRooms.length; i++) {
        if (addRooms[i] == roomToRemove) {
            addRooms.splice(i, 1);
            localStorage.setItem("additionalRooms", JSON.stringify(addRooms));
            additionalRooms.splice(i, 1);
            additionalRoomNames.splice(i, 1);
            Popup.quick(`<span class='material-symbols-outlined'>check_circle</span><br>Room ${roomToRemove} has been removed.`, "ok");
            yesIBelieveIDidRemoveARoomToday = true;
        }
    }
    document.documentElement.style.setProperty("--n-rooms", document.getElementById("roomsList").childElementCount - 1);
    if (yesIBelieveIDidRemoveARoomToday) {
        localStorage.setItem("lastRoom", "&general");
        document.location.reload();
    } else {
        Popup.err(`No room found with the specified name ${roomToRemove}`);
    }
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
    //#region The game I swear is going to exist sometime
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
    var AvailableClasses = gameData.Classes;
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
        var cClass = race.trim().toLowerCase();
        cClass = cClass.charAt(0).toUpperCase() + cClass.slice(1);
        var isClass = (function () { for (var i = 0; i < AvailableClasses.length; i++) { if (AvailableClasses[i].name == cClass) { return true } else if (i + 1 == AvailableClasses.length) { return false; } } }())
        if (!isClass) {
            while (!isClass) {
                var SelClass = await Popup.quick(`Please input a valid class. Your options are ${classOptions}. To view more information about a class, type it's name into the below box.`, "text");
                var rRace = SelClass.trim().toLowerCase();
                rRace = rRace.charAt(0).toUpperCase() + rRace.slice(1);
                isRace = (function () { for (var i = 0; i < AvailableRaces.length; i++) { if (AvailableRaces[i].name == rRace) { return true } else if (i + 1 == AvailableRaces.length) { return false; } } }());
                if (isRace) { race = rRace };
            }
        }
    }

}
onload();
