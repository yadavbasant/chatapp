import EventEmitter from 'events';
import AgoraRTC from 'agora-rtc-sdk-ng';

export class AgoraRtcService {
   credentials= null;
   setupDone;

   publisher;
   audioDevices= [];
   videoDevices= [];

   isChannelJoining = false;
   tokens = {};
  appId = "7b02736c7baa4137b523645821bb840c";


   _agora = new EventEmitter();
  constructor(
  ) {
    this.publisher = {
      tracks: {
        audio: null,
        audioId: "",
        audioVolume: 100,
        video: null,
        videoId: "",
        screenTrack: null,
        videoActionInProgress: false,
        audioActionInProgress: false
      },
      client: null,
      screenClient: null,
      isJoined: false,
      isScreenJoined: false,
    };
    this.getDevices();
    this.setupDone = false;
  }

  async initSession() {
    AgoraRTC.setLogLevel(0);
    this.publisher.client = AgoraRTC.createClient({
      mode: 'live',
      codec: 'vp8',
    });
    this.publisher.client
      .enableDualStream()
      .then(() => console.log('DUAL STREAM ENABLED'))
      .catch(() => console.log('DUAL STREAM UNAVAILABLE'));
    return new Promise((res) => res(this.publisher.client));
  }

  async stopScreenShare() {
    await this.unpublishScreenTrack();
    setTimeout(async () => {
      await this.leave('screen');
    }, 1000);
  }

  createScreenClient() {
    return Promise.resolve(
      AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8',
      })
    );
  }

  async publishScreenTrack() {
    return new Promise(async (res, rej) => {
      if (this.publisher.client.remoteUsers.length < 17) {
        if (!this.publisher.tracks.screenTrack) {
          AgoraRTC.createScreenVideoTrack({
            encoderConfig: '1080p_1',
          })
            .then(async (track) => {
              this.publisher.tracks.screenTrack = track;
              this.setupTrackHandlers();
              await this.publisher.screenClient.publish([
                this.publisher.tracks.screenTrack,
              ]);

              res(track);
            })
            .catch((err) => {
              rej(err);
            });
        } else {
          await this.publisher.screenClient.publish([
            this.publisher.tracks.screenTrack,
          ]);
          res(this.publisher.tracks.screenTrack);
        }
      } else {
        rej(false);
      }
    });
  }

  async unpublishScreenTrack() {
    if (this.publisher.tracks.screenTrack) {
      await this.publisher.screenClient.unpublish([
        this.publisher.tracks.screenTrack,
      ]);
      this.unregisterTrackHandlers();
    }
    this.publisher.tracks.screenTrack = null;
  }

  async createAudioTrack(deviceId) {
    return new Promise((res, rej) => {
      if (!deviceId) {
        deviceId = this.audioDevices[0].deviceId;
      }
      AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: deviceId,
        AEC: true, // acoustic echo cancellation
        AGC: true, // audio gain control
        ANS: true, // automatic noise suppression
        encoderConfig: 'speech_standard',
      })
        .then((track) => {
          this.publisher.client.setClientRole('host');
          this.publisher.tracks.audioVolume = 100;
          this.publisher.tracks.audioId = deviceId;
          this.publisher.tracks.audio = track;
          this.publisher.tracks.audio.setEnabled(true);
          res(true);
        })
        .catch((error) => {
          rej(error);
        });
    });
  }

  createVideoTrack(deviceId) {
    return new Promise((res, rej) => {
      if (!this.publisher.tracks.video) {
        if (!deviceId) {
          deviceId = this.videoDevices[0].deviceId;
        }
        AgoraRTC.createCameraVideoTrack({
          cameraId: deviceId,
          encoderConfig: '720p',
          optimizationMode: 'detail',
        })
          .then((track) => {
            this.publisher.client.setClientRole('host');
            this.publisher.tracks.videoId = deviceId;
            this.publisher.tracks.video = track;
            this.publisher.tracks.video.setEnabled(true);
            res(true);
          })
          .catch((err) => {
            rej(err);
          });
      } else {
        res(true);
      }
    });
  }

  async createBothTracks() {
    const [
      microphoneTrack,
      cameraTrack,
    ] = await AgoraRTC.createMicrophoneAndCameraTracks();
    cameraTrack.stop();
    cameraTrack.stop();
    this.publisher.tracks.video = cameraTrack;
    this.publisher.tracks.audio = microphoneTrack;
  }

  // type : screen/''
  join(type, userDetails) {
    return new Promise( async (res, rej) => {
      // just join the channel
      if (this.isChannelJoining) {
        return rej(false);
      }
      this.isChannelJoining = true;
      const channelId = `${userDetails.room_id}`;
      let token = this.appId;  //for now taken appId as token, as we dont have token security implemented
      let userId = userDetails.user_id;
      if (type == 'screen') {
        userId = userDetails.screen_id;
      }
      // We need this function when we will implement token security for joining the agora channel
    //   this.getToken(channelId, userId)
    //     .then(async (response) => {
        //   token = response;

          if (!type) {
            this.setupClientHandlers();
            if (this.publisher.client) {
              this.publisher.client.setLowStreamParameter({
                width: 320,
                height: 240,
                framerate: 15,
                bitrate: 200,
              });
              try {
                let uid = await this.publisher.client.join(
                  this.appId,
                  channelId,
                  token, // this.credentials[channelId].token,
                  userId
                );
                this.publisher.isJoined = true;
                this.isChannelJoining = false;
                return res(uid);
              } catch (err) {
                this.publisher.isJoined = false;
                this.isChannelJoining = false;
                return rej(err);
              }
            }
          }
          // channel join by screenClient
          if (type == 'screen' && this.publisher.screenClient) {
            try {
              this.registerScreenclientHandler();
              this.publisher.screenClient.setLowStreamParameter({
                width: 640,
                height: 360,
                framerate: 15,
                bitrate: 400,
              });
              let suid = await this.publisher.screenClient.join(
                this.appId,
                channelId,
                token,
                userId // screenclient id
              );
              this.publisher.isScreenJoined = true;
              this.isChannelJoining = false;
              return res(suid);
            } catch (err) {
              this.publisher.isScreenJoined = false;
              this.isChannelJoining = false;
              return rej(err);
            }
          }
        // })
        // .catch((err) => {
        //   this.isChannelJoining = false;
        //   return rej(err);
        // });
    });
  }

  async leave(type) {
    if (type === 'screen') {
      await this.publisher.screenClient.leave();
      this.publisher.isScreenJoined = false;
      this.unregisterScreenclientHandler();
    } else {
      await this.publisher.client.leave();
      await this.publisher.client.setClientRole('audience');
      this.publisher.isJoined = false;
      this.unregisterCallbacks();
    }
  }

  // if type is not specified publish both the tracks
  async publish(type) {
    return new Promise(async (res, rej) => {
      if (this.publisher.client.remoteUsers.length < 17) {
        await this.publisher.client.setClientRole('host');
        if (type == 'audio') {
          this.publisher.client
            .publish(this.publisher.tracks.audio)
            .then(() => {
              res(true);
            })
            .catch((err) => {
              rej(err);
            });
        }
        if (type == 'video') {
          this.publisher.client
            .publish(this.publisher.tracks.video)
            .then(() => {
              res(true);
            })
            .catch((err) => {
              rej(err);
            });
        }
      } else {
        rej(false);
      }
    });
  }

  // if type is not specified unpublish both the tracks
  async unPublish(type) {
    return new Promise(async (res, rej) => {
      if (type == 'audio') {
        if (this.publisher.tracks.audio) {
          this.publisher.client
            .unpublish([this.publisher.tracks.audio])
            .then((id) => {
              res(id);
              this.publisher.tracks.audio.stop();
            })
            .catch((err) => {
              console.log(err, 'unpublish error');
              rej(err);
            });
        } else {
          rej({ error: 'audio track is not available' });
        }
      }
      if (type == 'video') {
        if (this.publisher.tracks.video) {
          this.publisher.client
            .unpublish([this.publisher.tracks.video])
            .then((id) => {
              this.publisher.tracks.video.stop();
              res(id);
            })
            .catch((err) => {
              console.log(err, 'unpublish error');
              rej(err);
            });
        } else {
          rej({ error: 'could not find video track' });
        }
      }
    });
  }

  getRemoteNetworkQuality() {
    return this.publisher.client.getRemoteNetworkQuality();
  }

  upgradeUserRole() {
    this.publisher.client.setClientRole('host');
  }

  downgradeUserRole() {
    this.publisher.client.setClientRole('audience');
  }

  switchVideoDevice(deviceId) {
    this.publisher.tracks.videoId = deviceId;
    if (this.publisher.tracks.video) {
      this.publisher.tracks.video
        .setDevice(deviceId)
        .then(() => {
          console.log('set device success');
        })
        .catch((e) => {
          console.log('set device error', e);
        });
    }
  }

  switchAudioDevice(deviceId) {
    this.publisher.tracks.audioId = deviceId;
    if (this.publisher.tracks.audio) {
      this.publisher.tracks.audio
        .setDevice(deviceId)
        .then(() => {
          console.log('set device success');
        })
        .catch((e) => {
          console.log('set device error', e);
        });
    }
  }

  setRemoteStreamType(userId, type) {
    let flag = 0;
    if (this.publisher.client) {
      if (type == 'low') {
        flag = 1;
      }
      if (type == 'high') {
        flag = 0;
      }
      this.publisher.client.setRemoteVideoStreamType(userId, flag);
    }
  }

  onUserPublished = async (user, mediaType) => {
    const uid = user.uid;
    console.log("user published",mediaType, user);
    
      await this.publisher.client.subscribe(user, mediaType);
      // await this.publisher.client.setStreamFallbackOption(uid, 1);
      if (mediaType === 'video') {
        this.setRemoteStreamType(uid, 'low');
      }
      if (mediaType === 'audio') {
      }
      let emitData = { type: 'user-published', user, mediaType };
      this._agora.emit(emitData);
    
  };

  onUserUnpublished = async (user, mediaType) => {
    await this.publisher.client.unsubscribe(user, mediaType);
    if (mediaType === 'video') {
      console.log('unsubscribe video success');
    }
    if (mediaType === 'audio') {
      console.log('unsubscribe audio success');
    }
    let emitData = { type: 'user-unpublished', user, mediaType };
    this._agora.emit(emitData);
  };

  onUserJoined = async (user) => {
    console.log("user published", user);
    // triggers when host join the channel
    console.log('user joined ', user);
    let emitData = { type: 'user-joined', user };
    this._agora.emit(emitData);
  };

  onUserLeft = async (user, reason) => {
    // triggers when host join the channel
    if (reason == 'Quit') {
      // when user left the channel
    }

    if (reason == 'ServerTimeOut') {
      // when user dropped off
    }

    if (reason == 'BecomeAudience') {
      // when user become audience from the host
    }
    let emitData = { type: 'user-left', user, reason };
    this._agora.emit(emitData);
  };

  networkQualityHandler = async (stats) => {
    // network stats
    let emitData = { type: 'network-quality', stats };
    this._agora.emit(emitData);
  };

  screenNetworkQualityHandler = (stats) => {
    // network stats
    let emitData = { type: 'network-quality', stats };
    this._agora.emit(emitData);
  };

  volumeIndicatorHandler = async (result) => {
    let emitData = { type: 'volume-indicator', result };
    this._agora.emit(emitData);
  };

  connectionStateChange = async (curState, revState, reason) => {
    let result = {curState, revState, reason}
    let emitData = { type: 'connection-state-change', result};
    this._agora.emit(emitData);
  };


  muteUnmutehandler = async (uid, msg) => {
    let emitData = { type: 'user-info-updated', uid, msg };
    this._agora.emit(emitData);
  };

  unregisterCallbacks() {
    this.publisher.client.off('user-published', this.onUserPublished);
    this.publisher.client.off('user-unpublished', this.onUserUnpublished);
    this.publisher.client.off('user-joined', this.onUserJoined);
    this.publisher.client.off('user-left', this.onUserLeft);
    this.publisher.client.off('network-quality', this.networkQualityHandler);
    this.publisher.client.off('volume-indicator', this.volumeIndicatorHandler);
    this.publisher.client.off('user-info-updated', this.muteUnmutehandler);
  }

  setupClientHandlers() {
    this.publisher.client.enableAudioVolumeIndicator();
    this.publisher.client.on('user-published', this.onUserPublished);
    this.publisher.client.on('user-unpublished', this.onUserUnpublished);
    this.publisher.client.on('user-joined', this.onUserJoined);
    this.publisher.client.on('user-left', this.onUserLeft);
    this.publisher.client.on('network-quality', this.networkQualityHandler);
    this.publisher.client.on('volume-indicator', this.volumeIndicatorHandler);
    this.publisher.client.on('user-info-updated', this.muteUnmutehandler);
    this.publisher.client.on(
      'connection-state-change',
      this.connectionStateChange
    );
  }

  registerScreenclientHandler() {
    this.publisher.client.on(
      'network-quality',
      this.screenNetworkQualityHandler
    );
  }

  unregisterScreenclientHandler() {
    this.publisher.client.off(
      'network-quality',
      this.screenNetworkQualityHandler
    );
  }

  setupTrackHandlers() {
    if (this.publisher.tracks.screenTrack) {
      this.publisher.tracks.screenTrack.on('track-ended', this.trackHandler);
    }
  }

  unregisterTrackHandlers() {
    if (this.publisher.tracks.screenTrack) {
      this.publisher.tracks.screenTrack.off('track-ended', this.trackHandler);
    }
  }

  trackHandler = () => {
    const emmitData = {
      type: 'screen-share-sttoped',
    };
    this._agora.emit(emmitData);
  };

  getDevices() {
    AgoraRTC.getDevices().then(
      (devices) => {
        this.audioDevices = devices.filter((x) => x.kind == 'audioinput');
        this.videoDevices = devices.filter((x) => x.kind == 'videoinput');
        let emitData = { type: 'DEVICE_OBTAINED' };
        setTimeout(() => {
          this._agora.emit(emitData);
        }, 1000);
      },
      (error) => {
        if (error.code === 'PERMISSION_DENIED') {
          let emitData = { type: 'DEVICE_PERMISSION_DENIED' };
          this._agora.emit(emitData);
        }
        console.log("get device permisison denied",error);
      }
    );
  }

  // it may be used when we implement the token security later
  getToken(channelId, userId) {
    // return new Promise((res, rej) => {
    //   return this._httpService
    //     .getAgoraToken(channelId, userId)
    //     .then((token) => {
    //       return res(token);
    //     })
    //     .catch((err) => rej(err));
    // });
  }
}
