---
layout:     post
title:      "The new begining"
subtitle:   "New Blog，New Begining"
date:       2019-11-19 12:00:00
author:     "liuzhixing"
header-img: "img/post-bg-2015.jpg"
catalog: true
tags:
    - 监控系统
    - 存储
---

> “Yeah It's on. ”

碎碎念：
2019 年，总算有个地方可以好好写点东西了。

自己的 Blog 就这么开通了，兜兜转转，曾经想着自己要在知乎、简书上面坚持每天写点东西，做技术积累的同时也能分享一些经验。可笑的是，分享的习惯没养成，期间学习积累的东西，都变成NotePad中的一个个文档。然而这个念头在心中从未挥散开去，正巧工作不忙，便弄了起来。

作为一个程序员， Blog 这种轮子要是挂在大众博客程序上就太没意思了。一是觉得大部分 Blog 服务都太丑，二是觉得不能随便定制不好玩。之前因为太懒没有折腾，结果就一直连个写 Blog 的地儿都没有。

在玩了一段时间知乎之后，答题的快感又激起了我开博客的冲动，一不做二不休，花一天搞一个吧！

[跳过废话，直接看技术实现 ](#build) 




<p id = "build"></p>

## 博客搭建过程总结

接下来说说搭建这个博客的技术细节。  
正好之前就有关注过 [GitHub Pages](https://pages.github.com/) + [Jekyll](http://jekyllrb.com/) 快速 Building Blog 的技术方案，非常轻松时尚。

---
其优点非常明显：
* **Markdown** 带来的优雅写作体验
* 非常熟悉的 Git workflow ，**Git Commit 即 Blog Post**
* 利用 GitHub Pages 的域名和免费无限空间，不用自己折腾主机
	* 如果需要自定义域名，也只需要简单改改 DNS 加个 CNAME 就好了 
* Jekyll 的自定制非常容易，基本就是个模版引擎

---
#### 具体操作步骤
- 1.在Github Pages中，fork一份创建一个Repositories，我这边是fork这个大佬的：https://github.com/Huxpro/huxpro.github.io，重命名为：github名称.github.io

- 2.rename完之后，只需要直接访问：github名称.github.io，就可以看到对应的博客页面了（已经成功一大半了~）

- 3.如果自己想要配置一个域名，比如直接访问liuzhixing.cn就可以看到博客，需要进行以下步骤：
	- 3.1  买一个域名：可以去阿里云/腾讯云的域名服务，根据自己的喜好选一个域名，我这个在腾讯云买的，挺便宜，12元一年拿下。
	https://dnspod.cloud.tencent.com/
	- 3.2 Ping一下github名称.github.io这个域名，看一下其具体的ip地址，我这边获得的是185.199.109.153，进入第三步。
	- 3.3 进行域名解析：在管理平台中，进行相关的域名解析操作，如图：![](http://liuzhixing.cn/img/doc-pic/1.The%20new%20begining/3.3.png)
	- 3.4 修改Github配置：在Repositories项目，选择Setting，修改Custom Domain信息
	 ![](http://liuzhixing.cn/img/doc-pic/1.The%20new%20begining/3.4.png)

- 4.直接访问liuzhixing.cn，就可以直接访问到自己的博客项目，配置成功。


## 后记

回顾这个博客的诞生，纯粹是出于个人兴趣。
如果你恰好逛到了这里，希望你也能喜欢这个博客主题。

—— liuzhixing 后记于 2019.11.19日