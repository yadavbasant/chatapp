import React, { useState, useEffect } from 'react';
import './VideoCall.scss';
import { AgoraRtcService } from '../../utils/agora-rtc.services';


const VideoCall = ({ currentUser }) => {
  const [remoteCalls, setRemoteCalls] = useState([]);
  const [ muteUnmuteStatus, setMuteUnmuteStatus ] = useState({ muteAudio: false, muteVideo: false });
  const agoraRTC = new AgoraRtcService();
  const GOOD_RESOLUTION_USER_LIMIT = 5;
  const isAudioEnabled = true;
  const isVideoEnabled = true;
  const uid = currentUser.userId;
  const userDetails = { user_id: uid, room_id: "test1" };

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
      console.log("user unpublished successfully", event);
      remoteCalls.forEach((stream) => {
        if (stream.id == event.uid) {
          if (event.msg == "mute-audio") {
            stream.remoteAudioMuted = true;
          } else if (event.msg == "unmute-audio") {
            stream.remoteAudioMuted = false;
          } else if (event.msg == "mute-video") {
            stream.remoteVideoMuted = true;
          } else if (event.msg == "unmute-video") {
            stream.remoteVideoMuted = false;
          }
        }
      });
      setRemoteCalls(remoteCalls);
    })

    agoraRTC._agora.on("user-left", (event) => {
      console.log("user left successfully", event);
      // removeRemoteUser(event);
    })
  }

  const startAudioCall = async (isModeratorUnhide = false) => {
    if (!agoraRTC.publisher.tracks.audio) {
      await agoraRTC.createAudioTrack();
    }

    agoraRTC
      .publish('audio')
      .then(() => {
        // isAudioEnabled = true;
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
        // isVideoEnabled = true;

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

    let userName = "Basant"
    // Subscribe to low quality stream under poor network connection
    agoraRTC.publisher.client.setStreamFallbackOption(userId, 1);
    let title = "title"
    let role = "host"

    let remoteUserData = remoteCalls.find(
      (item) => item.id == remoteUser.uid
    );

    if (!remoteUserData) {
      const data = {
        id: userId,
        divId: 'agora_remote-' + userId,
        name: userName,
        title: title,
        userRole: role,
        remoteAudioMuted: !remoteUser.hasAudio,
        remoteVideoMuted: !remoteUser.hasVideo,
        isLocalStream: isLocalTrack,
        speaking: false,
        nameInitials: "AA",
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
    if (remoteCalls.length > GOOD_RESOLUTION_USER_LIMIT) {
      //   setRemoteStreamLower();
    }
    console.log("remotecalls before mute/unmute", remoteCalls);
    console.log(remote.mediaType, remoteUser.hasVideo,"=======jiya1");
    if (remote.mediaType == 'video' && remoteUser.hasVideo) {
      remoteCalls.forEach((user) => {
        console.log(user.id, remoteUser.uid, user.remoteVideoMuted,"=======jiya");
        // && !user.remoteVideoMuted
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
        // && !user.remoteAudioMuted
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

  const muteAudio = async () => {
    if (agoraRTC.publisher.tracks.audioActionInProgress) {
      return
    }
    agoraRTC.publisher.tracks.audioActionInProgress = true;
    await agoraRTC.publisher.tracks.audio.setEnabled(false)
    muteUnmuteStatus.muteAudio = true;
    setMuteUnmuteStatus(muteUnmuteStatus);
    agoraRTC.publisher.tracks.audioActionInProgress = false;
  }

  const unMuteAudio = async () => {
    if (agoraRTC.publisher.tracks.audioActionInProgress) {
      return
    }
    agoraRTC.publisher.tracks.audioActionInProgress = true;
    await agoraRTC.publisher.tracks.audio.setEnabled(true)
    muteUnmuteStatus.muteAudio = false;
    setMuteUnmuteStatus(muteUnmuteStatus);
    agoraRTC.publisher.tracks.audioActionInProgress = false;
  }

  const muteVideo = async () => {
    if (agoraRTC.publisher.tracks.videoActionInProgress) {
      return
    }
    agoraRTC.publisher.tracks.videoActionInProgress = true;
    await agoraRTC.publisher.tracks.video.setEnabled(false)
    muteUnmuteStatus.muteVideo = true;
    setMuteUnmuteStatus(muteUnmuteStatus);
    agoraRTC.publisher.tracks.videoActionInProgress = false;
  }

  const unMuteVideo = async () => {
    if (agoraRTC.publisher.tracks.videoActionInProgress) {
      return
    }
    agoraRTC.publisher.tracks.videoActionInProgress = true;
    
    await agoraRTC.publisher.tracks.video.setEnabled(true);
    muteUnmuteStatus.muteVideo = false;
    setMuteUnmuteStatus(muteUnmuteStatus);
    agoraRTC.publisher.tracks.videoActionInProgress = false;
  }

  return (
    <div className="left__ScreenUser" >
      
      {remoteCalls.map((item) => {
        console.log("===============================mutestatus", muteUnmuteStatus);
          return (

            <div className="mb-30 two-video col-md-6" key= {item.divId}>
              <div className="remote" id={item.divId}>
                
              </div>
            </div>
          )
        })
      }
      <div className="control_buttons" >
        {!muteUnmuteStatus.muteAudio && <button onClick={ ()=>{ muteAudio() } } className = "btns">Mute Audio</button>}
        {muteUnmuteStatus.muteAudio && <button onClick={ ()=>{ unMuteAudio() } } className = "btns">UnMute Video</button>}
        {!muteUnmuteStatus.muteVideo && <button onClick={ ()=>{ muteVideo() } } className = "btns">Mute Audio</button>}
        {muteUnmuteStatus.muteVideo && <button onClick={ ()=>{ unMuteVideo() } } className = "btns">UnMute Video</button>}
        <button onClick={ ()=>{ unMuteVideo() } } className = "btns">Leave Call</button>
      </div>
    </div>
  );
}

export default VideoCall;