# Java 后端学习路径：先做出来，再解释清楚

这套笔记按陈卢敏《Java后端学习路径》整理成七阶段实战手册，新增示例与训练由知序独立编写。它不是视频字幕、逐集摘要或课程官方讲义；未获取六套课程字幕，不标注未经核实的课时和时间戳。

## 课程入口与学习范围

| 阶段 | PDF 指定课程 | 本站笔记入口 | 必须交付 |
| --- | --- | --- | --- |
| Java | 尚硅谷 Java 零基础入门，PDF未指定BV号 | 01—03 | 能重启恢复数据的学生管理器 |
| MySQL | [BV1Cm421373b](https://www.bilibili.com/video/BV1Cm421373b/)，1—57集 | 04—05 | 五表电商数据库与查询 |
| Spring Boot | [BV1Es4y1q7Bf](https://www.bilibili.com/video/BV1Es4y1q7Bf/) | 06—07 | 用户管理、登录、校验、分页 |
| Redis | [BV1cr4y1671t](https://www.bilibili.com/video/BV1cr4y1671t/)，基础篇与实战篇 | 08—09 | 缓存、库存预扣、锁的边界 |
| RabbitMQ | [BV1mN4y1Z7t9](https://www.bilibili.com/video/BV1mN4y1Z7t9/) | 10—11 | 可重试、可去重的异步订单 |
| Spring Cloud | [BV1UJc2ezEFU](https://www.bilibili.com/video/BV1UJc2ezEFU/) | 12—13 | 两服务调用与故障演练 |
| 学成在线 | [BV1j8411N7Bm](https://www.bilibili.com/video/BV1j8411N7Bm/) | 14 | 可部署、可解释、有独立修改的项目 |

## 每个学习单元的高效做法

1. 带着一个任务看视频，例如“为什么LEFT JOIN之后用户消失了”。先看问题再找对应片段。
2. 读笔记的状态、调用链和代码；关闭笔记，在空文件中重写核心部分。
3. 除了成功输入，再试一个失败输入：重复提交、缺失参数、断开数据库、重启进程。
4. 用自己的话记录三行：解决什么问题；为何这样做；什么条件下会失效。
5. 次日从练习而非重看视频开始。答不出的部分才回看；不要把播放进度当掌握程度。

## 代码与版本约定

纯Java示例以JDK17以上语法为基线。SQL面向MySQL8系列；Redis示例只使用常见命令和Lua能力。Spring示例按Boot3系列的`jakarta.validation`命名说明，属于集成片段，必须放到依赖匹配的工程中；不是从视频提取的完整项目。

跟课复现时先使用课程提供的pom与环境版本，不要只升级一个组件。另建实验分支尝试新版本，并查对应版本文档。网页上“最新文档”不等于旧课程可直接使用的依赖组合。

本套将线程池、JVM/GC深挖、MySQL MVCC原理等保留为后续方向；学习锁和消息重试前仍需掌握“并发执行可能交错”这个基本事实。

## 如何判断能进入下一阶段

可运行只是起点。每阶段必须能：展示正常结果；复现一次失败并解释原因；用测试证明修复；画出数据从入口到存储的路径。最终检查见《15-复习与验收》。

## 资料身份

学习顺序与阶段任务来自用户提供PDF。技术解释是按该顺序独立编写，具体API可查每篇文末官方链接。课程版本、完整目录与源码未核实，不把附加练习称为原课程作业，也不声称覆盖视频中每一节。


---

# Java：从变量到可维护的对象

本课目标：不用框架，能表达学生、商品和订单，并知道一个变量到底保存了什么。视频顺序参考PDF；本篇为独立整理。

## 一条程序执行链

源文件经编译生成字节码，JVM执行入口方法。先检查`java -version`和`javac -version`是否指向预期JDK。IDE能运行而终端失败，优先检查工作目录、classpath和JDK，而不是改业务代码。

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("今天写出第一个接口之前，先把Java写明白");
    }
}
```

保存为Hello.java，执行`javac -encoding UTF-8 Hello.java`，再执行`java Hello`。类名大小写与文件名保持一致；运行时不加`.class`。

## 类型选择决定后续错误

| 需求 | 初学时的选择 | 典型坑 |
| --- | --- | --- |
| 数量、年龄 | int，并检查范围 | 数据可能为负并不意味着业务允许为负 |
| 数据库ID、累计数量 | long | `int*int`先溢出再赋long；改成`1L*a*b` |
| 金额 | BigDecimal或整数分 | double的二进制表示不适合精确金额相等判断 |
| 文本 | String | 用`==`比较内容会比较引用身份 |
| 时间点 | Instant等时间类型 | 显示时区与存储时区混在一起 |
| 可为空的数 | Integer/Long | 自动拆箱可能空指针 |

```java
String a = new String("book");
String b = new String("book");
System.out.println(a == b);      // false：两个不同对象
System.out.println(a.equals(b)); // true：内容一致
long total = 1L * 100_000 * 100_000; // 先提升再相乘
```

## 对象不是一袋公开变量

对象把数据与合法操作组织起来。构造器保证创建时有效；方法限制状态变化；私有字段防止外部绕过规则。

```java
final class Stock {
    private int remaining;
    Stock(int initial) {
        if (initial < 0) throw new IllegalArgumentException("库存不能为负");
        remaining = initial;
    }
    boolean reserve(int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("数量必须为正");
        if (remaining < quantity) return false;
        remaining -= quantity;
        return true;
    }
    int remaining() { return remaining; }
}
```

它只演示单线程对象约束，不解决多线程、跨进程库存竞争。以后把同样的“检查与扣减”规则移动到数据库条件更新或Redis脚本中，才能讨论并发原子性。

## 参数传递与多态

Java始终按值传参。对象参数传递的是引用值的副本：方法可通过它修改同一个可变对象，但把形参重新赋为新对象不会替换调用者变量。String不可变，“修改字符串”其实是得到新的String。

接口描述能力，类提供实现；调用接口方法时执行实际对象的实现。先用接口隔离“文件保存”与“内存保存”，比为了练继承而构造复杂父子关系更有价值。重载看参数签名，重写看继承/实现关系；不要只靠返回类型区分重载。

## 练习与验收

- 给Stock补充补库存方法，拒绝非正数，并考虑整数上溢。
- 创建容量3的库存，预订2成功，再预订2失败，最终为1。
- 用一句话解释：为什么这段代码放进两个服务器后无法阻止超卖？答案应涉及共享状态与原子操作，而不是“服务器太快”。

官方延伸：[Java语言与面向对象](https://dev.java/learn/)。本篇示例是学习用代码，业务范围检查应由具体需求决定。


---

# Java：集合、泛型、异常与文件读写

本课目标：把学生按学号管理，按条件查询，发生错误时能定位原因。先学会API和数据流，暂不深入HashMap源码或JVM调优。

## 先按操作选择集合

| 操作模式 | 合适结构 | 需要说明的限制 |
| --- | --- | --- |
| 按顺序遍历、按下标读 | ArrayList | 中间插删会移动元素 |
| 学号查找学生 | Map<String,Student> | 重复key的put会覆盖旧值 |
| 判断是否出现过 | HashSet | 对象的equals/hashCode必须一致 |
| 保留插入顺序 | LinkedHashMap | 不是自动按key排序 |
| 按key排序 | TreeMap | 排序规则必须稳定 |

不要把可变姓名作为HashMap身份key。可以改名的实体用稳定学号或ID索引；若对象作key，参与equals/hashCode的字段放入后不能随意修改。

```java
Map<String, Integer> counts = new HashMap<>();
for (String word : List.of("java", "sql", "java")) {
    counts.merge(word, 1, Integer::sum);
}
System.out.println(counts.get("java")); // 2
```

`Map<K,V>`的泛型让类型错误尽早暴露。泛型不能直接用int作为参数，写Integer。`List.of`产生不可修改列表，不要对它调用add；需要修改时包装成`new ArrayList<>(...)`。[Map API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)

## Lambda与Stream解决什么

Lambda是传递行为，例如比较、过滤、转换。Stream适合表达数据加工流水线；不意味着执行更快，也不意味着可以忽略异常和副作用。

```java
List<String> names = students.stream()
    .filter(s -> s.age() >= 18)
    .sorted(Comparator.comparing(Student::id))
    .map(Student::name)
    .toList(); // 结果不可修改；需修改时另建ArrayList
```

不要在并行Stream中随意向普通ArrayList写入共享结果。初学阶段优先使用普通循环处理有状态业务，方便调试。

## 异常堆栈阅读顺序

先读异常类型和消息，再找到自己工程中最靠近抛出点的栈帧；有`Caused by`继续向下找根因。不要只复制第一行搜索。记录输入、发生步骤、文件路径或SQL参数的非敏感部分。

- 参数不合法：入口校验，给可理解的错误。
- 文件不存在：首次启动可创建；用户指定路径错误则明确报告。
- 格式损坏：指出行号，不要静默丢弃再覆盖原文件。
- 资源占用：用try-with-resources释放打开的流。

```java
try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
    for (String line; (line = reader.readLine()) != null; ) {
        System.out.println(line);
    }
} catch (IOException e) {
    throw new UncheckedIOException("读取失败：" + path.toAbsolutePath(), e);
}
```

## 保存数据不是简单覆盖

可靠的本地保存思路：先写同目录临时文件，成功后再替换正式文件。若文件系统支持，可尝试原子移动；不支持时回退的替换不具备相同崩溃保证。这个过程不自动解决多个进程同时写入。

大文件不要一次`readAllLines`塞进内存；本手册小型学生管理器允许一次读入，是为了聚焦基本功能。[Files API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/file/Files.html)

## 自测

1. 两个不同对象字段相同，Set为什么可能仍认为不同？检查equals/hashCode。
2. catch后只打印“出错了”再继续，可能有什么后果？调用方会把失败误判成成功。
3. 学号已经存在时如何避免覆盖？先检查，再按业务决定拒绝或更新；并发场景需原子方法或持久层约束。


---

# Java阶段项目：能重启恢复数据的学生管理器

目标是独立完成CRUD与文件持久化。这里给出一个可运行的命令行最小实现；它是本站示例，不是课程源码。使用JDK17或更高版本。

## 接口先写清楚

```text
java StudentApp add S001 小林 20
java StudentApp list
java StudentApp update S001 小林 21
java StudentApp delete S001
```

每条命令都启动新进程，正好检验是否真的把数据写入文件。文件相对于当前工作目录；换目录运行会读另一份文件。

## 完整代码

保存为StudentApp.java。名字不允许制表符或换行，文件使用TSV而非完整CSV；复杂文本可在后续改成JSON。

```java
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class StudentApp {
    record Student(String id, String name, int age) {}
    static final Path FILE = Path.of("students.tsv");
    static final Map<String, Student> data = new LinkedHashMap<>();

    static String field(String value) {
        if (value.isBlank() || value.contains("\t") || value.contains("\n")
                || value.contains("\r")) {
            throw new IllegalArgumentException("字段不能为空或含制表符、换行");
        }
        return value;
    }
    static Student parse(String id, String name, String ageText) {
        int age = Integer.parseInt(ageText);
        if (age < 0 || age > 150) throw new IllegalArgumentException("年龄范围0—150");
        return new Student(field(id), field(name), age);
    }
    static void load() throws IOException {
        if (!Files.exists(FILE)) return;
        int lineNumber = 0;
        for (String line : Files.readAllLines(FILE, StandardCharsets.UTF_8)) {
            lineNumber++;
            try {
                String[] fields = line.split("\t", -1);
                if (fields.length != 3) throw new IllegalArgumentException("列数错误");
                Student s = parse(fields[0], fields[1], fields[2]);
                if (data.putIfAbsent(s.id(), s) != null)
                    throw new IllegalArgumentException("学号重复");
            } catch (IllegalArgumentException ex) {
                throw new IOException("数据文件第" + lineNumber + "行损坏", ex);
            }
        }
    }
    static void save() throws IOException {
        Path temp = Files.createTempFile(FILE.toAbsolutePath().getParent(), "students-", ".tmp");
        try {
            List<String> lines = new ArrayList<>();
            for (Student s : data.values())
                lines.add(s.id() + "\t" + s.name() + "\t" + s.age());
            Files.write(temp, lines, StandardCharsets.UTF_8);
            try {
                Files.move(temp, FILE, StandardCopyOption.REPLACE_EXISTING,
                        StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException ex) {
                Files.move(temp, FILE, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temp);
        }
    }
    public static void main(String[] args) {
        try {
            load();
            if (args.length == 1 && args[0].equals("list")) {
                data.values().forEach(System.out::println);
                return;
            }
            if (args.length == 4 && (args[0].equals("add") || args[0].equals("update"))) {
                Student s = parse(args[1], args[2], args[3]);
                boolean exists = data.containsKey(s.id());
                if (args[0].equals("add") && exists)
                    throw new IllegalArgumentException("学号已存在");
                if (args[0].equals("update") && !exists)
                    throw new IllegalArgumentException("学号不存在");
                data.put(s.id(), s);
            } else if (args.length == 2 && args[0].equals("delete")) {
                if (data.remove(args[1]) == null)
                    throw new IllegalArgumentException("学号不存在");
            } else {
                throw new IllegalArgumentException("用法：list / add 学号 姓名 年龄 / update 学号 姓名 年龄 / delete 学号");
            }
            save();
            System.out.println("保存成功：" + FILE.toAbsolutePath());
        } catch (IOException | IllegalArgumentException ex) {
            System.err.println(ex.getMessage());
            if (ex.getCause() != null) System.err.println("原因：" + ex.getCause().getMessage());
            System.exit(1);
        }
    }
}
```

## 验收表

| 操作 | 预期 |
| --- | --- |
| 空目录首次list | 不报错，列表为空 |
| add后重新list | 能看到新增学生 |
| 重复add | 非零退出，原记录不被覆盖 |
| update后重新list | 新年龄持久化 |
| 非法年龄 | 报错，文件内容不变 |
| 删除不存在学号 | 明确报告，不假装成功 |
| 手动把TSV改成坏行 | 提示行号，不自动覆盖损坏文件 |

## 进一步练习

把存储逻辑抽成StudentRepository接口，再增加一个内存实现，比较“业务逻辑”和“存到哪里”的职责。该程序未设计多进程并发写入；不能靠临时文件方案宣称已解决并发冲突。

相关API：[Files](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/file/Files.html)。示例独立编写，运行验证情况见总验收记录。


---

# MySQL：用五张表建一个电商练习库

对应PDF的MySQL阶段（指定视频1—57集），以建模、CRUD和JOIN为核心。本篇SQL只在新建练习库运行，不需要删除已有数据库。

## 先说清实体关系

一个用户有多个订单；一个订单有多条明细；一个商品属于一个分类；明细保存下单时的单价。商品改价后，旧订单金额不应随之变化，因此明细价格是必要的历史快照。

```text
app_user 1 ── N purchase_order 1 ── N order_item N ── 1 product N ── 1 category
```

## 五表DDL

```sql
CREATE DATABASE IF NOT EXISTS zhixu_shop CHARACTER SET utf8mb4;
USE zhixu_shop;
CREATE TABLE app_user (
  id BIGINT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE
);
CREATE TABLE category (
  id BIGINT PRIMARY KEY,
  name VARCHAR(64) NOT NULL
);
CREATE TABLE product (
  id BIGINT PRIMARY KEY,
  category_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL,
  CONSTRAINT fk_product_category FOREIGN KEY(category_id) REFERENCES category(id),
  CONSTRAINT ck_product_price CHECK(price >= 0),
  CONSTRAINT ck_product_stock CHECK(stock >= 0)
);
CREATE TABLE purchase_order (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user FOREIGN KEY(user_id) REFERENCES app_user(id),
  INDEX idx_user_created(user_id, created_at, id)
);
CREATE TABLE order_item (
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY(order_id, product_id),
  CONSTRAINT fk_item_order FOREIGN KEY(order_id) REFERENCES purchase_order(id),
  CONSTRAINT fk_item_product FOREIGN KEY(product_id) REFERENCES product(id),
  CONSTRAINT ck_quantity CHECK(quantity > 0),
  CONSTRAINT ck_unit_price CHECK(unit_price >= 0)
);
```

MySQL8.0.16之前不能依赖CHECK像现代版本一样执行校验。更旧课程环境仍需服务层校验，并核对对应版本支持范围。主键保证身份唯一，外键保证引用有效，业务规则并不能全靠字段类型表达。

## 一组用于手算的数据

以下初始化只执行一次；重复执行会因主键冲突失败，这是有意保留的保护。

```sql
INSERT INTO app_user VALUES (1,'小林'),(2,'小周'),(3,'小夏');
INSERT INTO category VALUES (1,'图书');
INSERT INTO product VALUES (101,1,'Java练习册',30.00,10),(102,1,'SQL练习册',40.00,5);
INSERT INTO purchase_order(id,user_id,status) VALUES (1001,1,'PAID'),(1002,1,'CREATED'),(1003,2,'PAID');
INSERT INTO order_item VALUES (1001,101,2,30.00),(1001,102,1,40.00),(1002,101,1,30.00),(1003,102,2,40.00);
```

手算结果：1001金额100；1002金额30；1003金额80。小林已支付100，小周已支付80，小夏0。

## CRUD要先确认影响范围

```sql
SELECT id,name,stock FROM product WHERE id=101;
UPDATE product SET stock=stock-1 WHERE id=101 AND stock>=1;
-- 检查受影响行数：1表示成功，0表示不存在或库存不足。
SELECT id,name,stock FROM product WHERE id=101;
```

不要“先SELECT库存，再无条件减库存”；并发线程可能读到同一个旧值。条件更新把约束放在同一条数据库操作里。删用户前先决定订单应保留、匿名化还是禁止删除，不能为了测试方便直接级联抹掉历史。

## 自测

为什么明细主键是订单ID和商品ID的组合？这里假设同订单同商品合并成一行；有规格、优惠或独立行号时要重新建模。为什么用户名和ID都设唯一约束？前者是业务唯一性，后者是实体身份，解决的问题不同。

官方参考：[MySQL建表](https://dev.mysql.com/doc/refman/8.4/en/create-table.html)。

补充核对：[CHECK约束版本说明](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html)。


---

# SQL：JOIN、分组、分页与事务的实际写法

本篇使用上一课的五表数据。每写一条查询先手算结果，再执行验证；先理解结果集合，再讨论索引。

## LEFT JOIN的条件放在哪里

```sql
SELECT u.id,u.username,COUNT(o.id) AS paid_orders
FROM app_user u
LEFT JOIN purchase_order o ON o.user_id=u.id AND o.status='PAID'
GROUP BY u.id,u.username
ORDER BY u.id;
```

结果为小林1、小周1、小夏0。`COUNT(o.id)`只数有订单的行；`COUNT(*)`会把外连接补出的空行也算进去。如果把`o.status='PAID'`移到WHERE，右表为空的小夏就被过滤掉。ON决定如何匹配，WHERE对匹配结果做筛选。[JOIN语法](https://dev.mysql.com/doc/refman/8.4/en/join.html)

## 订单金额与重复统计

```sql
SELECT o.id,COALESCE(SUM(i.quantity*i.unit_price),0) AS amount
FROM purchase_order o
LEFT JOIN order_item i ON i.order_id=o.id
GROUP BY o.id
ORDER BY o.id;
```

订单连到多条明细后，订单行被展开。此时`COUNT(o.id)`不是订单数；按需求使用`COUNT(DISTINCT o.id)`，或先在子查询中汇总明细再JOIN。`SUM`忽略NULL，但没有有效输入时可能返回NULL，展示金额时按业务用COALESCE处理。

练习：按用户汇总已支付金额，保留从未购买的用户。提示：支付条件留在LEFT JOIN的ON里，再连接明细。不要把多条明细误当多笔订单。

## 分页必须有稳定排序

```sql
SELECT id,user_id,status FROM purchase_order
WHERE user_id=1 ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET 0;
```

只按时间排序，同一时间的多条记录顺序可能不稳定，因此增加唯一ID作为次排序。深分页可以使用游标条件：`created_at < lastTime OR (created_at=lastTime AND id<lastId)`，并保持相同排序。游标不是随便把页码换成ID；时间、ID和筛选条件必须共同一致。

## 事务把多个写入作为一个业务单元

在程序中开启事务，条件扣库存成功后插入订单和明细，全部成功才提交。任一步失败都回滚。手动SQL演示可写START TRANSACTION，但分支判断与回滚需要调用程序处理，不能执行失败后还无条件COMMIT。

```text
begin
  update product set stock=stock-quantity where id=? and stock>=quantity
  若影响行数不是1：rollback，返回售罄
  insert purchase_order
  insert order_item
commit
任何异常：rollback，记录订单号与错误
```

本地事务只能约束该数据库事务里的操作，不能自动回滚已发出的HTTP请求或Redis修改。[InnoDB事务模型](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)

## 索引入门要能观察

用EXPLAIN查看查询计划；观察访问方式、候选索引、估计行数。索引不是越多越好，会增加写入维护成本。组合索引应围绕真实筛选和排序设计；不要一上来只背“最左前缀”而不跑查询。

## 验收与排错

- 能解释WHERE与HAVING：前者筛行，后者筛分组结果。
- 订单1001的两条明细不会让用户订单数从1变2。
- 在两个连接中同时抢最后一件商品，最终只能一个扣减成功。
- 发生死锁时重试整个事务，且业务身份不变；不能从任意中间SQL继续。
- 空结果、NULL、重复行和整数除法是四类不同问题，逐一构造样例。


---

# Spring Boot：把一次HTTP请求走明白

对应PDF的Spring Boot阶段。本篇使用Boot3风格的jakarta校验注解；示例是集成片段，需Web、Validation和对应数据访问依赖，并非可单文件启动的项目。

## 请求经过哪些层

```text
客户端JSON → 路由匹配 → 参数反序列化与校验
          → Controller → Service → Mapper → MySQL
          ← HTTP状态码 + 响应DTO ← 业务结果
```

Controller负责HTTP协议与参数，Service负责业务规则和事务边界，Mapper负责SQL。不要把“这个用户能不能改订单”只写在前端，也不要把数据库实体原样返回给客户端。

## 常用注解按职责记

| 注解 | 解决的问题 | 常见误解 |
| --- | --- | --- |
| @RestController | 返回响应体 | 不等于自动拥有认证与权限 |
| @RequestMapping / @GetMapping | 路径与方法匹配 | GET不能用来修改业务数据 |
| @PathVariable | 接收路径上的资源ID | URL里能改ID，所以要验证权限 |
| @RequestParam | 查询参数 | 注意默认值、空字符串与范围 |
| @RequestBody | JSON绑定到DTO | 不是自动验证业务规则 |
| @Valid | 触发对象约束校验 | DTO字段必须有约束，复杂跨字段规则另写 |
| @Service | 注册业务组件 | 不是所有方法都自动有事务 |

```java
// import jakarta.validation.constraints.*;
public record CreateUserRequest(
    @NotBlank @Size(max=32) String username,
    @NotBlank @Size(min=8,max=64) String password
) {}

// import jakarta.validation.Valid;
// 示例中UserService、UserView由项目定义。
@RestController
@RequestMapping("/api/users")
class UserController {
    private final UserService service;
    UserController(UserService service) { this.service = service; }

    @PostMapping
    ResponseEntity<UserView> create(@Valid @RequestBody CreateUserRequest request) {
        UserView user = service.create(request);
        return ResponseEntity.status(201).body(user);
    }
}
```

依赖使用构造器注入，让对象所需条件一目了然，也方便测试。密码只是请求字段，响应DTO不要包含password或passwordHash。

## 错误响应也属于接口设计

| 情况 | 状态码建议 | 调用方下一步 |
| --- | --- | --- |
| 参数格式错误 | 400 | 修正输入 |
| 未登录或凭据无效 | 401 | 登录或更新凭据 |
| 已登录但无权限 | 403 | 不应盲目重试 |
| 资源不存在 | 404 | 检查资源ID |
| 用户名或业务键冲突 | 409 | 换值或读取已有结果 |
| 服务内部异常 | 500 | 保留traceId，服务端查日志 |

用`@RestControllerAdvice`集中处理异常。不要把SQL、堆栈、服务器路径或密码直接返回客户端；服务端记录完整异常，响应提供可定位的traceId和稳定错误码。校验失败与JSON反序列化失败可能由不同异常触发，要分别测试。[Spring校验说明](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html)

## Postman验收矩阵

同一接口至少测试：正常创建；空用户名；过长用户名；无效JSON；重复用户名；缺少认证；登录后越权访问其他用户。保存请求集合，避免每次手工改URL。

分页参数先归一化，page至少1，size限制在合理上限，例如100；不要把客户端传来的任意排序字段直接拼到SQL里。

官方参考：[Spring Boot参考文档](https://docs.spring.io/spring-boot/reference/)。跟课时切到所用版本，不把文档当前最新版本强塞进旧课程工程。


---

# 接口落地：MyBatis、登录与事务边界

目标是完成用户管理闭环：注册、登录、列表分页、修改与权限检查。本篇给出职责划分与关键片段，完整认证过滤器和依赖由项目集成，不把几行JWT代码当作完整认证系统。

## SQL参数不要靠字符串拼接

```xml
<select id="findByUsername" resultType="com.example.UserEntity">
  SELECT id, username, password_hash AS passwordHash
  FROM app_user
  WHERE username = #{username}
</select>
```

`#{...}`通常通过预编译参数绑定；`${...}`直接替换文本，不用于接收用户输入。动态列名、排序方向无法简单当普通值绑定，必须从服务端白名单中选择。[MyBatis参数说明](https://mybatis.org/mybatis-3/sqlmap-xml.html)

前面五表是SQL练习模型。开发登录前应显式迁移新增password_hash等字段，并使用独立响应DTO；不要把练习库里的用户名直接当成已验证身份。

## 注册流程的真正边界

```text
校验输入 → 规范化用户名 → 计算密码哈希
        → 插入用户（用户名有唯一约束）→ 返回不含敏感字段的DTO
```

“先查询不存在再插入”不能保证并发安全，两个请求可以同时查到不存在。数据库唯一约束是最终防线；捕获明确的唯一键冲突并映射为409，其他数据库异常不能一律说成“用户名重复”。

密码使用Spring Security的PasswordEncoder做单向哈希；登录用matches检查，不重新生成哈希后直接比较字符串。不要保存明文或可逆加密密码。[密码存储](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html)

```java
// PasswordEncoder由安全配置提供，示意业务调用。
String storedHash = encoder.encode(rawPassword);
boolean valid = encoder.matches(loginPassword, storedHash);
```

## 登录不是“查到用户就算成功”

- 服务端验证凭据后建立Session或签发令牌，选定一种主要方案并理解其生命周期。
- Session通常由Cookie携带；Cookie的HttpOnly、Secure、SameSite及CSRF策略需要与部署方式一起设置。
- JWT需要验证签名、有效期和预期的颁发者/受众；“解码成功”不等于可信。
- 用户ID从验证后的身份上下文获取，不相信请求体里的userId。
- 每次访问具体资源还需检查所有权或角色；认证通过不代表拥有所有权限。

## 事务放在业务操作上

```java
@Transactional
public OrderView placeOrder(PlaceOrderCommand command) {
    int changed = productMapper.decreaseIfEnough(command.productId(), command.quantity());
    if (changed != 1) throw new StockNotEnoughException();
    // 后续任一数据库写入失败，应让异常传播并触发回滚。
    orderMapper.insert(command);
    return orderMapper.findView(command.orderId());
}
```

这是结构示例，Command、Mapper、异常需要项目自行定义。Spring默认代理事务常见陷阱是同类内部调用绕过代理；默认回滚规则对受检异常与运行时异常不同，应按业务明确配置。不要catch后吞掉异常再返回成功，也不要在数据库事务里长时间等待远程接口。

## 阶段验收

注册后密码列不可读出明文；重复用户名不创建第二行；登录失败不生成有效身份；用户A不能修改用户B；订单明细写入失败后库存恢复；分页返回稳定结果。用数据库断言验证回滚，不能只看前端弹窗。

练习：给用户修改接口增加版本号，旧版本更新影响0行时返回冲突，解释它与用户名唯一约束解决的问题为何不同。

补充核对：[事务代理与调用边界](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html) · [默认回滚规则](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html)。


---

# Redis：先选结构，再设计键与过期

对应PDF的Redis基础篇与实战篇。本篇围绕用户资料、商品缓存、签到与排行榜解释常见结构；结构选对之后，还要说明它是否是唯一数据源。

## 五种常见类型

| 类型 | 示例场景 | 示例命令 | 容易忽略的点 |
| --- | --- | --- | --- |
| String | 缓存JSON、计数器 | GET / SET / INCR | 过期与序列化格式要统一 |
| Hash | 多字段对象 | HGET / HSET | 不要假设所有旧版本支持字段级TTL |
| List | 两端插入读取 | LPUSH / RPOP | 简单列表不自动具备可靠消息语义 |
| Set | 去重、集合关系 | SADD / SISMEMBER | 无序，不负责排名 |
| Sorted Set | 排行榜 | ZADD / ZREVRANGE | 相同分数还需理解成员排序规则 |

```redis
SET product:101:summary '{"name":"Java练习册","price":"30.00"}' EX 300
GET product:101:summary
HSET user:1 name 小林 level 1
SADD activity:7:users 1 2 3
SISMEMBER activity:7:users 2
ZADD course:rank 10 course-101 20 course-102
ZREVRANGE course:rank 0 9 WITHSCORES
```

命令仅用于练习命名空间，真实环境应避免在已有业务key上随意执行覆盖。String的SET可同时指定条件与过期，减少分步操作留下的中间状态。[SET官方文档](https://redis.io/docs/latest/commands/set/)

## 缓存旁路的一次读写

读：先查缓存，命中就返回；未命中查询数据库，写缓存并设置TTL，返回数据库结果。

写：先成功提交数据库变更，再让对应缓存失效。不能在数据库回滚后仍返回“缓存已更新”的结果。数据库与缓存之间通常没有共同事务，因此要接受并控制一致性窗口。

```text
读请求A：缓存未命中 → 查询旧数据库值 ─────────→ 写入旧缓存
写请求B：                 更新数据库 → 删除缓存
```

这个交错说明“先更新数据库再删缓存”不是绝对强一致。按业务选择短TTL、版本校验、延迟再次失效或变更事件重建；延迟删除仍可能受调度和网络影响。余额和最终库存判断不能只信缓存。

## 三类缓存问题

- 穿透：请求的数据根本不存在。输入校验、短TTL空值缓存、布隆过滤器可减少穿透；布隆有误判，不能当精确数据库。
- 击穿：一个热点key失效，大量请求同时回源。互斥重建、提前刷新、逻辑过期各有延迟和陈旧度取舍。
- 雪崩：大量key或整个Redis同时失效。分散TTL、限流、降级和容量预案共同处理，随机TTL不能解决整个Redis宕机。

## 验收实验

为商品接口增加日志，区分缓存命中与数据库查询。连续请求同商品，验证第二次命中；更新数据库后检查缓存失效；请求不存在商品100次，观察数据库压力是否下降；停止Redis时接口应按设计降级或清晰失败，不能无限重试拖垮数据库。

每个key记录：业务含义、类型、所有者、TTL、删除时机、是否允许丢失。缺少这张表，后续很容易把临时缓存误当永久状态。


---

# Redis实战：库存预扣、Lua与分布式锁

本课解决并发操作交错，不把“加一把锁”当成完整订单一致性方案。先区分Redis预扣库存与数据库最终订单：前者通过，不代表后者已落库。

## 为什么两个单独命令不够

两个请求可能同时GET到库存1，然后各自DECR，结果变为-1。检查和扣减必须是同一个原子操作。Redis Lua可把一段短逻辑放在服务端执行；脚本执行的原子性不等于出现运行期错误后会回滚之前已执行的写命令。[脚本说明](https://redis.io/docs/latest/develop/programmability/eval-intro/)

下面演示“一人一次、库存预扣”；约定KEYS[1]是库存字符串、KEYS[2]是购买用户集合，调用前保证类型正确并完成活动初始化。

```lua
-- 返回：0成功，1售罄，2重复，3活动未初始化
local stock = tonumber(redis.call('GET', KEYS[1]))
if stock == nil then return 3 end
if redis.call('SISMEMBER', KEYS[2], ARGV[1]) == 1 then return 2 end
if stock <= 0 then return 1 end
redis.call('DECR', KEYS[1])
redis.call('SADD', KEYS[2], ARGV[1])
return 0
```

Redis Cluster中脚本涉及的key需要位于同一槽，可用同一活动标签，如`stock:{7}`与`buyers:{7}`。库存设置与过期规则应统一，不能只让库存过期而留下永久重复购买标记。

## 锁要能识别拥有者

```redis
SET lock:resource random-owner-token NX PX 10000
```

NX保证不存在时才加锁，PX设置租期。令牌每次获取都不同，释放必须“比较令牌再删除”，不能先GET再单独DEL，也不能无条件DEL。

```lua
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
```

假设A暂停超过租期，B拿到新锁；A恢复后不能删B的锁。即使比较删除正确，A仍可能继续执行已过期的业务。因此长暂停、自动续约失败、主从故障切换等场景仍需讨论；重要资源可在存储端结合版本或fencing token拒绝旧持有者写入。分布式锁不是跨系统事务。

## 订单可靠性还缺哪一段

```text
Redis预扣成功 → 发送下单事件 → 消费者写MySQL → 标记结果
```

如果进程在预扣成功后、发送前崩溃，就出现悬挂预扣。必须有可查询的预订记录、超时扫描与幂等补偿，或选择能持久化事件的设计。先在MySQL同一事务中落业务状态与outbox再投递，是一种路径；若坚持Redis优先，也需要对应的可靠事件记录与对账方案，不能只写“失败再加回库存”。

## 验收用例

初始库存10，100个不同用户并发请求，预扣成功数最多10，库存不为负；同用户重复请求不重复预扣；锁过期后旧令牌释放不能删除新锁；人为终止发送进程后能查出悬挂预订并恢复。记录Redis预扣数与数据库订单数的差异，而非仅统计HTTP200。

参考：[Redis分布式锁模式](https://redis.io/docs/latest/develop/use/patterns/distributed-locks/)。此处展示基本模式与限制，不宣称单节点租约锁在所有故障模型下提供强互斥。


---

# RabbitMQ：交换机、队列与一次消息旅行

对应PDF的RabbitMQ阶段。目标是知道消息经过哪些位置，以及每一处的成功各自代表什么。

## 先画路由，再写监听器

```text
生产者 → exchange（按绑定规则路由） → queue（保存待消费消息） → 消费者
```

一个交换机可路由到多个队列；同一队列的多个普通消费者通常竞争处理消息；想让两个业务各收到一份，要建立两个队列分别绑定，而不是只启动两个消费者。

| 交换机类型 | 路由规则 | 典型用途 |
| --- | --- | --- |
| direct | routing key精确匹配 | 按明确事件类型分发 |
| topic | 点分词的通配模式 | `order.*`、`order.#`等事件分类 |
| fanout | 广播到所有绑定队列 | 多订阅方通知 |
| headers | 消息头匹配 | 特定属性组合路由 |

## 一个可追踪的订单事件

```json
{
  "eventId": "evt-20261111-001",
  "eventType": "OrderRequested",
  "schemaVersion": 1,
  "orderId": "ord-001",
  "userId": 123,
  "productId": 101,
  "quantity": 1
}
```

eventId标识同一事件的重投，orderId标识业务订单。重试不要重新生成业务ID，否则消费者无法知道它其实是同一笔请求。消息只传业务所需字段，不复制整个用户对象或密码。

## Spring集成的最小形状

```java
// 教学片段：需要Spring AMQP依赖、连接配置、队列/交换机/绑定声明。
@RabbitListener(queues = "order.create")
public void onOrder(OrderRequested event) {
    orderService.applyOnce(event);
}
```

`applyOnce`不是框架方法，需要自己实现幂等事务。自动确认模式的实际行为取决于容器配置；不是“加上注解就保证业务只执行一次”。JSON消息转换器、监听容器确认模式、并发度和重试配置都应写在项目README中。

## 三种成功不能混为一谈

1. 发送调用返回：可能只说明客户端接受调用。
2. publisher confirm：说明代理按其保证处理了发布，不说明消费者业务完成；无法路由的消息也要单独处理返回机制。
3. consumer ack：消费者向代理确认交付处理，但能否证明业务提交取决于ack放在何时。

持久队列、持久消息、确认与副本策略分别解决不同层面的风险，不能拿其中一个替代其他全部机制。[RabbitMQ可靠性指南](https://www.rabbitmq.com/docs/reliability)

## 实验

建立一个direct交换机、两个绑定不同routing key的队列；发三种key，观察未匹配消息去哪。再把同一key绑定到两个队列，各开一个消费者，验证两个订阅方各收到消息。最后只保留一个队列开两个消费者，观察竞争分配。

验收时记录exchange、routing key、queue、eventId与消费结果，让消息失踪能定位到具体一段。


---

# 异步订单：重复、丢失、重试与补偿

这一课把Redis与RabbitMQ阶段连接起来。核心目标不是“消息永远不重复”，而是允许重投时，业务效果仍正确且可以追踪。

## 消费幂等必须和业务提交一起考虑

```sql
CREATE TABLE processed_event (
  consumer_name VARCHAR(64) NOT NULL,
  event_id VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(consumer_name,event_id)
);
```

消费者在同一数据库事务中插入幂等记录并完成订单写入。若事务回滚，幂等记录也回滚；若提交成功但ACK丢失，重投看到已存在记录就不再次执行。不能先在Redis标记“已处理”，随后数据库失败却永远跳过。

```text
begin
  插入(consumer,eventId)处理标记
  若是已提交的同事件唯一键冲突：确认已有结果，结束本次处理
  执行业务订单写入及最终库存约束
commit
事务成功后ACK
失败则按错误类别进行有限重试或送失败队列
```

唯一键冲突只针对幂等记录的指定键处理，不能把其他业务约束错误也当作消费成功。

## 生产端outbox思路

把“业务状态变化”和“待发送事件”写入同一MySQL事务。投递任务读取outbox，发送并等待确认，再标记发送状态。若发送成功后标记失败，可能再次发送，所以消费幂等仍必需。

这个方案适用于数据库主导的操作。上一课的Redis先预扣不是同一事务，不能仅加一张outbox就宣称原子化；还需要预订状态、补偿或调整库存事实来源。

## ACK、重试和死信

消费者ACK应在持久化业务成功后发出；先ACK后崩溃可能丢业务，提交后ACK失败则可能重投。[确认机制](https://www.rabbitmq.com/docs/confirms)

| 错误 | 处理倾向 | 原因 |
| --- | --- | --- |
| 短时数据库不可用 | 有退避的有限重试 | 可能自行恢复 |
| 无法解析的消息 | 隔离并告警 | 重试原文通常无效 |
| 业务已完成 | 返回已有结果并确认 | 不重复扣款或落单 |
| 参数永久不合法 | 记录失败状态 | 不应无限占用消费线程 |

拒绝并重新入队可能形成高速循环。死信交换机需要显式配置；消息进入死信的条件与队列类型、策略有关，不能假设所有异常自动流入死信。死信不代表已经修复，要有查看、纠错、重放与审计入口。[死信机制](https://www.rabbitmq.com/docs/dlx)

## 状态机与用户体验

异步下单接口成功接收后返回请求号和待处理状态，客户端查询最终结果。不要把“已入队”显示成“支付成功”。建议区分PENDING、SUCCEEDED、FAILED、COMPENSATING，并定义允许的状态迁移，使用条件更新阻止过期任务覆盖已成功状态。

## 故障演练清单

同一消息投递两次，只产生一笔订单；提交后主动断开ACK连接，再消费仍不重复；发送未确认时重试不换eventId；坏消息不永久堵住健康消息；暂停消费者时能观察队列积压；补偿执行两次不会把库存加回两次。

作业：写一张“崩溃点→已发生副作用→恢复动作”的表，至少覆盖预扣后、发布后、数据库提交后、ACK前四个位置。


---

# Spring Cloud：先让两个服务可靠地互相找到

对应PDF的Cloud阶段。先建立商品服务与订单服务，理解注册发现、配置和HTTP调用，再加入更多组件。微服务不是把每张表拆成一个进程。

## 版本先形成一张表

记录JDK、Spring Boot、Spring Cloud release train、Spring Cloud Alibaba、Nacos服务端、Sentinel、Seata的实际版本。使用课程工程的依赖管理文件，查看最终依赖树，不能从不同博客各抄一个最新版本。

Spring Cloud与Boot有对应关系，Alibaba还有自己的适配组合；按对应版本发布说明核对。[Spring Cloud](https://spring.io/projects/spring-cloud/) · [Alibaba版本说明](https://sca.aliyun.com/docs/2023/overview/version-explain/)

## Nacos两种职责

注册中心保存服务实例地址与健康信息，消费者按服务名发现实例。配置中心管理环境配置及变更；两者可由同一产品提供，但概念不同。

```text
product-service实例 → 注册到Nacos
order-service → 查询/缓存实例列表 → 选择实例 → HTTP调用商品接口
```

服务注册成功不代表接口可访问：还要检查注册地址是否是调用方能访问的地址、端口、健康状态、网络与认证。不要在容器里把localhost当作另一个容器。

配置按环境隔离，避免开发服务读取生产数据库。刷新行为取决于配置加载方式与bean的使用方式，不能默认每个字段都能无重启热更新。密码放受控配置，不提交到公共仓库。

## Feign是一层HTTP客户端封装

```java
// 需要启用Feign与匹配的依赖；ProductView由项目定义。
@FeignClient(name = "product-service")
interface ProductClient {
    @GetMapping("/internal/products/{id}")
    ProductView find(@PathVariable("id") Long id);
}
```

声明的是服务契约，实际仍有序列化、网络、超时、状态码和连接池。服务名发现依赖相应注册发现与负载均衡组件；只加Feign注解不自动获得全部能力。[OpenFeign文档](https://docs.spring.io/spring-cloud-openfeign/reference/spring-cloud-openfeign.html)

设置连接超时与读取超时，区分“没连上”和“对端处理慢”。查询通常可重试，但创建订单若没有幂等键，重试可能重复下单。不要让网关、Feign和业务层各自重试三次，形成请求倍增。

## Gateway该做什么

网关统一入口、路由、认证入口、限流与追踪信息传递；业务服务仍需要可靠身份验证和资源权限检查。不能仅依赖“正常流量都从网关进来”。明确转发后的路径变化，避免前缀被StripPrefix多删一层。

## 两服务验收

1. 商品服务提供查询，订单服务通过服务名调用，禁止写死某台电脑IP。
2. 商品服务启动两个实例，停止其中一个后观察发现与恢复过程。
3. 停止全部商品实例，订单接口在约定超时内失败，不无限挂起。
4. 经过网关与直接调用的路径都能解释；请求有同一个traceId可关联日志。
5. 保存各环境配置与启动顺序，但不把凭据写入README。


---

# Cloud进阶：限流、熔断与事务的选择

本篇是七阶段路径中的必要边界知识。目标是能设计可验证的故障行为，而不是把Nacos、Sentinel、Seata的名字全部写进简历。

## 三个不同问题

| 机制 | 面对的问题 | 触发依据 | 对用户意味着什么 |
| --- | --- | --- | --- |
| 限流 | 流量超出承载能力 | 请求速率、并发等 | 被拒绝或排队，需明确提示 |
| 熔断 | 下游持续故障，调用拖累上游 | 失败率、慢调用比例等 | 暂停部分真实调用，等待探测恢复 |
| 降级 | 主能力暂不可用 | 故障或主动策略 | 返回可接受的替代结果或明确失败 |

熔断通常有关闭、打开、半开探测等状态。阈值、统计窗口和最小请求数决定其行为，配置后必须注入故障观察，不能只截图控制台。[Sentinel熔断](https://sentinelguard.io/en-us/docs/circuit-breaking.html)

商品详情可降级为稍旧的缓存；创建订单失败不能降级成“成功”。替代结果要能被调用方区分，否则系统看似可用却制造错误业务事实。

## 分布式事务为何出现

订单服务写订单库，库存服务写库存库：两个本地事务各自成功，不保证共同成功。异常可能发生在远程提交成功但响应丢失之后，所以“调用报错就认为对方没执行”是不安全的。

优先判断能否不拆这段一致性边界。如果必须跨服务，再根据业务选择：最终一致性事件与补偿；TCC的预留/确认/取消；适合关系型数据库写场景的Seata AT；或其他事务方案。每种方案都有前提，不是可互换标签。

## Seata AT要能解释到哪个程度

AT模式通过数据源代理、分支登记与undo日志等机制协调事务。学习时画出业务服务、事务协调器与数据库的位置，检查对应版本支持的数据库和SQL限制。它不是在任意方法上加注解就能回滚Redis、文件写入与外部HTTP副作用。[AT模式](https://seata.apache.org/docs/user/mode/at/)

不要在未接入事务协调的路径上做冲突写入，再期待全局回滚自然安全；全局锁、隔离与脏写处理都需要按实际配置验证。

## 一份有用的故障实验记录

```text
实验：库存服务延迟超过调用超时
输入：固定业务请求号 req-001，数量1
预期：客户端得到明确待确认/失败状态，不生成两笔订单
观察：订单表、库存表、消息/outbox、trace日志
恢复：查询req-001实际结果，幂等重试或执行定义好的补偿
证明：恢复前后记录数、库存变化、最终状态
```

还应测试库存提交后响应丢失、事务协调器短时不可用、补偿执行失败再重试。补偿不是任意反向SQL：商品已发货后不能简单删除订单，需要业务认可的退货/退款流程。

## 口头自测

- 为什么`@Transactional`不能自动管理两个不同服务的数据库？事务上下文与资源边界不同。
- 超时一定代表业务失败吗？不一定，对端可能已提交。
- 熔断恢复后为什么先少量探测？避免立即放回全部流量再次压垮下游。
- 哪些操作不应自动重试？没有幂等设计的有副作用操作。


---

# 学成在线：把课程项目变成自己的工程作品

PDF指定学成在线微服务实战。这里按认证、课程、媒体、发布与网关建立独立复盘框架，不声称取得课程源码，也不虚构原项目接口、分集目录或压测数据。

## 先跑通一条纵向业务链

```text
教师登录 → 新建课程草稿 → 上传封面/媒体 → 保存教学计划
        → 提交发布 → 学生查看公开详情
```

不要第一天同时启动所有扩展组件。先使用课程README确认最小依赖、数据库初始化顺序、对象存储与服务版本，再逐段检查。每走通一步都保存一个可复现请求和预期数据库变化。

## 模块职责与资料归属

| 模块 | 核心职责 | 不应越界承担 |
| --- | --- | --- |
| 认证 | 身份、登录会话/令牌、基础权限 | 课程全部业务判断 |
| 课程 | 草稿、分类、教学计划、发布状态 | 在HTTP线程里同步长时间转码 |
| 媒体 | 上传、文件元数据、处理任务状态 | 仅凭客户端文件名决定存储路径 |
| 网关 | 路由、统一入口、流量控制 | 假装替代所有服务端鉴权 |
| 搜索（扩展） | 面向检索的公开索引 | 成为课程事实数据的唯一来源 |

## 认证与权限的验收

用教师A创建课程后，教师B即使知道课程ID也不能修改。公开详情只能返回已发布且允许公开的字段。不要只在菜单上隐藏按钮；测试直接构造HTTP请求。

请求DTO、数据库实体与公开响应分离。课程删除或撤回后，搜索索引和缓存可能稍后更新，必须规定一致性窗口，并能重建索引。

## 媒体上传与任务

分片上传要有uploadId、分片序号和完成状态。重复上传同一分片应幂等，合并前核对分片齐全、大小或校验信息。不要只拼接客户端路径；使用服务端生成的对象键，限制大小和允许的类型。

转码适合异步任务：记录PENDING、PROCESSING、SUCCEEDED、FAILED，失败原因与重试次数可查。进程重启后“处理中”的旧任务如何接管，要有租约或超时恢复机制。数据库记成功前，应确认实际目标文件可读取。

## 发布不只是改一个布尔值

发布前校验课程信息与必要媒体状态。数据库确认发布后，以可靠事件更新搜索索引和缓存。重复消费同一发布事件不能产生多份索引；用课程ID作为稳定文档ID，并考虑版本，防止旧事件覆盖新内容。

Elasticsearch和Seata按路径作为遇到实际需求再补的部分；不要仅为了“技术栈丰富”引入所有组件。

## 至少做三处自己的修改

- 课程编辑增加乐观锁：两个教师同时编辑，旧版本得到冲突而非静默覆盖。
- 媒体失败任务支持人工重试：记录操作者、原因、次数，重试保持业务身份。
- 增加发布事件对账：查已发布但索引缺失的课程，支持幂等修复。

每项保留修改前的问题、设计、失败用例、测试结果和取舍。不必假装实现了大规模生产架构。

## 项目README结构

```text
项目解决的问题与主要角色
架构图：每条线标HTTP、消息或数据库访问
准确版本与环境变量清单（不含密码）
首次初始化与启动顺序
一条完整演示链及测试账号创建方法
三项独立改进及验证方法
故障排查、已知限制、后续计划
```

## 压测记录要能复现

注明机器资源、实例数、数据量、接口、并发模型、持续时间、预热与缓存状态。报告吞吐、P50/P95/P99、错误率，并同步观察数据库、线程池和队列。不要把本机一次峰值写成系统稳定能力；读缓存接口与真实落单接口应分别测试。

项目入口：[PDF指定课程](https://www.bilibili.com/video/BV1j8411N7Bm/)。技术细节使用相应组件官方文档与课程匹配版本核对。


---

# 七阶段复习：用证据证明自己会了

这份清单用于结束每个阶段，而不是用来催进度。不会的部分回到对应笔记和原视频，补一个失败样例，比从头重看整套课程更有效。

## 闭卷自测与答案要点

| 问题 | 合格答案至少包含 |
| --- | --- |
| Java对象参数到底传了什么 | 引用值的副本；修改对象与重绑形参不同 |
| Map中学号重复会怎样 | 普通put会覆盖；根据业务拒绝或更新 |
| LEFT JOIN后没订单的用户为何消失 | WHERE筛掉右表NULL行；条件位置影响结果 |
| 多表JOIN后订单数为何变大 | 一对多展开；先聚合或按订单ID去重 |
| 注册前查用户名为什么仍会重复 | 并发竞争；数据库唯一约束作为最终防线 |
| 登录成功是否等于有权改任意资源 | 认证与授权不同；按身份检查资源归属 |
| 缓存更新为什么仍可能读到旧值 | 读写交错与跨系统非原子；设计一致性窗口 |
| Redis Lua是否出错自动回滚 | 不保证回滚已执行写命令，应校验前提 |
| 消费消息提交后ACK丢失怎么办 | 可能重投；幂等记录与业务同事务 |
| 接口超时是否一定没执行 | 可能已提交，只是响应未到达 |
| 远程调用何时能自动重试 | 先明确幂等身份、上限、退避与总超时 |
| 项目性能指标如何证明 | 环境、数据、负载模型、分位延迟与错误率 |

## 分层排错顺序

1. 先记录一个可复现输入、时间和traceId。
2. HTTP层：路径、方法、Content-Type、认证、状态码。
3. 应用层：校验、业务分支、事务是否真的生效。
4. 存储层：连接、SQL参数、约束、受影响行数、事务提交。
5. 中间件：Redis key类型/TTL；消息绑定、确认、重试与积压。
6. 分布式链路：实例地址、配置环境、超时与版本适配。

不要看到500就重装框架，也不要只提高超时掩盖慢查询。先判断错误发生在哪一跳，再修复最小问题。

## 七阶段交付目录

```text
learning-evidence/
  java/           StudentApp.java、操作记录、损坏文件用例
  mysql/          schema.sql、seed.sql、queries.sql、预期结果
  boot/           依赖版本、请求集合、鉴权与回滚测试
  redis/          key设计表、并发库存结果、缓存命中实验
  rabbitmq/       拓扑图、重复消息实验、崩溃恢复记录
  cloud/          版本矩阵、两服务调用、故障实验
  capstone/       架构图、README、独立修改、压测说明
```

## 复习节奏

第一次学习后立刻闭卷重写核心代码；次日做一个变式；一周后用失败场景自测。这里的时间只是建议，不是视频课时安排。每次复习只记录仍然解释不清的点，并给它配一个具体实验。

## 学习完成度与本站实现状态

本文档提供路径化知识笔记与示例，不等于七个完整后端项目已经交付。学生管理器是可独立编译的完整示例；Spring、Redis、消息与微服务部分包含集成片段、设计步骤与验收实验，需要读者在对应环境实现运行。

原PDF是8页，目录中的部分页码与实际PDF页面不一致；本书架按七阶段主题组织，避免依赖原目录页码。六个课程BV号保留原文，Java课程未给出唯一链接，因此不自行挑一个版本冒充原课。

## 补充官方资料

- [Java学习入口](https://dev.java/learn/)
- [MySQL8.4手册](https://dev.mysql.com/doc/refman/8.4/en/)
- [Spring Boot参考](https://docs.spring.io/spring-boot/reference/)
- [Redis命令](https://redis.io/docs/latest/commands/)
- [RabbitMQ可靠性](https://www.rabbitmq.com/docs/reliability)
- [Spring Cloud](https://spring.io/projects/spring-cloud/)

阅读时切换到工程所用版本。本文核对日期为2026-11-11；版本支持状态以后可能变化。
