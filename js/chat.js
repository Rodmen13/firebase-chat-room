//$(function() {
//  // Get a reference to the root of the chat data.
//  var messagesRef = new Firebase("https://torid-inferno-4435.firebaseio.com/chat");
//
//  // When the user presses enter on the message input, write the message to firebase.
//  $("#messageInput").keypress(function (e) {
//    if (e.keyCode == 13) {
//      var name = $("#nameInput").val();
//      var text = $("#messageInput").val();
//      messagesRef.push({name:name, text:text});
//      $("#messageInput").val("");
//    }
//  });
//
//  // Add a callback that is triggered for each chat message.
//  messagesRef.limitToLast(10).on("child_added", function (snapshot) {
//    var message = snapshot.val();
//    $("<div/>").text(message.text).prepend($("<em/>")
//      .text(message.name + ": ")).appendTo($("#messagesDiv"));
//    $("#messagesDiv")[0].scrollTop = $("#messagesDiv")[0].scrollHeight;
//  });
//});
//

var provider = 'google';

function runExample(demoUrl) {
    "use strict";
    
    var uid = null, room = null, submitted = false, sub = null, members = {}, userName;
    var ref;
    var $join = $('#joinForm');
    $('#select_room').hide();  
    $('ul.chatbox').hide(); 
    // handle input and form events
    $('#chatForm').submit(processForm);
    // $inp.on('keyup', _.debounce(countChars, 50));
    $('#google-login').click(function (e) {
        provider = 'google';
        authenticate(e)
    });
    $('#github-login').click(function (e) {
        provider = 'github';
        authenticate(e)
    });
    $('a[href="#logout"]').click(logout);
    $('a[href="#leave"]').click(leaveRoom);
    $join.submit(joinRoom);
    var ref=firebase.database().ref();
    console.log('Test Ha Ha');
    function authenticate(e) {
        console.log('Authenticate');
        e.preventDefault();
        if(provider=='github'){
            provider=new firebase.auth.GithubAuthProvider();
        }
        if(provider=='google'){
            provider=new firebase.auth.GoogleAuthProvider();
        }
        firebase.auth().signInWithPopup(provider).then(function(result){
            // logged in!
            var user=result.user;
            console.log('logged in with user', user);
            // Get a reference to the root of the Database
            
            uid=user.uid;
            ref.child('users/'+ user.uid).set({
                email: user.email,
                name:user.displayName
            })
            $('#login-layer').hide();
            ref.child('room_names').once('value', buildRoomList);
        })
    }
    
    function logout(e) {
       e.preventDefault();
       firebase.auth().signOut();
       $('#chatForm').hide();
       $('#login-layer').show();
       
    }

    // create option tags in our room select
    function buildRoomList(snap) {
        console.log("buildRoomList::::",snap);
        var $sel = $('select').empty();
        snap.forEach(function (ss) {
            console.log("ss::::",ss.val());
            $('<option />')
                .prop('value', ss.val())
                .text(ss.val())
                .appendTo($sel);
        });
        pickRoom();
        $sel.change(pickRoom);
    }

    // when the select is updated, load that room's messages
    function pickRoom() {
        roomOff();
        $('#chatForm').hide();
        var roomId = $('select').val();
        
        // see if we need to join or if we are already a member
        // by trying to load the list of members
        getMembers(roomId).then(loadRoom, showJoinForm);
    }
    
    function getMembers(roomId) {
        return $.Deferred(function(def) {
           // try to read the room's members, if we succeed
           // then we are a member
           ref.child('members').child(roomId)
           .once('value', function(snap) {
               console.log("member:::",snap.val())
               members = snap.val() || {};
               if( !members.hasOwnProperty(uid) ) {
                  def.reject();
               }
               else {
                  setName(members[uid]);
                  def.resolve();   
               }
           }, def.reject);
        });
    }
    
    function showJoinForm() {
        console.log('showJoinForm');
       var $ul = emptyRoom();
       $('<li>You are not a member of this room</li>').appendTo($ul);
       var $li = $('<li />').append($join.show()).appendTo($ul);
    }
    
    function joinRoom(e) {
       e.preventDefault();
       var roomId = $('select').val();
       var name = $(this).find('input').val();
        if( name ) {
            var obj={}
            obj
            ref.child('members').child(roomId+"/"+uid).set(name,function(err){
                if(err){
                    console.log("write member error::: ",err);
                }else{
                    getMembers(roomId).then(loadRoom, result);   
            }});
        }
        else {
           log('Enter a name', 'error');   
        }
    }
    
    function leaveRoom(e) {
       e.preventDefault();
       roomOff();
       var roomId = $('select').val();
       ref.child('members').child(roomId).child(uid).remove(pickRoom);
    }
    
    function roomOff() {
       if( room ) { 
            // stop listening to the previous room
            room.off('child_added', newMessage);
            room.off('child_removed', dropMessage);
        }   
    }
    
    function loadRoom() {
        emptyRoom();
        console.log("LoadRoom:::::::::::");
        $('#chatForm').show();
        room = ref.child('messages').child($('select').val()).limitToLast(100);
        room.on('child_added', newMessage);
        room.on('child_removed', dropMessage); 
    }
    
    function emptyRoom() {
        $join.detach();
        return $('ul.chatbox').empty();
    }
    
    function setName(name) {
        //jdVWSjr3yIc1p1xlA6h1MTSp5p43   "Rodmen"
       console.log("setName::::::::: name::::: ",name);
       userName = name;
       members[name] = name;
       $('#chatForm').find('button').text('Send as '+name);
    }
    
    // create a new message in the DOM after it comes
    // in from the server (via child_added)
    function newMessage(snap) {
        var $chat = $('ul.chatbox');
        var data = snap.val();
        // var txt = members[dat.user] + ': ' + dat.message;
        console.log("Snap:::: ",snap.key,snap.val());
        var txt = data.name || '';
        txt += " : "
        txt += data.message || '';
        $('<li />').attr('data-id', snap.key).text(txt).appendTo($chat); 
        $chat.scrollTop($chat.height());
    }
    
    // remove message locally after child_removed
    function dropMessage(snap) {
        $('li[data-id="'+snap.key+'"]').remove();
    }

    // print results of write attempt so we can see if
    // rules allowed or denied the attempt
    function result(err) {
        if (err) {
            log(err.code, 'error');
        } else {
            log('success!');
        }
    }

    // post the forms contents and attempt to write a message
    function processForm(e) {
        e.preventDefault();
        submitted = true;
        if (!userName) {
            log('No username :(', 'error');
        } else {
            room=ref.child('messages').child($('select').val());
            room.push(
                {
                    name:userName,
                    message: $('input[name=message]').val(),
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                },
                result
            );
        }
    }
        
    // tell user how many characters they have entered
    function countChars() {
        var len = $(this).val().length;
        if( len || !submitted ) {
            var style = len >= 50 ? 'error' : 'note';
            log(len + ' characters', style);
        }
        return true;
    }

    // print write results
    function log(text, style) {
        delayedClear();
        var $p = $('p.result').removeClass('error note success');
        style && $p.addClass(style);
        $p.text(text);
    }

    var to;

    // clear write results after 5 seconds
    function delayedClear() {
        to && clearTimeout(to);
        to = setTimeout(clearNow, 5000);
    }

    // clear write results now
    function clearNow() {
        $('p.result').text('');
        to && clearTimeout(to);
        to = null;
        submitted = false;
    }

}


// Dependencies used in this fiddle:
// code.jquery.com/jquery-2.1.0.min.js
// cdn.firebase.com/js/client/2.0.4/firebase.js
// cdn-gh.firebase.com/demo-utils-script/demo-utils.js
// cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.1/lodash.min.js
//
// This line creates a unique, private Firebase URL 
// you can hack in! Have fun!
// $.loadSandbox('web/usec/example', 'web/usec/example').then(runExample);                                                                      
$(document).ready(function () {
    runExample("https://react-native-firebase-mo-22dc3.firebaseio.com");
});

