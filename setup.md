The following will walk you through setting up a private keyroom instance.

## Creating a Firebase Project


1. If you do not already have a Google account, create one.  
2. Sign into your Google account at [https://firebase.google.com/](https://firebase.google.com/) then hit "Go to Console" in the upper right.   
3. Create a new Firebase project and follow the wizard until you have successfully created a blank Firebase project.  
4. Navigate to Build \-\> Firestore Database \-\> Create Database then follow the instructions to create an empty database. Make sure the database ruleset is set to allow all read & writes, as Keyroom does not use any authentication methods. The ruleset should look like this:   
   ```
   rules_version = '2';  
   service cloud.firestore {  
      match /databases/{database}/documents {  
         match /{document=**} { 
            allow read, write: if true;  
         }  
      }
   }
   ```
     
   

## Cloning the Repository and Setting Up Firebase


1. If you do not have node and npm installed, follow the instructions [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) to do so:   
2. In a directory of your choice, enter the following command into your command line: `git clone https://github.com/ArgumentativeDonkey/keyroom.git`.   
3. If you have not installed Firebase on your computer, do so with `npm install -g firebase-tools`.   
4. Login to firebase with `firebase login`   
5. Cd into the keyroom directory (`cd keyroom` from the directory you cloned the Git into)   
6. Type `firebase init`.   
7. When prompted, select the features Firestore and Hosting, then select "Use an Existing Project".   
8. You should see the name of your previously created project. Select it.   
9. You'll be prompted on where you want certain files to be — hit enter without typing on all of these prompts to make Firebase automatically select the already created files from the Git.  
10.  Say Y when asked if you wish to configure your project as a single page app, unless you plan on adding additional pages.   
11. Optionally, you can set up a Git repo for your project, but if you are not planning on modifying the code significantly, this is not typically necessary, so in most user cases, reply n to this prompt.   
12. Reply N to all prompts asking if you wish to overwrite any files.

## Configuring Your Instance


1. Rename configexample.js to config.js, then replace the information in the "Firebase" section with the information found in settings \-\> general in the Firebase console.   
2. Replace the name field with the name you wish to be displayed as the title of the chatroom’s webpage.  
3. Once all the information is replaced in config.js, your Keyroom instance should be able to launch. To test this, type `firebase deploy` into your terminal while in the keyroom folder.   
4. Follow the link it outputs after the process completes and verify that the chatroom is working correctly.

