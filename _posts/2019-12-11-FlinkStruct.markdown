---
layout:     post
title:      "Flink核心架构解析"
subtitle:   "Flink最重要的知识点"
date:       2019-12-11 14:05:00
author:     "liuzhixing"
header-img: "img/post-bg-2015.jpg"
catalog: true
tags:
    - 大数据
    - Flink
---

### Flink核心架构解析

####  1.Flink简介
简单来说，Flink 是一个分布式的流处理框架，它能够对有界和无界的数据流进行高效的处理。Flink 的核心是流处理，当然它也能支持批处理，Flink 将批处理看成是流处理的一种特殊情况，即数据流是有明确界限的。这和 Spark Streaming 的思想是完全相反，Spark Streaming 的核心是批处理，它将流处理看成是批处理的一种特殊情况， 即把数据流进行极小粒度的拆分，拆分为多个微批处理。

>Flink 有界数据流和无界数据流：
![image](http://note.youdao.com/yws/res/1940/30A88E29B03A44AAAFD471111C8B7B60)

Spark Streaming数据流的拆分：
![image](http://note.youdao.com/yws/res/1942/74CB2D044E0442F697C2DF3A3246DDBD)

#### 2.Flink的核心架构
![image](http://note.youdao.com/yws/res/1944/4A109DA0E99F433FA2F7C0625FBE1364)

##### 2.1 API / Library层
- 编程API：用于流处理的DataStream Api 和用于批处理的DataSet Api
- 顶级类库： 用于结构化查询的SQL/Table库，和用于流处理的机器学习库Alink，批处理的机器学习裤FlinkML等。

##### 2.2 Runtime 核心层
>Flink分布式计算框架的核心实现层，包括作业转换，任务调度，资源分配，任务执行等功能，基于这层实现，可以在流式引擎下同事运行流处理和批处理。

##### 2.3 物理部署层
>使得Flink能够有三种：本地、集群、容器部署方式

#### 3.Flink集群Runtime核心层详解

##### 3.1 核心组件
> Runtime层是一个采用标准Master-Slave架构的模块：
![image](http://note.youdao.com/yws/res/2057/0203F70DA27844CF800391E3AF6708F4)
 - **Master：**
    1. **JobManager：**
        - 1.1 JobManager接受从Dispatcher分发过来的执行程序，该程序包含了作业图（JobGraph），逻辑数据流图，以及对应的class文件以及第三方类库。
        - 1.2 JobManager生成执行作业图，然后向ResourceManager申请资源执行任务，一旦申请到资源，就会将执行图分发给TaskManager。
        - 1.3 JobManager在高可用部署下可以存在多个，其中一个作为leader，其余的处于standby状态，当leader挂掉，会立即在standby的JobManager挑选出replica完整的进行充当leader。
    2. **ResourceManager：**
        - 2.1 负责管理Slots并协调集群资源。ResourceManager接收JobManager的资源请求，并将在空闲Slots中的TaskManager分配给JobManager进行任务的执行。
    3. **Dispatcher：**
        - 3.1 接收客户端提交的执行程序，传递给JobManager。
        - 3.2 提供了一个UI页面，用于监控作业执行情况。

 - **Slave**
    1. **TaskManager：**
        1. TaskManager负责实际的SubTasks（子任务）的执行。
        2. TaskManager中存在多个Slots，Slot是一个固定大小的资源分配单位（计算能力，存储空间），每个Slots能够分配给多个SubTask，在TaskManager启动后，会将其所有的Slots注册在ResourceManager中。

##### 3.2 Task & SubTasks
> TaskManager可以执行的是SubTask，而不是Task。
- Task：Flink在执行作业的时候，会将所有可以链接的操作链接在一起，这就叫做Task。这样做的目的就是减少线程间和网络间的交换，在降低延时的同时可以提高作业整体的吞吐量，但是不是所有的Operator都可以进行链接，如Keyby操作就会导致网络shuffle和重分区，因此需要将它独立成一个Task。因此，Task就是一个可以链接的最小的操作链。![image](http://note.youdao.com/yws/res/2073/21C4AC3471F74980A47C75CA6826EDD1)
- SubTask：一个Task根据并行度，可以分为多个SubTask，如上图，Source&Map、Keyby都是2个并行度，Sink是1个并行度，那么虽然整体上有3个Task，实际上是有5个SubTask：2 + 2 + 1。JobManager负责定义和拆分Task，并将其SubTask交给TaskManager进行执行。



##### 3.3 资源管理
> 说完了Task和SubTask的区别，我们聊下SubTask是如何在TaskManager的Slot中分配的。

![image](http://note.youdao.com/yws/res/2092/4B901ACF57BF4E669FCBB45A0552D169)
这时每个SubTask运行在一个独立的TaskSlot中，它们共享所属TaskManager的Tcp连接和心跳信息，从而可以降低作业整体的开销。但是每个Operator所需的资源是不尽相同的，如果KeyBy所需的资源比Sink多得多，那么此时Sink所在的Slot资源就没有好好利用。

> 基于这个原因，Flink允许多个SubTasks共享一个Slot，并且不管其是否属于一个Task的，只要都是一个Job就可以。

假设上面Source & map 和 keyBy并行度修改成6，而Slot量不变，那么可以变成下图：
![image](http://note.youdao.com/yws/res/2103/593B2C70F47149A6890BE0123A795E37)

和上图相比可以看出，每个Slot中同时运行了多个SubTask。那么Flink是怎么确定一个Job要多少Slot呢？
> 一个作业的Slot数 = 当前作业Operator的最大并行度

从下图可以看出，A&B&D是4个并行度，C&E是2个并行度，那么就需要4个Slot。
如E，如果它全部放在TaskManager2中，那么TaskManager1中每个Slot都需要进行远程调用将数据发送到TaskManager2中，所以在Flink中，会保证多个SubTask均匀分布在多个TaskManager中。
![image](http://note.youdao.com/yws/res/2112/22A5F719703F4D76BB331544685B208D)


##### 3.4 组件通讯
Flink所有组件都基于Actor System进行通讯。
    ![image](https://note.youdao.com/src/8AD35A2FBC854F4FB201E34E5A4A8E0C)