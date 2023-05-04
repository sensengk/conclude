## 1、对接宇航基业的音频和视频的业务需求
宇航基业给了两个demo,一个是音频的，一个是视频的，需要对接到平台上，可以通过平台调用相关的音视频




## 2、 遇到的问题以及解决办法

>   视频demo是可用的，音频demo是不可用的。
    解决： 地址栏输入chrome://flags/#unsafely-treat-insecure-origin-as-secure 使用页面上的搜索框输入Insecure origins treated as secure 将右侧权限Disabled改为Enabled，在输入框中输入允许权限的网址

>   音视频demo文件是分开的
    解决：创建一个link的class， 里面包含websocket的调用以及音视频的开启和关闭

>   多个组件引用同一个模块，会生成多个类
    解决： 单例模式

>   由于需要获取在线的数据以及登录之后获取到相关的admin，而登录之后需要通知相关的方法
    解决： 中介者模式

>   由于视频加载比较缓慢，所以用户在快速点击开始，关闭，再开始，再关闭等连点的情况下，视频并没有加载完毕，而一旦加载了两个以上的视频，传回来的视频会呈现出一卡一卡的， 所以要防止加载两个视频
    解决： 增加视频状态以及截流模式，截流模式让用户在规定时间内只能点击一次开启视频，视频状态让视频一旦连接成功，但是发现是用户已经已经点击了关闭，就断开视频连接，这两个在一定程度保证视频切换不会出现明显的问题

## 3、宇航基业：
>   引入模块

```
    <script charset="utf-8" type="text/javascript" src="https://caps.runde.pro/js/sip-0.13.6.min.js"></script>
  <script charset="utf-8" type="text/javascript" src="https://caps.runde.pro/js/TcPlayer-2.3.1.js"></script>  // 这个引不引入无所谓，目前好像并没有使用到
```

>  视频功能通过webRtc.js 音频功能通过sip, 通过link.js整理音频视频，对外统一暴露出接口
```
    export Link
   
```
>   使用
```
    import Link from './receiver/Link'

    this.link = Link.getInstance()

    this.link.setSiteId(this.SiteId) // 这一块是业务代码，需要增加区域id,来判断是否是宇航基业，只有是宇航基业相关的功能，才可以使用

    // 视频的使用
      if (boolean) {
          this.link.closeWebRtc() // 关闭
        } else {
          // eqname: 设备id    remoteVideo 设备的挂载dom
          this.link.playWebRtc(item.eqName, this.$refs.remoteVideo) // 开启
        }

    // 使用音频以及在线设备前需要先登录，
    
     
     // toke是后端传的
      this.link.login(token, () => {
        // 登录完之后需要做的事情 todo
      
      })
    
    // 音频的使用 
      this.link.setAudioDom(this.$refs.audioDom) // 由于音频，需要依赖dom,所以增加一个隐藏的dom节点
      this.link.audoPlay() // 开启
      this.link.audioEnd() // 关闭
      

    // token 和adminId的获取
      adminId: this.link.getAdminID(),
      token: this.link.getToken(),

    // 在线设备的获取
     this.link.getOnlineDevices((res) => {
         // todo
      })
```


## 4、拓展：
原本的方式是使用@besovideo/webrtc-player这个插件，连接的音频和视频，这个是直接进行的连接，源码是通过typescrpit写的，阅读起来有点费劲， 这个和宇航基业的可以进行结合，整合成一个插件，供所有的使用，但是目前没时间整理。
