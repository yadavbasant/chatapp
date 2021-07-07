import React from 'react';
import classNames from 'classnames';
import './Message.scss';

const Message = ({ isMyMessage, message }) => {
    const messageClass = classNames('message-row', {
        'you-message': isMyMessage,
        'other-message': !isMyMessage
    });
    const imageThumbnail = isMyMessage ? null : (
                            message.image ? <img src={"asas"} alt={message.image} />:
                            <span className="name_initial"> {message.senderTitle.charAt(0).toUpperCase()} </span>
                        );

    return (
        <div className={messageClass}>
            <div className="message-content">
                {imageThumbnail}
                <div className="message-text">
                    {message.message}
                </div>
            </div>
        </div>
    );
}

export default Message;