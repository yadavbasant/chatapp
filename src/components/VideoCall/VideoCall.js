import React, { useState, useEffect } from 'react';
import './VideoCall.scss';
import { AgoraRtcService } from '../../utils/agora-rtc.services';


const VideoCall = ({ currentUser, setEnableVideoCall, channelName }) => {
  const [remoteCalls, setRemoteCalls] = useState([]);
  const [muteAudio, setMuteAudio] = useState(false);
  const [muteVideo, setMuteVideo] = useState(false);
  const agoraRTC = new AgoraRtcService();
  const isAudioEnabled = true;
  const isVideoEnabled = true;
  const uid = currentUser.userId;
  const userDetails = { user_id: uid, room_id: channelName };

  useEffect(() => {
    async function initRtc() {
      await agoraRTC.initSession();

      joinRoomChannel('', userDetails)
        .then((id) => {
          registerAgoraEvents();
          startVideoCall().then(() => {
            startAudioCall().then(() => {
            })
            .catch((err) => {
              console.log(err, 'Audio track is not created!');
            })
          })
            .catch((err) => {
              console.log(err, 'Video track is not created!');
            });
        })
        .catch((err) => {
          console.log("error", err);
          return false;
        });
    }
    initRtc()
  }, [])

  const joinRoomChannel = async (type, userDetails) => {
    return new Promise((res, rej) => {
      if (
        !agoraRTC.publisher.isJoined &&
        !agoraRTC.isChannelJoining
      ) {
        agoraRTC
          .join(type, userDetails)
          .then((id) => {
            return res(id);
          })
          .catch((err) => {
            return rej(err);
          });
      } else {
        return res(userDetails.user_id);
      }
    });
  }

  const registerAgoraEvents = () => {
    agoraRTC._agora.on("user-published", (event) => {
      console.log("user published successfully", event);

      let remote = remoteCalls.filter(x => x.id == event.user.uid)[0];
      console.log('user-published', event);

      if (event.mediaType == 'video' && remote?.videoStream && remote.videoStream.hasVideo == event.user.hasVideo) {
        return;
      }
      else if (event.mediaType == 'audio' && remote?.audioStream && remote.audioStream.hasAudio == event.user.hasAudio) {
        return;
      }
      else {
        addRemoteUser(event);
      }
    })

    agoraRTC._agora.on("user-joined", (event) => {
      console.log("user joined successfully", event);

      addRemoteUser(event);
    })

    agoraRTC._agora.on("user-info-updated", (event) => {
      console.log("user info updated successfully", event);
    })

    agoraRTC._agora.on("user-unpublished", (event) => {
    })

    agoraRTC._agora.on("user-left", (event) => {
      console.log("user left successfully", event);
    })
  }

  const startAudioCall = async (isModeratorUnhide = false) => {
    if (!agoraRTC.publisher.tracks.audio) {
      await agoraRTC.createAudioTrack();
    }

    agoraRTC
      .publish('audio')
      .then(() => {
        const userDetails = {
          mediaType: 'audio',
          user: {
            uid: uid,
            audioTrack: agoraRTC.publisher.tracks.audio,
            hasAudio: isAudioEnabled,
            hasVideo: true
          },
        };
        addRemoteUser(userDetails, true);
      })
      .catch((err) => {
        console.error("error", err)
      });
  }

  const startVideoCall = async (isModeratorUnhide = false) => {

    if (!agoraRTC.publisher.tracks.video) {
      await agoraRTC.createVideoTrack();
    }

    agoraRTC
      .publish('video')
      .then(() => {
        const userDetails = {
          mediaType: 'video',
          user: {
            uid: uid,
            videoTrack: agoraRTC.publisher.tracks.video,
            hasAudio: true,
            hasVideo: isVideoEnabled
          },
        };
        addRemoteUser(userDetails, true);

      })
      .catch((err) => {
        console.error("error", err)
      });
  }

  const addRemoteUser = async (remote, isLocalTrack = false) => {
    const remoteUser = remote.user;
    let userId = remoteUser.uid;
    // Subscribe to low quality stream under poor network connection
    agoraRTC.publisher.client.setStreamFallbackOption(userId, 1);

    let remoteUserData = remoteCalls.find(
      (item) => item.id == remoteUser.uid
    );

    if (!remoteUserData) {
      const data = {
        id: userId,
        divId: 'agora_remote-' + userId,
        remoteAudioMuted: !remoteUser.hasAudio,
        remoteVideoMuted: !remoteUser.hasVideo,
        isLocalStream: isLocalTrack,
        isLoading: false,
        peerId: remoteUser.uid,
        userId: remoteUser.uid,
        videoStream: remoteUser.videoTrack,
        audioStream: remoteUser.audioTrack,
        isMuted: false
      };

      remoteCalls.push(data);
      setRemoteCalls([...remoteCalls]);
      console.log("remotecalls================================", remoteCalls);
    }
    else {
      remoteUserData.videoStream = remoteUser.videoTrack ?? remoteUserData.videoStream;
      remoteUserData.audioStream = remoteUser.audioTrack ?? remoteUserData.audioStream;
    }

    if (remote.mediaType == 'video' && remoteUser.hasVideo) {
      remoteCalls.forEach((user) => {
        if (user.id == remoteUser.uid) {
          checkElementExistent(user.divId).then((ele) => {
            setTimeout(() => {
              user.videoStream.play(user.divId);
            }, 500);
          });
        }
      });
    }
    if (remote.mediaType == 'audio' && remoteUser.hasAudio) {
      remoteCalls.forEach((user) => {
        if (user.id == remoteUser.uid ) {
          if (user.id != uid) {
            user.audioStream.play();
          }
        }
      });
    }
  }

  const checkElementExistent = (id) => {
    return new Promise((res, rej) => {
      let ele = document.getElementById(id);
      if (ele) {
        res(ele);
      } else {
        setInterval(() => {
          let ele = document.getElementById(id);
          if (ele) {
            res(ele);
          }
        }, 100);
      }
    });
  }

  const muteAudioTrack = async () => {
    const localStream = remoteCalls.filter(item => item.id == currentUser.userId)
    await localStream[0].audioStream.setEnabled(false)
    setMuteAudio(!muteAudio);
  }

  const unMuteAudioTrack = async () => {
    const localStream = remoteCalls.filter(item => item.id == currentUser.userId)
    await localStream[0].audioStream.setEnabled(true)
    setMuteAudio(!muteAudio);
  }

  const muteVideoTrack = async () => {
    const localStream = remoteCalls.filter(item => item.id == currentUser.userId)
    await localStream[0].videoStream.setEnabled(false)
    setMuteVideo(!muteVideo);
  }

  const unMuteVideoTrack = async () => {
    const localStream = remoteCalls.filter(item => item.id == currentUser.userId)
    await localStream[0].videoStream.setEnabled(true);
    setMuteVideo(!muteVideo);
  }

  const leaveCall = () => {
    setEnableVideoCall(false);
  }

  return (
    <div className="left__ScreenUser" >
      
      {remoteCalls.map((item) => {
          return (
            <div className="mb-30 two-video col-md-6" key= {item.divId}>
              <div className="remote" id={item.divId}>
                
              </div>
            </div>
          )
        })
      }
      <div className="control_buttons" >
        {!muteAudio && <button onClick={ ()=>{ muteAudioTrack() } } className = "btns">Mute Audio</button>}
        {muteAudio && <button onClick={ ()=>{ unMuteAudioTrack() } } className = "btns">UnMute Audio</button>}
        {!muteVideo && <button onClick={ ()=>{ muteVideoTrack() } } className = "btns">Mute Video</button>}
        {muteVideo && <button onClick={ ()=>{ unMuteVideoTrack() } } className = "btns">UnMute Video</button>}
        <button onClick={ ()=>{ leaveCall() } } className = "btns">Leave Call</button>
      </div>
    </div>
  );
}

export default VideoCall;