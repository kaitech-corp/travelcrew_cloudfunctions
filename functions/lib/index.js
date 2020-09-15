
const functions = require("firebase-functions");
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
// exports.helloWorld = functions.https.onRequest((request, response) => {
//     response.send("Testing Cloudbased Functions!");
//     console.log('Testing');
// });
exports.randomNumber = functions.https.onRequest((request, response) => {
  const number = Math.round(Math.random() * 100);
  response.send(number.toString());
})
//# sourceMappingURL=index.js.map
