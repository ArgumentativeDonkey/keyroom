export const config = {
    "firebase": {
        "apiKey": "yourFirebaseAPIKey",
        "authDomain": "yourFirebaseAuthDomain",
        "databaseURL": "firebaseDatabaseURL",
        "projectId": "firebaseProjectId",
        "storageBucket": "firebaseStorageBucket",
        "messagingSenderId": "yourFirebaseMessagingSenderId",
        "appId": "yourFirebaseAppId",
        "measurementId": "yourFirebaseMeasurementId"
    },
    "emailJs": {
        "enabled": false, //enable this only if you plan to use the summon feature
        "key": "yourEmailJSKey",
        "serviceId": "yourEmailJSServiceId",
        "templateId": "yourEmailJSTemplateId",
        "summonCooldown": 360
    },
    "keyroom": {
        "pageTitle": "Keyroom Chat", //this will be your webpage title
        "timezone": "America/Denver", //time zone of your chatroom
        "admin": ["Array of usernames with admin permissions"] //example: ["User1", "User2"]. These users can ping all and reset rooms.
    }

}