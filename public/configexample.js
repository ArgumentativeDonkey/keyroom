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
        "enabled": false,
        "key": "yourEmailJSKey — only fill these in if you need the summoning feature",
        "serviceId": "yourEmailJSServiceId",
        "templateId": "yourEmailJSTemplateId",
        "summonCooldown": 360
    },
    "keyroom": {
        "pageTitle": "Keyroom Chat",
        "timezone": "America/Denver",
        "allowedPingAll": ["Array of usernames allowed to ping everyone"]
    }

}