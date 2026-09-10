# hmdp — 黑马点评（Redis 实战项目）

跟着 [黑马程序员 Redis 教程](https://www.bilibili.com/video/BV1cr4y1671t) P24 起的实战篇做练习的项目。
代码源自 `cs001020/hmdp`，本仓库在此基础上做了本机适配。

## 分支约定

| 分支 | 用途 |
|------|------|
| `init` | **当前工作分支**，实战篇初始代码，练习在这里写 |
| `master` | 完整版参考代码，只读对照，不要在上面开发 |

`upstream` remote 指向原作者仓库，`origin` 指向本仓库。

## 技术栈与版本

- Spring Boot 2.7.4 / Spring 5.3.23
- MyBatis-Plus 3.5.2、MySQL 8.4、Redis 8.0.5（Lettuce 客户端）
- 编译目标 Java 8，实际运行 JDK 21 / 25

## 运行

### 后端（端口 8081）

```bash
mvn clean compile                      # 验证编译
mvn spring-boot:run                    # 或 IDEA 里直接跑 HmDianPingApplication
```

### 前端（端口 8080，被占用时换端口）

```bash
node serve.js                          # 默认 8080
PORT=8082 node serve.js                # 8080 被占用时
```

打开 http://localhost:8080 —— 静态页面由 `serve.js` 托管，`/api/*` 反代到后端 8081。

`serve.js` 替代了课程里那份 **Windows 版 nginx**（`src/main/resources/nginx-1.18.0/nginx.exe`，
Linux 上跑不了）。用 Node 内置 http 模块实现，零依赖。

8080 若被占用（例如系统自带的 `tomcat10.service`），`serve.js` 会打印换端口提示，
用 `PORT=<端口> node serve.js` 即可，功能不受影响 —— 前端所有请求走相对路径 `/api`。

## 配置与密钥

- **数据库密码走环境变量，不进仓库。** `application.yaml` 里是 `password: ${MYSQL_PASSWORD:}`，
  值从项目根目录的 `.env` 读取（`spring.config.import: optional:file:.env[.properties]`）。
- `.env` 已在 `.gitignore` 中，**不要提交**。新环境拉代码后需自己建：

  ```
  MYSQL_PASSWORD=<本机 MySQL 密码>
  ```

- 数据库 `hmdp` 由 `hmdp.sql` 初始化。注意 `hmdp.sql` 里**没有 `CREATE DATABASE`**，需先手动建库：

  ```bash
  mysql -udev -e "CREATE DATABASE IF NOT EXISTS hmdp DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_general_ci;"
  mysql -udev hmdp < hmdp.sql
  ```

## 已知坑

### 1. Lombok 版本（已修，改动别回退）

Spring Boot 2.7.4 父 POM 默认管理 lombok **1.18.24**，该版本不支持 JDK 17+ 的注解处理器，
在 JDK 21/25 上会**静默失效** —— 表现为满屏 `找不到符号 getXxx()` / `找不到符号 变量 log`，
而不是报 lombok 自身的错。

`pom.xml` 做了两处修改，缺一不可：

1. `<lombok.version>1.18.46</lombok.version>`
2. `maven-compiler-plugin` 显式声明 `<annotationProcessorPaths>` —— JDK 23 起 javac
   不再从 classpath 隐式启用注解处理器，只升级版本号无效。

### 2. 端口占用

- 8080：系统 `tomcat10.service` 占用 → 前端用 8082
- 8081：本项目后端

### 3. 接口返回「功能未完成」

`UserController`、`VoucherOrderController` 里共 5 处 `Result.fail("功能未完成")`，是 `init`
分支的教程占位符，等着自己实现。不是 bug。

## 验证命令

```bash
mvn clean compile                                              # 编译
curl http://127.0.0.1:8081/shop-type/list                      # 后端直连（读 MySQL）
curl http://127.0.0.1:8082/api/shop-type/list                  # 经前端反代
```

启动正常应看到 `Started HmDianPingApplication in x seconds`，且日志中无 `Exception` / `Access denied`。
