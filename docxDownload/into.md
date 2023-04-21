## 1、下载docx文件的需求
因为下载出来的文件需要给客户使用，并且让客户进行调整，所以只能使用docx,不能使用最简单处理的pdf.
docx文件包含文字，图片，表格，以及直通横线。

## 2、需求的实现方式
一：目前wps和office都是支持web版式，所以前端可以产生一个html文件，只需要把文件下载下来，并且更改后缀名，就能被加载出来。

二：word的底层是xml，如果需要使用页面版式的方式，需要利用插件产生原word页面版式，然后下载下来。插件做的处理为
        html -> 经过解析 html + image -> xml -> 加载 document.tpl 定义的文档语法 -> 转化成buffer


## 3、 遇到的问题

>   使用第一种方式的下载的时候遇到了如下问题：

wps打开默认是web版式，样式是从左到右的，文字靠左，表格全屏，图片靠左，呈现的样式就会混乱
切换到页面模式打开，样式就没问题了，但是软件会根本文件内容的模式选择初次打开的方式。不可控的
Office居然不能打开代码是html的docx， 如果更改后缀名为html就可以打开。做的真不如WPS.
      
>   使用第二种方式遇到的问题：

这个模式支持WPS和office，但处理的结果中图片的宽度和直通横线宽度不一致。前端的横线是字符串，所以样式仅仅在这一块有问题。

## 4、解决办法：
第一种方式废弃
使用第二种方式，由于html和xml的语法不一致， 只需要在前端让横线宽度变长，溢出隐藏，而生成的docx的横线字符串添加的刚刚好，就没问题了。
局限性就是需要手动比对字符串距离，而且文档的宽度不能变化，如果变化就会需要手动调整横线的宽度。

## 5、具体实现：

>   引入依赖
```
    import htmlDocx from 'html-docx-js/dist/html-docx'
    import saveAs from 'file-saver'
```
>   canvas转变成base64  
```
    let dom = this.$refs.exportdom
      this.canvases = dom.querySelectorAll('canvas')
      // 遍历图表，转换为 base64 静态图片
      if (this.canvases.length) {
        this.canvases.forEach((canvas, i) => {
          // let echart = canvas.getContext('2d');
          let url = canvas.toDataURL()
          let img = document.createElement('img')
          img.src = url
          img.style.width = '100%'
          img.style.height = '100%'
          canvas.parentNode.parentNode.style.display = 'none'
          canvas.parentNode.parentNode.parentNode.appendChild(img)
        })
      }
```


>   生成文档
```
      let content = `<!DOCTYPE html><html>
            <head>
                <meta http-equiv="Content-Type"  content="application/msword;charset=UTF-8">
            </head>
            <body>
                    ${JSON.parse(JSON.stringify(dom.innerHTML))}
            </body>
            </html>`

      var converted = htmlDocx.asBlob(content, {
        orientation: 'landscape',
        margins: { left: 1440, right: 1440, top: 1680, bottom: 720 },
      })

      saveAs(converted, `${this.project.projectname}工地报告.docx`)
```

## 6、参考
    https://blog.csdn.net/weixin_45465901/article/details/114979276?spm=1001.2014.3001.5501  一些常用的下载方式
    https://github.com/zuck/jsdocx.git  使用es6的一个插件，可以链式调用生成添加文档，但是不支持图片， 使用比较麻烦，没有解析dom这个功能
    https://github.com/evidenceprime/html-docx-js.git   比较老的一个插件，底层使用的coffee
