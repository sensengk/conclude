在icon.js文件
加上如下代码

```
  export const tower = `data:image/svg+xml,${encodeURIComponent(``)}`
  里面是svg的代码实现
```
引入该相关变量，直接放入image标签中。
