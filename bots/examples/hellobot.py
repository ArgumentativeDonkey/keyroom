import firebase_admin  
from firebase_admin import credentials 
from firebase_admin import firestore 
import secrets
import threading
import time
from google.cloud.firestore import SERVER_TIMESTAMP
botname = "HelloBot"
cred = credentials.Certificate("yourcredentialsfilename.json")
#region setup code
firebase_admin.initialize_app(cred)
db = firestore.client()
listenersFirst = {}
def getRoomMessages(room):
    roomRef = db.collection(room)
    return roomRef.order_by('timestamp').stream()
def sendMsg(message, color, room, username=botname):
    roomRef = db.collection(room)
    allroomref = db.collection("allMsgs")
    roomRef.add({
        'text': message,
        'writer': username,
        'color': color,
        'timestamp': SERVER_TIMESTAMP,
        'iden': secrets.token_hex(16)
    })
    allroomref.add({
        'text': message,
        'writer': username,
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
    return callback
def listenToRoom(room):
    listenersFirst[room] = True
    roomRef = db.collection(room)
    listener = roomRef.on_snapshot(on_snapshot(room))
    return listener
listener = listenToRoom("allMsgs")
#endregion setup code
def onNewMessage(message, writer, timestamp, roomIn):
    if "hello" in message.lower():
        sendMsg(f"Hi!", "#FF5733", "&general")
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nBot canceled.")
    listener.unsubscribe()
    print("Done!")