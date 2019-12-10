---
layout:     post
title:      "Flink的State和CheckPoint机制"
subtitle:   "Flink最重要的知识点"
date:       2019-12-05 12:05:00
author:     "liuzhixing"
header-img: "img/post-bg-2015.jpg"
catalog: true
tags:
    - 大数据
    - Flink
---

> “如果想要理解CheckPoint，那么必须先理解State是啥”

### 那么，什么是State？
State是流计算过程中生成的中间计算结果和元数据，比如：
- 1.消费Kafka的时候中间的offset信息
- 2.对一个实时流进行实时累加操作，reduce函数生成的累加值等等中间信息。

### State的类型和存储方式
**State主要分成两类：**
-    KeyedState：主要是在对流进行KeyBy操作的时候，每个Key的Value值就是一个字节数组，每个Key都有属于自己的State，并且不同Key之间的State是彼此不可见的。
-    OperatorState：Flink自带的SourceConnector实现中，就会使用到OperatorState来记录数据读取到的offset信息。

**State存储方式：**
-  内存HeapStateBackend --只能在Debug模式使用，不建议在生产模式使用。
    1. MemoryStateBackend：State数据保存在java堆内存中，执行CheckPoint时，会将内存中的State直接传送给JobManager。（存在Task和JobManager直接连接的开销）
    2. FsStateBackend：CheckPoint数据写入到文件中，将文件路径传递给JobManager。（如果本地文件数据丢失，那么整个State信息也丢失，没有实现HA）
- 基于RockDb的RockDBStateBackend --本地文件 + 异步HDFS持久化，建议在生产环境中使用
    - RockDBStateBackend会在本地文件系统中维护State，并且将State直接写入本地RocksDb中，与此同时还需要配置一个远端文件系统，在做Checkpoint的同时，会将数据也写一份在FlieSystem（通常是HDFS）中保证高可用，在本地failOver的时候从FileSystem恢复到本地。


> “好了，讲完了State，就让我们揭开CheckPoint的秘密”

### CheckPoint原理
CheckPoint是通过JobManager进行定时下发Barrier，多并行度的有状态Operator进行State存储产生全局性SnapShot的过程。

其中Flink的检查机制实现了标准的Chandy-Lamport算法，用于实现分布式快照，在分布式快照当中有一个核心的元素：Barrier。
- **单流Barrier：**
   ![image](http://liuzhixing.cn/img/doc-pic/2.FlinkStateAndCheckPoint/1.png)
    
    1. Barrier通过JobManager下发到Source，严格遵循顺序。
    2. 每个Barrier携带这个一个ID，用于对无限长数据进行切分成一个个记录集合。
    3. 不会中断流处理，轻量级。

- **多流Barrier对齐：**
    ![image](http://liuzhixing.cn/img/doc-pic/2.FlinkStateAndCheckPoint/2.png)
    1. 不止一个输入流流经Operator，需要进行并行流Barrier的对齐操作。
    2. 可以看到超前的Barrier数据会放置在inputBuffer中，等待另一输入流的Barrier到达之后，才进行数据处理操作。

- **Exactly Once（恰好一次） 和 At Least Once（至少一次）**
    1. 流对齐操作会对数据处理带来额外的延时，通常在几毫秒左右，但是也不排除一些异常导致的延时明显增加的情况，一些对于延时性要求比较高的系统中，就可以选择将流对齐操作关闭。
    2. 流对齐操作可以保证每次Checkpoint生成State保存的时候都是严格有序的，根据Barrier进行的多流聚合成一个State的操作，该操作可以保证是Exactly Once（恰好一次）。
    3. 如果关闭了流对齐操作，假设一个流barrier-n，5个并行度，这个时候4个并行度的barrier-n都已经到达了，但是剩下一个并行度barrier-n没到达，这个时候会将这个并行度的barrier-n作为barrier-n+1的一部分进行checkpoint成state。在故障恢复barrier-n+1的时候，会将barrier-n的一个并行度数据也进行恢复，保证了At Least Once（至少一次）。

- **异步State存储**
    1. 上述机制意味着每次CheckPoint生成State时，后端都会停止处理数据输入，进而产生延时。
    2. 在Flink的CheckPoint中可以进行并行度的配置，使其State生成异步化：当Operator接收到所有Barrier的时候，立即将Barrier发出到下游，开启State复制线程进行备份，并继续进行流数据处理，当复制完成后，Operator向JobManager确认CheckPoint。
    3. 当所有有状态的Operator都已经确认完成备份后，这个CheckPoint才算完成。
   
### **有状态Operator操作:**
![image](http://liuzhixing.cn/img/doc-pic/2.FlinkStateAndCheckPoint/3.png)
1. 有状态的Operator在接受到Barrier后会进行State SnapShot的存储操作，由于SnapShot的状态可能会很大，因此选择使用RockDBStateBackend。Flink通过定时保证数据一致性，异步将本地存储的状态指向持久性存储（RockDB、HDFS等）保证高可用。
2. 当数据存储到RockDBStateBackend持久性存储（HDFS）后，会向存储的文件指针记录在Master（JobManager）中。
    
### 故障恢复过程
1. 通过JobManager读取当前错误最近一次的全局SnapShot的文件指针，从fileSystem（HDFS）中获取具体CheckPoint的SnapShot。
2. Flink进行分布式数据流重新部署，并为每个Operator进行State的加载，源设置为当前State的消费偏移量（Kafka中就是offset = k）。
3. 如果State是增量的SnapShot，则Operator从最新完整的状态开始。
    
### CheckPoint的配置
1. **CheckPoint开关**
    - 默认作业的CheckPoint功能是Disable的。
    - CheckPoint开启之后，默认是Exactly-Once语义。
    - CheckPoint的checkPointMode有两种，Exactly-Once和At-least-once
    - Exactly-Once对于大多数应用都是最适合的。At-least-once能够支持某些低延时（1ms以内）的应用作业。
2. **CheckPoint配置调优**
    
```
  StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

  // 每隔1000 ms进行启动一个检查点【设置checkpoint的周期，JobManager进行Barrier下发的时间间隔】
  env.enableCheckpointing(1000);
  
  // 高级选项：
  // 设置模式为exactly-once （这是默认值）
  env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);
  // 确保检查点之间有至少500 ms的间隔【checkpoint最小间隔】
  env.getCheckpointConfig().setMinPauseBetweenCheckpoints(500);
  // 检查点必须在一分钟内完成，或者被丢弃【checkpoint的超时时间】
  env.getCheckpointConfig().setCheckpointTimeout(60000);
  // 同一时间只允许进行一个检查点
  env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
  // 表示一旦Flink处理程序被cancel后，会保留Checkpoint数据，以便根据实际需要恢复到指定的Checkpoint【详细解释见备注】
  env.getCheckpointConfig().enableExternalizedCheckpoints(ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);
  
  cancel处理选项：
  （1）ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION:
  表示一旦Flink处理程序被cancel后，会保留Checkpoint数据，以便根据实际需要恢复到指定
  的Checkpoint
  
  （2）ExternalizedCheckpointCleanup.DELETE_ON_CANCELLATION:
  表示一旦Flink处理程序被cancel后，会删除Checkpoint数据，只有job执行失败的时候才会
  保存checkpoint
```
