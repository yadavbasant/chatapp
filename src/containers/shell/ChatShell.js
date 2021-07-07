import React, { useEffect, useState } from 'react';
import ConversationList from '../../components/conversation/conversation-list/ConversationList';
import ChatTitle from '../../components/chat-title/ChatTitle';
import MessageList from '../message/MessageList';
import ChatForm from '../../components/chat-form/ChatForm';
import axios from 'axios';
import AgoraRTMClient from "../../utils/agora-rtm-client";
import {jsonParse} from "../../utils/helper";
import './ChatShell.scss';
const rtmClient = new AgoraRTMClient();

const ChatShell = () => {
 
    let conversationBackup = localStorage.getItem("conversations");
    let initCon = [];
    if(conversationBackup && JSON.parse(conversationBackup).length) {
        initCon = JSON.parse(conversationBackup)
    }

    const [conversations, updateConversations] = useState(initCon);
    const [selectedUser, setSelectedUser] = useState(null);
    const location = window.location;
    const searchParams = new URLSearchParams(location.search);
    const userId = parseInt(searchParams.get("id"))
    localStorage.setItem("userId", userId);
    const [messages, setMessages] = useState([]);
    const [userList, setUserList] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if( !selectedUser ) {
            return;
        }
        updateChatMessags();
    }, [selectedUser, conversations])

    const updateChatMessags = () => {
        const userId = parseInt(localStorage.getItem("userId"));
        const filteredMessages = conversations.filter(item => {
            return item.senderId === userId && item.receiverId === selectedUser.peopleid
                || item.senderId === selectedUser.peopleid && item.receiverId === userId;
        })
        filteredMessages.sort((a, b) => {
            return b.createdAt - a.createdAt;
        })
        setMessages(filteredMessages);
        console.log("filtered messages", filteredMessages, messages);
    }


    useEffect(() => {
        async function initRtm() {
            // const userLoginResult = await axios.get('https://zzyzx.website/api.php?getuser=2');
            // console.log("=============login info",userLoginResult);
            // const userId = userLoginResult.data;
            // localStorage.setItem("userId", userId);
            const result = await axios.get('https://zzyzx.website/api.php?getuser=1&id='+userId);
            let data = result.data.friends.filter(item => item.peopleid !== parseInt(userId));
            data = data.map((item) => { 
                item.peopleid = parseInt(item.peopleid); 
                return item;
            })
            setCurrentUser({userId : userId, username : result.data.loggedInUserName})
            setUserList(data);
            try {
                const appId = "7b02736c7baa4137b523645821bb840c";
                await rtmClient.login(appId, userId.toString(), appId);
                subscribeRTMEvent(rtmClient);
                await rtmClient.join("chatchannel");
            } catch (err) {
                if (rtmClient._logged) {
                    await rtmClient.logout();
                }
                throw err;
            }
        }
        initRtm();
    }, [])

    const subscribeRTMEvent = (rtmClient) => {
        rtmClient.on(
            "MessageFromPeer",
            ({peerId, message}) => {
                const {msg, senderTitle} = jsonParse(message.text);
                console.log("===================================", jsonParse(message.text));
                console.log("[agora-web] MessageFromPeer","peer_"+peerId, message.text);
                const currentDate = new Date();
                const messageRow = {
                    message: msg,
                    senderId: parseInt(peerId), 
                    senderTitle: senderTitle,
                    image: "",
                    receiverId: parseInt(userId), 
                    createdAt: currentDate.getTime()
                }
                
                let conversationBackup = localStorage.getItem("conversations");
                console.log("==================from localstorage", conversationBackup);
                let initCon = [];
                if(conversationBackup && JSON.parse(conversationBackup).length) {
                    initCon = JSON.parse(conversationBackup)
                }
                updateConversations([...initCon, messageRow]);
                console.log("==========================after receiving", [...initCon, messageRow]);
                localStorage.setItem("conversations", JSON.stringify([...initCon, messageRow]));
            }
        );
    }

    const onChatUserSelected = (user) => {
        setSelectedUser(user);
    }

    let conversationContent = "";
    if (conversations.length > 0 && selectedUser) {
        conversationContent = (
            <MessageList messages={messages} />
        );
    }

    if( !userList.length || !currentUser ) {
        return (
            <div className="wait_message" >
                Please wait, app is loading...
            </div>
        )
    }

    return (
        <div id="chat-container">
            <span className="loggedin_user" >LoggedIn User: {currentUser.username}</span>
            <ConversationList
                onConversationItemSelected={onChatUserSelected}
                conversations={userList}
                selectedConversation={selectedUser} />
            <ChatTitle
                selectedConversation={selectedUser}
                setSelectedUser={setSelectedUser} />
            {selectedUser ? conversationContent: 
                <div className="nouser_selected" >
                    <div>Hi, {currentUser.username}!</div> 
                    <div className="default_message" >Start conversation with your friends by selecting from list</div>
                </div>
            }
            <ChatForm
                selectedConversation={selectedUser}
                userId={userId}
                rtmClient={rtmClient}
                conversations={conversations}
                updateConversations={updateConversations}
                currentUser = {currentUser}
            />
        </div>
    );
}

export default ChatShell;