const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();



// https on request
//needs send function
//exports.randomNumber = functions.https.onRequest((request, response) => {
//  const number = Math.round(Math.random() * 100);
//  console.log(number);
//  response.send(number.toString());
//})

// https callable functions
//uses return function
//exports.sayHello = functions.https.onCall((data, context) => {
//  return 'Hello Randy';
//})

// auth trigger (new user signup)
// exports.newUserSignup = functions.auth.user().onCreate(user => {
//   admin.firestore().collection('users').doc('new_user').set({
//     email: user.email,
//   })
// });

// Delete user
//exports.userDeleted = functions.auth.user().onDelete(user => {
//  console.log('user deleted', user.email, user.uid);
//});

// Join trip
exports.joinTrip = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('trips').doc(data.docID).update({
  accessUsers: admin.firestore.FieldValue.arrayUnion(data.uid)
  });
});

// Add member
exports.addMember = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const profileRef = await admin.firestore().collection('userPublicProfile').doc(data.uid).get();
  if(!profileRef.exists){
  return 'Error'
  }
  const ref = profileRef.data();

  return admin.firestore().collection('trips').doc(data.docID).collection('Members').doc(data.uid).set({
  displayName: ref.displayName,
  firstName: ref.firstName,
  lastName: ref.lastName,
  uid: ref.uid,
  urlToImage: ref.urlToImage,
  });
});


// Leave Trip
exports.leaveTrip = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('trips').doc(data.docID).update({
  accessUsers: admin.firestore.FieldValue.arrayRemove(data.uid)
  });

});

// Remove Member
exports.removeMember = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('trips').doc(data.docID).collection('Members').doc(data.uid).delete()
});

// Remove lodging
exports.removeLodging = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }

  return admin.firestore().collection('lodging').doc(data.docID).collection('lodging').doc(data.fieldID).delete()
});

// Remove Activity
exports.removeActivity = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('activities').doc(data.docID).collection('activity').doc(data.fieldID).delete()
});

// Add user to favorite list
exports.addFavoriteToTrip = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('trips').doc(data.docID).update({
  favorite: admin.firestore.FieldValue.arrayUnion(data.uid)
  });
});

// Remove user from favorite list
exports.removeFavoriteFromTrip = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('trips').doc(data.docID).update({
  favorite: admin.firestore.FieldValue.arrayRemove(data.uid)
  });
});

//Add vote for activity
exports.addVoteToActivity = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('activities').doc(data.docID).collection('activity').doc(data.fieldID).update({
  vote: admin.firestore.FieldValue.increment(1)
  });
});

//Add user uid to list of voters
exports.addVoterToActivity = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('activities').doc(data.docID).collection('activity').doc(data.fieldID).update({
  voters: admin.firestore.FieldValue.arrayUnion(data.uid)
  });
});

//Remove vote for activity
exports.removeVoteFromActivity = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('activities').doc(data.docID).collection('activity').doc(data.fieldID).update({
  vote: admin.firestore.FieldValue.increment(-1)
  });
});

//Remove user uid to list of voters
exports.removeVoterFromActivity = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('activities').doc(data.docID).collection('activity').doc(data.fieldID).update({
  voters: admin.firestore.FieldValue.arrayRemove(data.uid)
  }).then(() => console.log('Remove succeeded'));
});


//Add vote for Lodging
exports.addVoteToLodging = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('lodging').doc(data.docID).collection('lodging').doc(data.fieldID).update({
  vote: admin.firestore.FieldValue.increment(1)
  });
});

//Add user uid to list of voters
exports.addVoterToLodging = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('lodging').doc(data.docID).collection('lodging').doc(data.fieldID).update({
  voters: admin.firestore.FieldValue.arrayUnion(data.uid)
  });
});

//Remove vote for activity
exports.removeVoteFromLodging = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('lodging').doc(data.docID).collection('lodging').doc(data.fieldID).update({
  vote: admin.firestore.FieldValue.increment(-1)
  });
});

//Remove user uid to list of voters
exports.removeVoterFromLodging = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  return admin.firestore().collection('lodging').doc(data.docID).collection('lodging').doc(data.fieldID).update({
  voters: admin.firestore.FieldValue.arrayRemove(data.uid)
  });
});










