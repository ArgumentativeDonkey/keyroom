# Keyroom Bots
Bots in Keyroom are a dynamic, modular way of adding functions to your chatroom. Unlike the base chatroom, bots are self-hosted and use Firebase's python integration in order to monitor, edit, add, and delete messages in your rooms. These bots allow you to gain backend functionality without needing to pay for Google's backend servers.
## Creating a Bot
To create a bot for your chatroom, follow the below steps:
1. Open your Firebase dashboard and navigate to your project's settings then to the Service Accounts tab.
2. Hit generate new private key, which should then download a json file.
3. Move this json file to the `keyroom/bots` directory of your chatroom's source code
4. Replace the filename in the line of `emptybot.py` `cred = credentials.Certificate("yourcredentialsfilename.json")` with the filename of your private key's json file. This file will act as a template for all bots active in your chatroom.
5. Duplicate emptybot.py, give the file a new name appropriate to the bot you wish to create, then change the variable `Botname` to the name of your bot. If your bot sends messages, this name will be displayed as its username.
## Bot Syntax
As mentioned previously, Keyroom Bots make use of Firebase's native Python integration. Full documentation is available [here](https://firebase.google.com/docs/reference/admin#python).

Additionally, some functions have already been set up in the basic bot python script, as follows:

`def getRoomMessages(room)` — returns a reference object containing all messages in the requested room.

`def sendMsg(message, color, room)` — sends a message in room `room`. The username of the message will be the bot's name that was previously set.

`def onNewMessage(message, writer, timestamp, roomIn)` — this function is kept empty by default. It triggers whenever a message is sent anywhere in the Keyroom and contains the message, writer, timestamp, and room of the message. The majority of bot code should be handled here.

## Running Bots
To run a bot on your computer, do the following:
1. In the /keyroom dir run, `source venv/bin/activate` to enter the bot virtual environment.
2. Run `pip install -r requirements.txt` to install the required packages the bots need to run.
3. Run `cd bots` to enter the bots directory.
4. Run `python3 botname.py` (replace the filename with the name of your bot's python filename) to begin running your bot. To run multiple bots at a time, open multiple terminal tabs and repeat the process if necessary.
