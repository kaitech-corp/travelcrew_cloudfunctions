const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const fcm = admin.messaging();

exports.addToWaitList = functions.https.onRequest((req, res) => {
  const ref = admin.database().ref('waitList');
  let message = req.query.message || req.body.message;
//  if(message !== null){
    ref.child(admin.database.ServerValue.TIMESTAMP).set("message");
//  }
});

// auth trigger (new user signup)
 exports.newUserSignup = functions.firestore.document('users/{userId}').onCreate(async (snap, context) => {

    try {
        return admin.firestore().collection('notifications').doc(context.params.userId).collection('notifications').doc().set({
           documentID: '',
           fieldID: '',
           message: 'Welcome to Travel Crew! Get started now and create your first trip!',
           timestamp: admin.firestore.FieldValue.serverTimestamp(),
           type: 'Welcome',
           uid: context.params.userId,
       });
   } catch(e){
        return console.log(e);
   }
 });


//  Add Timestamp
 exports.newUserSignupTimeStamp = functions.firestore.document('users/{userId}').onCreate(async (snap, context) => {

    const docID = 'VowaPXPxF2gTRZPUxPIp';
    const uid = context.params.userId;
    addMemberAfterJoin(docID, uid);
    admin.firestore().collection('trips').doc(docID).update({
        accessUsers: admin.firestore.FieldValue.arrayUnion(uid)
    });

   return admin.firestore().collection('users').doc(context.params.userId).update({
       dateJoinedTimeStamp: admin.firestore.FieldValue.serverTimestamp(),
   });
 });
// Delete account
//exports.deleteAccount = functions.https.onCall(async (data, context) =>{
//     if(!context.auth){
//        throw new functions.https.HttpsError(
//          'unauthenticated',
//          'Unable to perform action.'
//        );
//      }
//    const uid = data.uid;
////    const deleteNotifications
////    const deletePublicProfile
////    const deleteUserProfile
//// Delete user
//    return functions.auth.user().onDelete(user => {
//      console.log('user deleted', user.email, user.uid);
//    });
//});


// Give Feedback
exports.giveFeedback = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const key  = admin.firestore().collection('feedback').doc().id;
  return admin.firestore().collection('feedback').doc(key).set({
  fieldID: key,
  message: data.message,
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  uid: context.auth.uid,
  });
 });

 // Report User
 exports.reportUser = functions.https.onCall((data, context) =>{
   if(!context.auth){
     throw new functions.https.HttpsError(
       'unauthenticated',
       'Unable to perform action.'
     );
   }
   return admin.firestore().collection('reports').doc(data.offenderID).collection(data.docID).doc(data.ownerID).set({
   collection: data.collection,
   docID: data.docID,
   offenderID: data.offenderID,
   offense: data.offense,
   ownerID: data.ownerID,
   type: data.type,
   urlToImage: data.urlToImage,
   timestamp: admin.firestore.FieldValue.serverTimestamp()
   });
  });

// Block user from trips
exports.blockUser = functions.https.onCall( async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }

  const blockedUserID = data.blockedUserID
  const uid = context.auth.uid;
  const snapshot = await admin.firestore().collection('trips').where('ownerID', '==', uid).get();
  const snapshotPrivate = await admin.firestore().collection('privateTrips').where('ownerID', '==', uid).get();

  const updateProfile = await admin.firestore().collection('userPublicProfile').doc(uid).update({
  blockedList: admin.firestore.FieldValue.arrayUnion(blockedUserID),

  });
  const updateBlockedUserProfile = await admin.firestore().collection('userPublicProfile').doc(blockedUserID).update({
  blockedList: admin.firestore.FieldValue.arrayUnion(uid),
  });

  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  try {
  const removeUser = await admin.firestore().collection('trips');
  snapshot.forEach(doc => {
    removeUser.doc(doc.id).update({
      accessUsers: admin.firestore.FieldValue.arrayRemove(blockedUserID)
      });
    removeUser.doc(doc.id).collection('Members').doc(blockedUserID).delete();
  });
  } catch (e){
  console.log(e)
  }
    try {
    const removeUser = await admin.firestore().collection('privateTrips');
    snapshotPrivate.forEach(doc => {
      removeUser.doc(doc.id).update({
        accessUsers: admin.firestore.FieldValue.arrayRemove(blockedUserID)
        });
      removeUser.doc(doc.id).collection('Members').doc(blockedUserID).delete();
    });
    } catch (e){
    console.log(e)
    }
});

// Un-Block user
exports.unBlockUser = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }

  const blockedUserID = data.blockedUserID
  const uid = context.auth.uid;

  const updateProfile = await admin.firestore().collection('userPublicProfile').doc(uid).update({
  blockedList: admin.firestore.FieldValue.arrayRemove(blockedUserID),

  });
  const updateBlockedUserProfile = await admin.firestore().collection('userPublicProfile').doc(blockedUserID).update({
  blockedList: admin.firestore.FieldValue.arrayRemove(uid),
  });
  return 'complete';
});

// Join trip
exports.joinTrip = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const docID = data.docID;
  const uid = data.ownerID;
  if(data.ispublic){
    addMemberAfterJoin(docID, uid)
      return admin.firestore().collection('trips').doc(docID).update({
        accessUsers: admin.firestore.FieldValue.arrayUnion(uid)
    });
  } else {
        return addToPrivateTrip(docID,uid);
    }
});
  async function addToPrivateTrip(docID, uid){
  const func =  await admin.firestore().collection('privateTrips').doc(docID).update({
           accessUsers: admin.firestore.FieldValue.arrayUnion(uid)
           });
           addPrivateMemberAfterJoin(docID, uid)
    return func;
}

async function addMemberAfterJoin(docID, uid){
     const profileRef = await admin.firestore().collection('userPublicProfile').doc(uid).get();
     if(!profileRef.exists){
     return 'Error'
     }
     const ref = profileRef.data();

     return admin.firestore().collection('trips').doc(docID).collection('Members').doc(uid).set({
     displayName: ref.displayName,
     firstName: ref.firstName,
     lastName: ref.lastName,
     uid: ref.uid,
     urlToImage: ref.urlToImage,
     });
}
async function addPrivateMemberAfterJoin(docID, uid){
     const profileRef = await admin.firestore().collection('userPublicProfile').doc(uid).get();
     if(!profileRef.exists){
     return 'Error'
     }
     const ref = profileRef.data();

     return admin.firestore().collection('privateTrips').doc(docID).collection('Members').doc(uid).set({
     displayName: ref.displayName,
     firstName: ref.firstName,
     lastName: ref.lastName,
     uid: ref.uid,
     urlToImage: ref.urlToImage,
     });
}

// Join trip invite
exports.joinTripInvite = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const docID = data.docID;
  const uid = data.uidInvitee;
  if(data.ispublic){
      return admin.firestore().collection('trips').doc(docID).update({
        accessUsers: admin.firestore.FieldValue.arrayUnion(uid)
    });
  } else {
        return addToPrivateTrip(docID,uid);
    }
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
// Add private member
   exports.addPrivateMember = functions.https.onCall(async (data, context) =>{
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

     return admin.firestore().collection('privateTrips').doc(data.docID).collection('Members').doc(data.uid).set({
     displayName: ref.displayName,
     firstName: ref.firstName,
     lastName: ref.lastName,
     uid: ref.uid,
     urlToImage: ref.urlToImage,
     });
   });

// Remove member from trip
exports.leaveAndRemoveMemberFromTrip = functions.https.onCall(async (data, context) => {
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const userUID = data.userUID;
  const tripDocID = data.tripDocID;
  const ispublic = data.ispublic;

  if(ispublic){
  const removeUser = await admin.firestore().collection('trips').doc(tripDocID).collection('Members').doc(userUID).delete();
  return admin.firestore().collection('trips').doc(tripDocID).update({
    accessUsers: admin.firestore.FieldValue.arrayRemove(userUID)
    });
  } else {
  const removeUser = await admin.firestore().collection('privateTrips').doc(tripDocID).collection('Members').doc(userUID).delete();
  return admin.firestore().collection('privateTrips').doc(tripDocID).update({
    accessUsers: admin.firestore.FieldValue.arrayRemove(userUID)
    });
  }
});

// Delete Trip
exports.deleteTrip = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }

  const ref = admin.firestore();
  const tripDocID = data.tripDocID;
  const uid = context.auth.uid;
  const ispublic = data.ispublic;

  const storage = admin.storage();
  const imageRef = storage.bucket().file('trips/'+ tripDocID);

  try{await imageRef.delete();}
  catch(e){console.log(e)}

  try{await deleteCollection(ref, tripDocID, 5);}
  catch(e){console.log(e)}

  try {const deleteLodging = await ref.collection('lodging').doc(tripDocID).delete();}
  catch(e){console.log(e);}

  try {const deleteActivities = await ref.collection('activities').doc(tripDocID).delete();}
  catch(e){console.log(e);}

  try {const deleteChat = await ref.collection('chat').doc(tripDocID).delete();}
  catch(e){console.log(e);}

  try {const deleteBringList = await ref.collection('bringList').doc(tripDocID).delete();}
  catch(e){console.log(e);}

  try {const deleteNeedList = await ref.collection('needList').doc(tripDocID).delete();}
  catch(e){console.log(e);}

  try {  if(ispublic){
    const deleteTripPublic = await ref.collection('trips').doc(tripDocID).delete();
  } else {
    const deleteTripPrivate = await ref.collection('privateTrips').doc(tripDocID).delete();
  }
  } catch(e){console.log(e);}

});

async function deleteCollection(db, docID, batchSize) {
  const collectionRef = db.collection('trips').doc(docID).collection('Members');
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

//Remove trip from user trip list
exports.deleteTripID = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const ref = admin.firestore();
  const tripDocID = data.tripDocID;
  const uid = context.auth.uid;

  return ref.collection('users').doc(uid).update({
    trips: admin.firestore.FieldValue.arrayRemove(tripDocID)
    })
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
exports.addFavoriteTrip = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const uid = context.auth.uid;
  return admin.firestore().collection('trips').doc(data.docID).update({
  favorite: admin.firestore.FieldValue.arrayUnion(uid)
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

//Follow a user
    // Add user ID to current user's followers list.
    // Add current user's ID to user's following list
exports.followUser = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const uid = context.auth.uid;
   const add1 = await admin.firestore().collection('userPublicProfile').doc(data.userUID).update({
  following: admin.firestore.FieldValue.arrayUnion(uid)
  });
  const add2 = await admin.firestore().collection('userPublicProfile').doc(uid).update({
    followers: admin.firestore.FieldValue.arrayUnion(data.userUID)
    });
    return 'Complete';
});

// Follow back
exports.followBack = functions.https.onCall(async(data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
    const uid = context.auth.uid;
    const userUID = data.userUID;
     const add1 = await admin.firestore().collection('userPublicProfile').doc(uid).update({
    following: admin.firestore.FieldValue.arrayUnion(userUID)
    });
    const add2 = await admin.firestore().collection('userPublicProfile').doc(userUID).update({
      followers: admin.firestore.FieldValue.arrayUnion(uid)
      });
      return 'Complete';
});
//Un-Follow a user
    // Remove user ID from current user following list.
    // Remove current user ID from user's followers list.
exports.unFollowUser = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const uid = context.auth.uid;
   admin.firestore().collection('userPublicProfile').doc(uid).update({
  following: admin.firestore.FieldValue.arrayRemove(data.userUID)
  });
  admin.firestore().collection('userPublicProfile').doc(data.userUID).update({
    followers: admin.firestore.FieldValue.arrayRemove(uid)
    });
    return 'Complete';
});

  //Add items the user is Bringing
exports.addItemToBringingList = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const key = await admin.firestore().collection('bringList').doc().id;

  return admin.firestore().collection('bringList').doc(data.tripDocID).collection('Items').doc(key).set({
  item: data.item,
  displayName: data.displayName,
  documentID: key,
  type: data.type,
  });
});

 //Remove item from Bring list
exports.removeItemFromBringingList = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }

  return admin.firestore().collection('bringList').doc(data.tripDocID).collection('Items').doc(data.documentID).delete();
});

  //Add items the user needs
exports.addItemToNeedList = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const key = await admin.firestore().collection('needList').doc().id;

  return admin.firestore().collection('needList').doc(data.tripDocID).collection('Items').doc(key).set({
  item: data.item,
  displayName: data.displayName,
  documentID: key,
  type: data.type,
  });
});

 //Remove item from Need list
exports.removeItemFromNeedList = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }

  return admin.firestore().collection('needList').doc(data.tripDocID).collection('Items').doc(data.documentID).delete();
});

  // Remove notification
exports.removeNotificationData = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
try{
    admin.firestore().collection('unique').doc(data.fieldID).delete();
} catch(e){
    console.log(e)
}

  return admin.firestore().collection('notifications').doc(data.uid).collection('notifications').doc(data.fieldID).delete();
});

// Remove all notifications
exports.removeAllNotifications = functions.https.onCall(async (data, context) => {
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const uid = context.auth.uid;
  const ref = admin.firestore().collection('notifications').doc(uid);
  const snapshot = await admin.firestore().collection('notifications').doc(uid).collection('notifications').get();
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  return snapshot.forEach(doc => {
    ref.collection('notifications').doc(doc.id).delete();
  });
});

  // Delete a chat message
exports.deleteChatMessage = functions.https.onCall(async (data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }

  return admin.firestore().collection('chat').doc(data.tripDocID).collection('messages').doc(data.fieldID).delete();
});

exports.addNewNotification = functions.https.onCall(async (data, context) =>{
    if(!context.auth){
        throw new functions.https.HttpsError(
              'unauthenticated',
              'Unable to perform action.'
        );
        }
    const type = data.type;
    const documentID = data.documentID;
    const message = data.message;
    const ispublic = data.ispublic;
    const ownerID = data.ownerID;
    const ownerDisplayName = data.ownerDisplayName;
    const uidToUse = data.uidToUse;
    const currentUserID = context.auth.uid;

    const ref = admin.firestore().collection('notifications');
    const key = ref.doc().id;
    const key2 = currentUserID+data.documentID+data.type;

    if(type === 'joinRequest'){
    const addNote = await ref.doc(ownerID).collection('notifications').doc(key2).set({
      fieldID: key2,
      ownerID: ownerID,
      ownerDisplayName: ownerDisplayName,
      message: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      documentID: documentID,
      ispublic : ispublic,
      type: type,
      uid: currentUserID,
    });

    const title = 'Join Request';
    const click_action = 'notifications';

    customPushNotification(ownerID, message, title, click_action);
    return addToUniqueDocs(key2);
    }

    if(type === 'Chat'){
    const addNote = await ref.doc(ownerID).collection('notifications').doc(key2).set({
      fieldID: key2,
      message: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      documentID: documentID,
      type: type,
      uid: currentUserID,
    });
    return 'complete';
    }

    if(type === 'Invite' || type === 'Follow'){
    const addNote =  await ref.doc(ownerID).collection('notifications').doc(key2).set({
      fieldID: key2,
      ownerID: ownerID,
      ownerDisplayName: ownerDisplayName,
      message: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      documentID: documentID,
      ispublic : ispublic,
      type: type,
      uid: uidToUse,
    });
    const title = "What's New";
    const click_action = 'notifications';
    customPushNotification(ownerID, message, title, click_action);

    return addToUniqueDocs(key2);
    } else {

    if (uidToUse !== currentUserID) {
        const title = "What's New!";
        const click_action = 'notifications';
        customPushNotification(uidToUse, message, title, click_action);
        }

    return await ref.doc(uidToUse).collection('notifications').doc(key).set({
      fieldID: key,
      ownerID: ownerID,
      ownerDisplayName: ownerDisplayName,
      message: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      documentID: documentID,
      ispublic : ispublic,
      type: type,
      uid: uidToUse,
    });
    
    }
});

//async function checkNotificationSettings(uid, type){
//  const ref = await admin.firestore()
//        .collection('settings')
//        .doc(uid)
//        .get();
//
//  if(ref.exists){
//    const settings = ref.data();
//    switch (type) {
//      case 'directMessaging':
//        return settings.isDirectMessagingOn;
//        break;
//      case 'tripChanges':
//        return settings.isTripChangeOn;
//        break;
//      case 'tripChat':
//        return settings.isTripChatOn;
//        break;
//      default:
//      return true;
//
//    }
//
//  } else{
//    return true;
//  }
//}

async function customPushNotification(uid, message, title, click_action) {


    const querySnapshot = await admin.firestore()
          .collection('tokens')
          .doc(uid)
          .collection('tokens')
          .get();

    const tokens = querySnapshot.docs.map(snap => snap.id);
    const payload = admin.messaging.MessagingPayload = {
      notification: {
        title: title,
        body: message,
//        icon: 'your-icon-url',
        click_action: click_action // required only for onResume or onLaunch callbacks
      }
    };
    if(tokens.length > 0){
        try{
            return fcm.sendToDevice(tokens, payload);
        } catch(e){
            return console.log(e);
        }
    }
    return console.log('No token found');
}

async function addToUniqueDocs(key2){
    return admin.firestore().collection('unique').doc(key2).set({});
}

//exports.addCustomMember = functions.https.onCall(async (data, context) =>{
//     if(!context.auth){
//       throw new functions.https.HttpsError(
//         'unauthenticated',
//         'Unable to perform action.'
//       );
//     }
//     const uid = data.uid;
//     const docID = data.docID;
//     const profileRef = await admin.firestore().collection('userPublicProfile').doc(uid).get();
//     if(!profileRef.exists){
//     return 'Error'
//     }
//     const ref = profileRef.data();
//
//     return admin.firestore().collection('trips').doc(docID).collection('Members').doc(uid).set({
//     displayName: ref.displayName,
//     firstName: ref.firstName,
//     lastName: ref.lastName,
//     uid: ref.uid,
//     urlToImage: ref.urlToImage,
//     });
//   });

   exports.addCustomNotification = functions.https.onCall(async (data, context) =>{
    if(!context.auth){
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Unable to perform action.'
      );
    }
    const key = admin.firestore().collection('notifications').doc().id;
    const users = await admin.firestore().collection('userPublicProfile').get();
    users.forEach(doc =>{
        admin.firestore().collection('notifications').doc(doc.id).collection('notifications').doc(key).set({
                documentID: '',
                fieldID: key,
                message: data.message,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                type: 'Welcome',
                uid: doc.id,
            });
    });
   });

exports.feedbackData = functions.https.onCall(async (data, context) => {
    if(context.auth === 'NTjJZIWR5jXCVzgl7xIG39Iz0dG3'){
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Unable to perform action.'
      );
    }
    const feedback = await admin.firestore().collection('feedback').get();
    return feedback.forEach((doc) => {
        admin.firestore().collection('feedback').doc(doc.id).update({
        fieldID: doc.id,
        });
    });
});

exports.removeFeedback = functions.https.onCall(async (data, context) =>{
    if(context.auth === 'NTjJZIWR5jXCVzgl7xIG39Iz0dG3'){
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Unable to perform action.'
      );
    }
    const fieldID = data.fieldID;
    return admin.firestore().collection('feedback').doc(fieldID).delete();
});

exports.addTransportation = functions.https.onCall(async (data, context) =>{
    if(!context.auth){
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Unable to perform action.'
      );
    }

    const mode = data.mode;
    const tripDocID = data.tripDocID;
    const displayName = data.displayName;
    const canCarpool = data.canCarpool;
    const carpoolingWith = data.carpoolingWith;
    const airline = data.airline;
    const flightNumber = data.flightNumber;
    const comment = data.comment;
    const key = await admin.firestore().collection('transport').doc().id;

    return admin.firestore().collection('transport').doc(tripDocID).collection('mode').doc(key).set({
        mode: mode,
        comment:comment,
        tripDocID: tripDocID,
        displayName: displayName,
        fieldID: key,
        canCarpool: canCarpool,
        carpoolingWith: carpoolingWith,
        airline: airline,
        flightNumber: flightNumber,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        uid: context.auth.uid,
    });

});

exports.deleteTransportation = functions.https.onCall((data, context) =>{
    if(!context.auth){
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Unable to perform action.'
      );
    }
    const tripDocID = data.tripDocID;
    const fieldID = data.fieldID;
    return admin.firestore().collection('transport').doc(tripDocID).collection('mode').doc(fieldID).delete();
});

//Add user uid to list of voters
exports.addVoterToBringingItem = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
  const uid = context.auth.uid;
  return admin.firestore().collection('bringList').doc(data.tripDocID).collection('Items').doc(data.documentID).update({
  voters: admin.firestore.FieldValue.arrayUnion(uid)
  });
});

//Remove user uid to list of voters
exports.removeVoterFromBringingItem = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }
    const uid = context.auth.uid;
    return admin.firestore().collection('bringList').doc(data.tripDocID).collection('Items').doc(data.documentID).update({
    voters: admin.firestore.FieldValue.arrayRemove(uid)
    });
});

exports.addReview = functions.https.onCall((data, context) =>{
  if(!context.auth){
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Unable to perform action.'
    );
  }

  const docID = data.docID;
  const uid = context.auth.uid;

    return admin.firestore().collection('addReview').doc(uid).collection('review').doc(docID).set({
        uid: uid,
        docID: docID,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});


//Function to disable user account
exports.disableAccount = functions.https.onCall((data, context) => {

    if(!context.auth){
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Unable to perform action.'
        );
      }
    const uid = context.auth.uid;
    return admin.auth().updateUser(uid, {
        disabled: true
    });
});

exports.recordLocation = functions.https.onCall(async (data, context) =>{
    if(!context.auth){
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Unable to perform action.'
        );
      }
    const uid = context.auth.uid;
    const documentID =  data.documentID;
    return admin.firestore().collection('location').doc(uid).collection('locations').doc(documentID).set({
      city: data.city,
      country: data.country,
      documentID: documentID,
      geoPoint: new admin.firestore.GeoPoint(data.latitude, data.longitude),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      uid: uid,
    });
})