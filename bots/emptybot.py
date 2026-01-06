import firebase_admin  
from firebase_admin import credentials 
from firebase_admin import firestore 
import secrets
import time
from google.cloud.firestore import SERVER_TIMESTAMP
botname = "DefaultBot" #your bot will display this name when sending messages.
cred = credentials.Certificate("yourcredentialsfilename.json") #replace the filename with the path to your firebase private key file
#the below code in the region is standard setup code and typically does not need to be modified
#region setup code 
firebase_admin.initialize_app(cred)
db = firestore.client()
listenersFirst = {}
def getRoomMessages(room): #get all messages from room and return them in order
    roomRef = db.collection(room)
    return roomRef.order_by('timestamp').stream()
def sendMsg(message, color, room, username=botname): #send a message to the specified room. you can optionally specify a different username.
    roomRef = db.collection(room)
    allroomref = db.collection("allMsgs")
    roomRef.add({
        'text': message, #the text of the message
        'writer': username, #this defaults to the bot's name
        'color': color,
        'timestamp': SERVER_TIMESTAMP,
        'iden': secrets.token_hex(16) #bot iden generation varies slightly from normal keyroom iden generation, but functions the same.
    })
    allroomref.add({ #just like the base keyroom js does, we add a duplicate message to allMsgs for monitoring. 
        'text': message, #if you do not want other bots to react to your bot's messages, simply remove this block.
        'writer': username,
        'color': color,
        'timestamp': SERVER_TIMESTAMP,
        'iden': secrets.token_hex(16), 
        'room': room
    })
def on_snapshot(room): #this runs whenever the database is modified whatsoever
    def callback(doc_snapshot, changes, read_time):
        global listenersFirst #when the listener is first created, it will fire for all existing messages. This flag ignores those first events.
        if listenersFirst.get(room, False):
            listenersFirst[room] = False
            return
        for change in changes:
            if change.type.name == 'ADDED': #Since it monitors allmsgs, the only types we should be getting are ADDED events. 
                doc = change.document.to_dict() #However, it's better to be safe, as if for some reason a modification for deletion 
                writer = doc.get('writer', 'Unknown') #occured and we tried to process it as if it was added, the bot would crash.
                roomIn = doc.get('room', '&general')
                if writer == botname: #we don't want the bot to respond to its own messages, so we skip those.
                    continue
                text = doc.get('text', '')
                onNewMessage(text, writer, doc.get('timestamp'), roomIn)
                print(f"{text}")
    return callback
def listenToRoom(room): #this sets up the listener on the specified room. 
    listenersFirst[room] = True
    roomRef = db.collection(room)
    listener = roomRef.on_snapshot(on_snapshot(room))
    return listener #this returns the listener object, which can be unsubscribed later to stop listening.
listener = listenToRoom("allMsgs") #you can modify this to listen to a specific room if desired. 
                                   #"allMsgs" is a collection that gets a duplicate message of all 
                                   #messages sent alongside the name of the room they were sent in.
#endregion setup code
def onNewMessage(message, writer, timestamp, roomIn): #this function is called whenever a new message is received. 
    pass #You can add your bot's logic here. See the examples folder for examples of bot actions.
try: #this infinite loop keeps the bot running. stop it with ctrl+c.
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nBot canceled.")
    listener.unsubscribe() #make sure to unsubscribe the listener before the program ends.
    print("Done!")