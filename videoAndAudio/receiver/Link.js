import JSWebrtc from "./jswebrtc"
import { Message } from 'element-ui';

// 管理员账号和密码
const _config = {
  deviceIds: '866652021378626' // 公司内部测试的设备
}



class Link {
  // websocket的变量
  i = null; // 心跳定时器
  ws = null; // websocket
  wsInitiativeClose = false
  // 登录所需要的token
  access_token = null
  adminId = null
  loginCb = null
  YONGHANGID = 18
  // 在线设备
  devicesList = []
  callback = null
  waiting = false
  // 视频的变量
  dom = null;
  restart_rtmp = null
  repeatRequest = false
  player = null
  isOpen = false
  // 音频的变量
  audioDom = null
  userAgent = null
  sipsession = null
  sip_info = null
  user_id = null
  _sipId;

  constructor(token) {

    // 初始化websocket
    this.initWebsocket()
    if (token) {
      this.login(token)
    }
    this.instance = null
  }
  static getInstance() {
    if (!this.instance) {
      this.instance = new Link();
    }
    return this.instance;
  }
  setAudioDom(dom) {
    this.audioDom = dom
  }
  setSiteId(id) {
    this.siteId = id
  }
  getAdminID() {
    if (this.siteId != this.YONGHANGID) {
      return null
    }
    return this.adminId
  }
  setAdminId(id) {
    this.adminId = id
  }
  getToken() {
    if (this.siteId != this.YONGHANGID) {
      return null
    }
    return this.access_token
  }
  setToken(token) {
    this.access_token = token
  }
  login(token, cb) {
    this.setToken(token)
    // 定义账号，密码和行为
    var login_json = {
      act: "ma_login",
      access_token: this.getToken(),
    };
    // 登录账号密码
    this.ws.send(JSON.stringify(login_json));
    this.loginCb = cb
  }
  initWebsocket() {
    this.ws = new WebSocket("wss://caps.runde.pro/wss"); //建立websocket连接
    let that = this
    this.ws.onopen = function (e) {
      this.wsInitiativeClose = false;

      that.i = setInterval(() => {
        // console.log("发送心跳保持长连接不超时断开");
        this.send("1");
      }, 25000);
    }
    this.ws.onmessage = function (e) { //监听后台发送信息
      sessionStorage.setItem('UserInfo', e.data)
      let json_obj = JSON.parse(e.data); //转json对象
      switch (json_obj.cmd) {
        case "ma_login": //登录相应处理

          if (json_obj.status) {
            that.sip_info = json_obj.admin_info.sip_info;
            that.setAdminId(json_obj.admin_info.admin_id)
            // 进行注册UA
            that.regUserAgent()
            if (that.waiting) {
              // 如果存在正在等待的获取设备列表的请求，延迟请求
              that.actHandle()
              that.waiting = false
            }
            that.loginCb()
            that.loginCb = null
          } else {
            Message.error(json_obj.msg)
          }
          break;
        case "ma_open_rtsp":
          if (json_obj.status) {
            const openUrl = json_obj.api_url;
            const rtcUrl = json_obj.play_url[3]
            that.player = new JSWebrtc.Player(openUrl, rtcUrl, {
              video: that.dom,
              autoplay: true,
              onPlay: function () {
                window.clearInterval(that.restart_rtmp);
                that.repeatRequest = false
                if (!that.isOpen) {
                  // 如果是由于用户过度点击，视频是异步的，导致状态乱了，直接关闭
                  that.closeWebRtc()
                }
              },
              onFail: function () {
                that.repeatRequest = false
              }
            })

          } else {
            that.repeatRequest = false
            Message.error("请求失败，请检查设备是否在线");
          }
          break;
        case "ma_set_sip_info":
          if (json_obj.status) {
            that.call();
          } else {
            Message.error('请求失败，请检查设备是否在线')
          }
          break;
        case "ma_get_active_devices":
          that.devicesList = json_obj.data || []
          that.notify()
          break;
      }

    }
    this.ws.onclose = function (e) { //监听关闭事件
      // 如果不是主动关闭websocket,需要自动重启
      if (!that.wsInitiativeClose) {
        that.initWebsocket();
      }
      console.log("websocket断开了")
      window.clearInterval(that.i);
    }
    this.ws.onerror = function (e) { //监听异常事件
      that.initWebsocket();
      console.log("websocket异常断开，" + e);
    }
  }
  //关闭websocket
  closeWebSocket() {
    this.wsInitiativeClose = true;
    this.ws.close();
    window.clearInterval(this.i); //关闭计时器
    window.clearInterval(this.restart_rtmp)
    this.closeWebRtc()
  }

  // 注册UA
  regUserAgent() {
    let { sip_id, sip_pwd, sip_host, wss_url, stun_host, turn_host, turn_pwd, turn_user } = this.sip_info, userAgentStatus = false;
    //配置参数
    let config = {
      uri: sip_id + '@' + sip_host, //此sip_id为拨打者账号
      transportOptions: {
        wsServers: [wss_url],
        connectionTimeout: 30
      },
      authorizationUser: sip_id,
      password: sip_pwd,
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionOptions: {
          rtcConfiguration: {
            iceServers: [{
              urls: 'stun:' + stun_host
            }, {
              urls: 'turn:' + turn_host,
              username: turn_user,
              credential: turn_pwd
            }]
          }
        }
      }
    }
    //创建user agent
    this.userAgent = new SIP.UA(config);
    //注册成功监听
    this.userAgent.on('registered', () => {
      userAgentStatus = true;
      // this.getSipIdToCall()
    });
    //注册失败监听
    this.userAgent.on('registrationFailed', (response, cause) => {
      userAgentStatus = false;
      Message.error("用户代理注册失败！")
    });

    this.userAgent.on("invite", function (session) {
      var url = session.remoteIdentity.uri.toString() + "--->call";
      // 用来判断对方给自己发起的来电信息
      var isaccept = confirm(url);
      if (isaccept) {
        //接收来电
        session.accept({
          sessionDescriptionHandlerOptions: {
            constraints: {
              audio: true,
            }
          }
        });
        this.sipsession = session;
        let that = this
        session.on("accepted", function () {
          // We need to check the peer connection to determine which track was added

          var pc = session.sessionDescriptionHandler.peerConnection;
          // Gets remote tracks
          var remoteStream = new MediaStream();
          pc.getReceivers().forEach(function (receiver) {
            remoteStream.addTrack(receiver.track);
          });
          that.audioDom.srcObject = remoteStream;
          that.audioDom.play();


        });
      } else {
        //拒绝来电
        session.reject();
      }
    })

  }

  getSipIdToCall() {
    let sipId = this.getSipIdOrRoomId();
    if (sipId != 0) {
      this._sipId = sipId;
    } else {
      Message.error('获取失败，请检查设备号是否输入正确或设备是否已添加到系统中')
    }

    let msg = {
      act: "ma_set_sip_info",
      user_id: this.user_id,
      v_type: 1
    }

    this.ws.send(JSON.stringify(msg));

  }
  // 获取sipId
  getSipIdOrRoomId() {
    let url = "https://mg.runde.pro/api/index.php?ctl=user&act=get_info_by_device&device_id=" + _config.deviceIds;
    var httpRequest = new XMLHttpRequest();
    httpRequest.open('GET', url, false);
    httpRequest.send();
    if (httpRequest.readyState == 4 && httpRequest.status == 200) {
      var json = JSON.parse(httpRequest.responseText);
      if (json.status) {
        this.user_id = json.data.user_id;
        return json.data.sip_id;
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  }


  // 开始播放视频功能
  playWebRtc(device_ids, d) {
    let deviceIds = device_ids.replace(/\s*/g, "");
    if (deviceIds == "") {
      return;
    }
    if (this.repeatRequest) {
      return
    }
    // 开前先关
    this.closeWebRtc()

    this.repeatRequest = true
    this.dom = d
    let rtmp_msg = {
      act: "ma_open_rtsp",
      device_id: deviceIds
    }
    this.isOpen = true // 状态是开的状态
    this.ws.send(JSON.stringify(rtmp_msg));
    this.restart_rtmp = setInterval(() => {
      this.ws.send(JSON.stringify(rtmp_msg));
    }, 3000);

  }
  // 关闭视频播放功能
  closeWebRtc() {
    setTimeout(() => {
      // 短时间不允许多次请求，所以延迟允许下次开启的时间
      this.repeatRequest = false

    }, 3000)
    this.isOpen = false // 状态是关的状态

    this.player && this.player.destroy()

  }
  // 获取在线设备
  getOnlineDevices(cb) {
    // 如果没有登录，不能访问设备列表
    this.callback = cb
    if (!this.getAdminID()) {
      this.waiting = true
      return
    }
    this.actHandle()
  }
  actHandle() {
    this.ws.send(JSON.stringify({
      act: "ma_get_active_devices",
    }));
  }
  notify() {
    if (this.callback) {
      this.callback(this.devicesList)
      this.callback = null
    }

  }

  // audio 播放
  audoPlay(deviceIds) {
    deviceIds && (_config.deviceIds = deviceIds)
    this.getSipIdToCall()
  }
  // 结束audio
  audioEnd() {
    if (this.sipsession) this.sipsession.terminate();

  }

  // socket简历呼叫连接之后，开始真实的传送语音数据
  call() {
    var host = this.sip_info.sip_host;
    var to = this._sipId;

    this.sipsession = this.userAgent.invite(to + '@' + host, {
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
        }
      }
    });
    let that = this
    this.sipsession.on("accepted", function () {
      // We need to check the peer connection to determine which track was added
      window.sip = that.sipsession
      var pc = that.sipsession.sessionDescriptionHandler.peerConnection;
      // Gets remote tracks
      var remoteStream = new MediaStream();
      pc.getReceivers().forEach(function (receiver) {
        remoteStream.addTrack(receiver.track);
      });
      that.audioDom.srcObject = remoteStream;
      that.audioDom.play();

    });
  }

}





export default Link