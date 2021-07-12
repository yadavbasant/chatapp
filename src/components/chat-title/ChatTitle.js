import React from 'react';
import './ChatTitle.scss';

const ChatTitle = ({ selectedConversation, setSelectedUser, setEnableVideoCall, rtmClient, currentUser, setChannelName }) => {
    let chatTitleContents = null;

    const sendCallMessage = async () => {
        setEnableVideoCall(true)
        const channelName = currentUser.userId+"_"+selectedConversation.peopleid;
        setChannelName(channelName);
        const msgBody = {type: "call_message", callerTitle: currentUser.username, channelName: channelName }
        const ackMessage = await rtmClient.sendPeerMessage(selectedConversation.peopleid.toString(), msgBody)
        console.log("===================ack", ackMessage);
    }

    if (selectedConversation) {
        chatTitleContents = (
            <>  
                <span>{ selectedConversation.username }</span>
                <div className="cross_button" onClick={ () => { setSelectedUser(null); } } title="Delete Conversation">
                   X
                </div>
                <span><button className="call_button" onClick={ () => { sendCallMessage() } } >Start</button></span>
            </>
        );
    }

    return (
        <div id="chat-title">
            { chatTitleContents }
        </div>
    );
}

export default ChatTitle;