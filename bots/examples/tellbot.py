import firebase_admin  
from firebase_admin import credentials 
from firebase_admin import firestore 
import secrets
import time
from google.cloud.firestore import SERVER_TIMESTAMP
from google.cloud.firestore import FieldFilter
botname = "MessageBot"
cred = credentials.Certificate("yourcredentialsfilename.json")
#region setup code
firebase_admin.initialize_app(cred)
db = firestore.client()
listenersFirst = {}
def getRoomMessages(room):
    roomRef = db.collection(room)
    return roomRef.order_by('timestamp').stream()
def sendMsg(message, color, room):
    roomRef = db.collection(room)
    allroomref = db.collection("allMsgs")
    roomRef.add({
        'text': message,
        'writer': botname,
        'color': color,
        'timestamp': SERVER_TIMESTAMP,
        'iden': secrets.token_hex(16)
    })
    allroomref.add({
        'text': message,
        'writer': botname,
        'color': color,
        'timestamp': SERVER_TIMESTAMP,
        'iden': secrets.token_hex(16),
        'room': room
    })
def on_snapshot(room):
    def callback(doc_snapshot, changes, read_time):
        global listenersFirst
        if listenersFirst.get(room, False):
            listenersFirst[room] = False
            return
        for change in changes:
            if change.type.name == 'ADDED':
                doc = change.document.to_dict()
                writer = doc.get('writer', 'Unknown')
                roomIn = doc.get('room', '&general')
                if writer == botname:
                    continue
                text = doc.get('text', '')
                onNewMessage(text, writer, doc.get('timestamp'), roomIn)
                print(f"{text}")
            elif change.type.name == 'MODIFIED':
                doc = change.document.to_dict()
                #print(f"[EDITED] {doc.get('writer', 'Unknown')}: {doc.get('text', '')}")
                pass
            elif change.type.name == 'REMOVED':
                #print(f"[DELETED] Message removed")
                pass
    return callback
def listenToRoom(room):
    listenersFirst[room] = True
    roomRef = db.collection(room)
    listener = roomRef.on_snapshot(on_snapshot(room))
    return listener
listener = listenToRoom("allMsgs")
#endregion setup code
def onNewMessage(message, writer, timestamp, roomIn):
    if (message.split()[0].lower() == "!message") and (len(message.split()) >= 3):
        target = message.split()[1]
        msg = " ".join(message.split()[2:])
        if (target == writer):
            sendMsg(f"Error: you cannot message yourself.", "#FFFFFF", "&general")
            return
        db.collection("dmMsgs").add({
            'text': msg,
            'writer': writer,
            'recipient': target,
            'color': '#6437c4',
            'timestamp': SERVER_TIMESTAMP,
        })
        sendMsg(f"Will tell {target}!", "#00FF00", roomIn)
    elif (message.split()[0].lower() == "!checkmsgs"):
        print(f"Checking messages for {writer}")
        msgs = db.collection("dmMsgs").where(filter=FieldFilter('recipient', '==', writer)).stream()
        count = 0
        for msg in msgs:
            print(msg)
            msgDict = msg.to_dict()
            sendMsg(f"From {msgDict['writer']}: {msgDict['text']}", "#FFFF00", roomIn)
            db.collection("dmMsgs").document(msg.id).delete()
            count += 1
        if count == 0:
            sendMsg(f"No new messages.", "#FFFFFF", roomIn)
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nBot canceled.")
    listener.unsubscribe()
    print("Done!")