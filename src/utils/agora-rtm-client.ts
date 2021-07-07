import AgoraRTM from 'agora-rtm-sdk';
import EventEmitter from 'events';
export const APP_ID = "7b02736c7baa4137b523645821bb840c" //process.env.REACT_APP_AGORA_APP_ID as string;

export enum ChatCmdType {
  chat = 1,
  gift = 2,
  beautify = 3,
  reaction = 4,
  liveCamera = 5,
  interact = 6,
  invitedStream = 7,
  replay = 8,
  applause = 9,
  interactInviteSent = 10,
  interactInviteAccepted = 11,
  interactInviteRejected = 12,
  interactInviteCanceled = 13,
  interactInviteEnded = 14,
  checkActiveInteraction = 15,
  replyToActiveInteraction = 16,
  raiseHand = 17,
  enableRaiseHand = 18,
  muteAudio = 101,
  unmuteAudio = 102,
  muteVideo = 103,
  unmuteVideo = 104,
  eventEnded = 201,
  openRoom = 202,
  closeRoom = 203
}


export interface ChannelBodyParams {
  account: string
  recordId: string
  content: string
}

export interface ChannelParams {
  type: number
  msgData: any
}

export interface NotifyMessageParams {
  cmd: ChatCmdType
  data: ChatMessage | UserMessage |  ReplayMessage
  enableHistoricalMessaging?: boolean
}



export type ChatMessage = {
  account: string
  content: string
  userId?: string
}

export interface ReplayMessage {
  account: string
  recordId: string
}

export interface UserMessage {
  uid: string
  account: string
  resource: string
  value: number
}


export interface ChatBody {
  account: string
  content: string
}

export interface PeerMessage {
  uid: string
  userId: string
  account: string
  operate: number
}

export interface MessageBody {
  cmd: ChatCmdType
  text?: string
  data?: ChatMessage |
    UserMessage |
    PeerMessage |
    ReplayMessage
}

export default class AgoraRTMClient {

  private _bus: EventEmitter;
  public _currentChannel: any;
  public _currentChannelName: string | any;
  private _channels: any;
  private _client: any;
  private _channelAttrsKey: string | any;
  public _logged: boolean = false;
  private _joined: boolean = false;

  constructor () {
    this._bus = new EventEmitter();
    this._channels = {};
    this._currentChannel = null;
    this._currentChannelName = null;
    this._channelAttrsKey = null;
    this._client = null;
  }

  public removeAllListeners(): any {
    this._bus.removeAllListeners();
  }

  destroy (): void {
    for (let channel of Object.keys(this._channels)) {
      if (this._channels[channel]) {
        this._channels[channel].removeAllListeners();
        this._channels[channel] = null;
      }
    }
    this._currentChannel = null;
    this._currentChannelName = null;
    this._client.removeAllListeners();
  }

  on(evtName: string, cb: (args: any) => void) {
    this._bus.on(evtName, cb);
  }

  off(evtName: string, cb: (args: any) => void) {
    this._bus.off(evtName, cb);
  }

  async login (appID: string, uid: string, token?: string) {
    const rtmClient = AgoraRTM.createInstance(appID);
    try {
      await rtmClient.login({uid, token});
      rtmClient.on("ConnectionStateChanged", (newState: string, reason: string) => {
        this._bus.emit("ConnectionStateChanged", {newState, reason});
      });
      rtmClient.on("MessageFromPeer", (message: any, peerId: string, props: any) => {
        this._bus.emit("MessageFromPeer", {message, peerId, props});
      });
      this._client = rtmClient
      this._logged = true;
    } catch(err) {
      rtmClient.removeAllListeners()
      throw err
    }
    return
  }

  async logout () {
    if (!this._logged) return;
    await this._client.logout();
    this.destroy();
    this._logged = false;
    return;
  }

  async join (channel: string) {
    const _channel = this._client.createChannel(channel);
    this._channels[channel] = _channel;
    this._currentChannel = this._channels[channel];
    this._currentChannelName = channel;
    await _channel.join();
    _channel.on('ChannelMessage', (message: string, memberId: string) => {
      this._bus.emit('ChannelMessage', {message, memberId});
    });

    _channel.on('MemberJoined', (memberId: string) => {
      this._bus.emit('MemberJoined', memberId);
    });

    _channel.on('MemberLeft', (memberId: string) => {
      this._bus.emit('MemberLeft', memberId);
    });

    _channel.on('MemberCountUpdated', (count: number) => {
      this._bus.emit('MemberCountUpdated', count);
    })

    _channel.on('AttributesUpdated', (attributes: any) => {
      this._bus.emit('AttributesUpdated', attributes);
    });
    this._joined = true;
    return;
  }

  destroyChannel(channel: string) {
    if (this._channels[channel]) {
      this._channels[channel].removeAllListeners();
      this._channels[channel] = null;
    }
    // eventRoomStore.setRTMJoined(false);
  }

  async leave (channel: string) {
    if (this._channels[channel]) {
      await this._channels[channel].leave();
      this._joined = false;
      this.destroyChannel(channel);
    }
  }

  async exit() {
    try {
      await this.deleteChannelAttributesByKey();
    } catch (err) {

    } finally {
      await this.leave(this._currentChannelName);
      await this.logout();
    }
  }

  async getChannelMembersList(channel: string): Promise<string[]> {
    if (this._channels[channel]) {
      return await this._channels[channel].getMembers()
    }

    return []
  }

  async notifyMessage(params: NotifyMessageParams) {
    const {cmd, data, enableHistoricalMessaging = false} = params

    const body = JSON.stringify({
      cmd,
      data,
    })

    return this._currentChannel.sendMessage({text: body}, {enableHistoricalMessaging})
  }

  async sendPeerMessage(peerId: string, body: MessageBody) {
    // resolveMessage(peerId, body);
    console.log("[rtm-client] send peer message ", peerId, JSON.stringify(body));
    let result = await this._client.sendMessageToPeer({text: JSON.stringify(body)}, peerId, {enableHistoricalMessaging: true});
    return result.hasPeerReceived;
  }

  async sendRecordMessage(data: Partial<ChannelBodyParams>) {
    const msgData: ReplayMessage = {
      account: data.account as string,
      recordId: data.recordId as string,
    }

    return this.notifyMessage({
      cmd: ChatCmdType.replay,
      data: msgData,
      enableHistoricalMessaging: false
    })
  }

  async sendChannelMessage(data: ChannelParams) {

    return this.notifyMessage({
      cmd: data.type,
      data: data.msgData,
      enableHistoricalMessaging: true
    })
  }
  async updateChannelAttrsByKey (key: string, attrs: any) {
    this._channelAttrsKey = key;
    const channelAttributes: {[key: string]: string} = {}
    if (key) {
      channelAttributes[key] = JSON.stringify(attrs);
    }

    console.log("[rtm-client] updateChannelAttrsByKey ", attrs, " key ", key, channelAttributes);
    await this._client.addOrUpdateChannelAttributes(
      this._currentChannelName,
      channelAttributes,
      {enableNotificationToChannelMembers: true});
  }

  async deleteChannelAttributesByKey() {
    if (!this._channelAttrsKey) return;
    await this._client.deleteChannelAttributesByKeys(
      this._currentChannelName,
      [this._channelAttrsKey],
      {enableNotificationToChannelMembers: true}
    );
    this._channelAttrsKey = null;
    return;
  }

  async getChannelAttrs (): Promise<string> {
    let json = await this._client.getChannelAttributes(this._currentChannelName);
    return JSON.stringify(json);
  }

  async getChannelMemberCount(ids: string[]) {
    return this._client.getChannelMemberCount(ids);
  }
}
