import EventEmitter from 'events';
import AgoraRTC from 'agora-rtc-sdk-ng';

export class AgoraRtcService {
  credentials = null;
  setupDone;
  publisher;
  isChannelJoining = false;
  tokens = {};
  appId = "379a9b85616a40a99e9e92b61b5a80b0";

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

  async createAudioTrack() {
    return new Promise((res, rej) => {

      AgoraRTC.createMicrophoneAudioTrack({
        AEC: true, // acoustic echo cancellation
        AGC: true, // audio gain control
        ANS: true, // automatic noise suppression
        encoderConfig: 'speech_standard',
      })
        .then((track) => {
          this.publisher.client.setClientRole('host');
          this.publisher.tracks.audioVolume = 100;
          this.publisher.tracks.audio = track;
          this.publisher.tracks.audio.setEnabled(true);
          res(true);
        })
        .catch((error) => {
          rej(error);
        });
    });
  }

  createVideoTrack() {
    return new Promise((res, rej) => {
      if (!this.publisher.tracks.video) {
        AgoraRTC.createCameraVideoTrack({
          encoderConfig: '720p',
          optimizationMode: 'detail',
        })
          .then((track) => {
            this.publisher.client.setClientRole('host');
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

  // type : screen/''
  join(type, userDetails) {
    return new Promise(async (res, rej) => {
      // just join the channel
      if (this.isChannelJoining) {
        return rej(false);
      }
      this.isChannelJoining = true;
      const channelId = `${userDetails.room_id}`;
      let token = this.appId;  //for now taken appId as token, as we dont have token security implemented
      let userId = userDetails.user_id;
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
    });
  }

  async leave(type) {
    await this.publisher.client.leave();
    await this.publisher.client.setClientRole('audience');
    this.publisher.isJoined = false;
    this.unregisterCallbacks();
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

  upgradeUserRole() {
    this.publisher.client.setClientRole('host');
  }

  downgradeUserRole() {
    this.publisher.client.setClientRole('audience');
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
    console.log("user published", mediaType, user);

    await this.publisher.client.subscribe(user, mediaType);
    // await this.publisher.client.setStreamFallbackOption(uid, 1);
    if (mediaType === 'video') {
      this.setRemoteStreamType(uid, 'low');
    }
    if (mediaType === 'audio') {
    }
    let emitData = { user, mediaType };
    this._agora.emit("user-published", emitData);

  };

  onUserUnpublished = async (user, mediaType) => {
    await this.publisher.client.unsubscribe(user, mediaType);
    if (mediaType === 'video') {
      console.log('unsubscribe video success');
    }
    if (mediaType === 'audio') {
      console.log('unsubscribe audio success');
    }
    let emitData = { user, mediaType };
    this._agora.emit("user-unpublished", emitData);
  };

  onUserJoined = async (user) => {
    console.log("user published", user);
    // triggers when host join the channel
    console.log('user joined ', user);
    let emitData = { user };
    this._agora.emit("user-joined", emitData);
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
    let emitData = { user, reason };
    this._agora.emit("user-left", emitData);
  };

  muteUnmutehandler = async (uid, msg) => {
    let emitData = { uid, msg };
    this._agora.emit("user-info-updated", emitData);
  };

  unregisterCallbacks() {
    this.publisher.client.off('user-published', this.onUserPublished);
    this.publisher.client.off('user-unpublished', this.onUserUnpublished);
    this.publisher.client.off('user-joined', this.onUserJoined);
    this.publisher.client.off('user-left', this.onUserLeft);
    this.publisher.client.off('user-info-updated', this.muteUnmutehandler);
  }

  setupClientHandlers() {
    this.publisher.client.on('user-published', this.onUserPublished);
    this.publisher.client.on('user-unpublished', this.onUserUnpublished);
    this.publisher.client.on('user-joined', this.onUserJoined);
    this.publisher.client.on('user-left', this.onUserLeft);
    this.publisher.client.on('user-info-updated', this.muteUnmutehandler);
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
}
