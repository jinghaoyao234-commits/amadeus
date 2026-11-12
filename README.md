# Amadeus · 记忆接入终端

一个移动优先、无需构建、无后端的 PWA 同人学习项目。所有界面与文档使用简体中文，角色回复可以切换中文、日文或英文。直接上传本目录即可托管，不需要安装依赖或打包。

## 功能

- 手机通话风格界面、首次接入动画、红黑渐变与扫描线，桌面居中手机框。
- 原创程序绘制的 SVG 少女形象：呼吸、随机眨眼、说话口型及七种表情。没有使用官方立绘、音频或模型。
- OpenAI 兼容 Chat Completions 流式对话、停止生成、错误正文提示、表情标签跨分块解析。
- DeepSeek / 千问 Qwen / OpenAI / 自定义接口、温度、昵称、回复语言、最近 N 条消息上下文（默认 20）。
- 相机实时预览、前后摄像头切换、相册选图，支持视觉模型以红莉栖的性格评论照片；可只发图片。
- 本机对话保存、JSON 导入导出、可编辑与删除的长期记忆，自动提取记忆默认关闭，开启后每次完整回复额外调用一次非流式接口。
- 系统 TTS 声音选择；流式输出与朗读时显示波形、驱动口型。TTS 使用设备语音，不是原角色声音。声音可用性取决于设备，部分系统声音可能需要联网。
- 可选 VRM 3D 形象：支持 HTTPS URL 或本地 .vrm 导入，文件保存在 IndexedDB，口型、眨眼、表情与自然待机动作同步，失败回退 SVG。
- 可选 Live2D：设置模型 URL 后才加载 CDN 运行库，失败回退到原创 SVG。
- PWA 安装与离线应用外壳；离线不能请求模型，API 请求绝不进入 Service Worker 缓存。

截图放在 `screenshots/`，可自行添加 `screenshots/mobile.png` 与 `screenshots/settings.png`。本仓库不冒充提供未实际拍摄的截图。

## 本地运行

安装 Node.js 18 或更新版本，然后执行：

```sh
npm run dev
```

打开 `http://localhost:8080`。可用 `PORT=3000 npm run dev` 改端口。服务监听所有网卡；手机与电脑在同一局域网时可访问 `http://电脑局域网IP:8080`。局域网 HTTP 下无法注册 Service Worker，但在线聊天仍可用；接口仍需允许 CORS。

无需 Node 的托管平台也能直接使用 HTML/CSS/ES 模块；不要直接双击 `file://` 页面。开发服务仅用于本地静态文件预览，不作为生产代理或生产服务器。

## 设置接口与 Key

右上角 ⚙ 打开设置，填写 API Key 并保存。没有 Key 时发送会在对话中提示并打开设置，不发出请求。

**DeepSeek：**前往 [DeepSeek 开放平台](https://platform.deepseek.com/) 注册登录，创建 API Key，并在平台充值。API 按 Token 用量计费，具体价格与可用模型以平台为准；聊天网站免费额度不等于 API 余额。预设地址 `https://api.deepseek.com`、模型 `deepseek-chat`。接口路径为 `/chat/completions`，兼容带 `/v1` 的地址，参见 [官方接口文档](https://api-docs.deepseek.com/api/create-chat-completion/)。

**千问 Qwen：**登录 [阿里云百炼控制台](https://bailian.console.aliyun.com/)，创建 DashScope API Key；本项目不提供 Key。免费试用、新用户额度与定价可能变化，请以控制台为准。选择「千问 Qwen」预设，地址为 `https://dashscope.aliyuncs.com/compatible-mode/v1`，默认模型 `qwen-vl-plus`，模型名称可编辑，例如 `qwen-vl-max`。`qwen-plus`、`qwen-turbo`、`qwen-max` 是纯文字模型。

DeepSeek 不能看图。可切换到千问 `qwen-vl-plus` 或 OpenAI `gpt-4o-mini`，也可在设置的「视觉模型」中单独填写接口、Key 和模型；留空字段沿用主接口对应字段。只发文字时始终使用主接口。没有可用视觉配置时，发送图片会提示并打开设置。

拍照需 HTTPS（或 localhost），首次使用浏览器会请求摄像头权限；局域网普通 HTTP 请改用相册。相机按钮打开实时预览，支持拍照、前后切换与取消；「相册」选择已有照片，「选图」使用系统文件选择器（手机可调用相机）。关闭预览、切到后台或离开页面会停止摄像头。不会上传实时视频流；照片在本机缩小至最长边 1024 像素，以约 0.8 质量压缩为 JPEG，发送消息时才连同文字发往所配置的 API。除这次 API 请求外，Key 与图片留在本机；导出不包含 Key，但可能包含最近的照片，请谨慎分享。本地历史和导出最多保留最近两张图片且总 data URL 长度不超过约 1.4 MB，较旧图片替换为移除提示；存储失败时移除图片后重试一次。

浏览器直接请求 DashScope 等接口，服务商必须允许 CORS；本项目不能保证跨域可用。如果服务商阻止，会显示已有网络错误；可按下文说明自建代理。

**OpenAI：**在 [OpenAI 开发者平台](https://platform.openai.com/api-keys) 创建 Key，在平台配置 API 计费。选择 OpenAI 预设后地址为 `https://api.openai.com/v1`，模型为 `gpt-4o-mini`，支持图片，也可设置其他支持视觉的 GPT-4o / GPT-4.1 / GPT-4-turbo 系列模型。模型权限与费用以账户平台为准。

**其他模型：**选择“自定义”，输入支持浏览器跨域的 OpenAI 兼容 Base URL 与模型名称。程序保留已有 `/v1`，不会擅自添加它。最终 POST `{baseUrl}/chat/completions`。不支持需要服务器保管密钥、非兼容协议或不允许浏览器跨域的服务。HTTP 401 提示 Key 错误，402 提示余额不足，429 提示限流，网络错误说明网络与 CORS 问题。HTTPS 页面调用普通 HTTP 接口可能被浏览器阻止，localhost 调试以浏览器策略为准。

Key **只持久化在本机浏览器 localStorage**，不会写入导出文件、仓库、应用缓存或开发服务器。请求直接从浏览器发送到设置的 API 服务；聊天上下文及长期记忆也会随请求发给该服务。纯前端不能把 Key 对本机使用者、浏览器扩展或恶意同源脚本隐藏，请勿在公共设备使用，也不要向不可信接口提交 Key。可在设置中清空 Key 后保存；清空浏览器站点数据可以删除全部本机数据。不要把 Key 写入源代码。

需要更强的密钥隔离时，可自行建立有身份验证、限流与来源控制的代理，在代理环境变量中保存服务商 Key，并将前端接口改为代理地址；本项目不包含代理后端。Live2D 运行库按需从外部 CDN 执行，启用前应信任相应来源。

## 免费静态部署与手机安装

以下平台的免费额度和入口可能调整，以各平台页面为准。不要上传含私密资料的对话导出。

1. **GitHub Pages**：需要 GitHub 账号。新建仓库，上传此目录的应用文件，在仓库 Settings → Pages 中选择从分支发布，选择主分支和根目录，保存并等待生成 HTTPS 地址。相对路径支持仓库子目录部署。无需设置构建命令。
2. **Cloudflare Pages**：登录 Cloudflare，创建 Pages 项目，选择直接上传／拖拽静态文件，把本目录内容上传，完成后获得 HTTPS 地址。若使用 Git 连接，构建命令留空，输出目录设为项目根目录。
3. **Vercel**：导入包含本项目的仓库，框架选择 Other，关闭或留空构建命令，输出目录使用根目录；也可安装 Vercel CLI 后在项目目录运行 `vercel` 并按提示部署。静态资源不需要服务器函数。

获得地址后在手机浏览器打开：iOS 使用 Safari 分享 → 添加到主屏幕；Android 使用 Chrome 菜单 → 安装应用／添加到主屏幕。PWA 和 Service Worker 需要 **HTTPS（localhost 除外）**。安装后数据仍留在该浏览器来源的存储中，更换域名不会自动迁移，可先导出再导入。

更新应用外壳时修改 `sw.js` 的缓存版本。外壳在线时优先联网、失败再读缓存；新版本激活后会清理本应用旧缓存。第一次需联网打开一次，才能离线访问。

## 更换形象、人格与声音

默认 SVG 由 `js/avatar-svg.js` 与 CSS 绘制，可直接修改配色与路径。图标为原创 A / 波形，执行 `node icons/generate.mjs` 可仅使用 Node 内置模块重新生成 PNG。

Live2D 设置示例：把有授权的完整模型目录（包含纹理、moc3、动作和表情）放到 `models/你的模型/`，填 `./models/你的模型/你的模型.model3.json`，或填允许跨域读取的 HTTPS URL。`models/` 已被 gitignore 忽略，若部署需要请按模型授权手动上传；不要只上传单个 JSON。

运行时依次从 CDN 加载 PixiJS v7、pixi-live2d-display 0.5.0-beta（与 Pixi v7 对应）和官方 Cubism Core（代码中先加载 Core，再加载 Pixi 与插件以满足依赖）。表情／动作名称映射可在 `js/live2d.js` 的 `emotionMap` 修改，先尝试模型现有表情，再尝试动作组。口型使用 `ParamMouthOpenY`，模型需要包含相应参数。无相应表情或动作时保留原状态。网络、跨域、模型版本或 WebGL 不兼容会回退 SVG。

[pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) 使用 MIT 许可；**Cubism Core 适用 Live2D Proprietary Software License**，不属于本项目的 MIT 授权。模型也需要单独授权。测试可使用 [Live2D 官方免费示例模型](https://www.live2d.com/en/learn/sample/)（如 Hiyori / Haru），请阅读各自的 Live2D Free Material License、使用条件和再分发限制。本项目不附带任何模型、不提供角色声音。

### 3D (VRM) 模型获取与导入

本项目**不包含任何官方牧濑红莉栖 / Steins;Gate 模型**，相关模型受版权保护，请勿把未授权模型放入仓库。不要将任何 `.vrm` 文件加入 git；`models/` 已被忽略。

推荐下载免费的 [VRoid Studio](https://vroid.com/studio)，自行创作一个受红莉栖风格启发的角色，导出为 VRM，再在设置中“导入本地 VRM”。也可在 [VRoid Hub](https://hub.vroid.com/) 选择许可允许你使用的模型，检查再分发、署名、商业／非商业使用等条款。只有托管方允许 CORS 时才能使用直接 HTTPS URL；否则下载后导入本地文件。

操作：设置 → 形象模式 → **3D (VRM)** → 粘贴 URL 或导入 `.vrm` → 保存。本地模型优先于 URL；点击“清除本地模型”后使用 URL。导入和清除立即保存，替换同名文件也会重新加载形象。本地二进制只保存在当前浏览器来源的 IndexedDB，文件名和 URL 保存在 localStorage；清除站点数据会删除模型，更换设备或域名需要重新导入。

运行库使用 importmap 固定到 [three.js 0.177.0](https://github.com/mrdoob/three.js/tree/r177) 和 [@pixiv/three-vrm 3.4.2](https://github.com/pixiv/three-vrm/tree/v3.4.2)，两者均为 MIT 许可，通过 jsDelivr CDN 加载。**只有启用 VRM 模式且设置了模型时才加载 Three.js / three-vrm**；没有内置或默认远程示例模型。当前手机 Safari / Chrome 支持原生 importmap，无需构建工具。CORS、404、无效文件、运行库网络失败或 WebGL 不兼容时，会提示错误并回退到原创 SVG。CDN 运行库和模型不进入应用外壳缓存，首次加载需要联网；已导入本地文件不会再次下载，但运行库仍需可用。

人格位于 `js/persona.js`：`buildSystemPrompt` 根据昵称、语言与长期记忆生成系统提示，`examples` 是不会显示到 UI 的原创少样本对话。表情协议要求正文前恰好一个 `[emotion:...]` 标签，支持 neutral、smile、annoyed、embarrassed、surprised、thinking、sad。客户端跨块缓冲标签并移除；缺失时使用中日英关键词推断。提示不能保证模型绝对遵循设定。

## 测试与模拟接口

```sh
npm test
# 或
node test/run-tests.mjs
```

测试覆盖 VRM 表情映射、importmap 与 VRM 脚本静态服务，以及所有标签拆分位置、逐字符输入、关键词、Base URL 规范化、真实 SSE 读取、UTF-8 字符跨字节分块、请求体与 system 首消息、401 映射、请求取消。集成测试临时监听本机 8787 端口，需要环境允许本机监听。

手动模拟：

```sh
node test/mock-server.mjs
```

另开终端 `npm run dev`，设置 Base URL 为 `http://localhost:8787`，Key 填 `test`，模型任意。回复故意拆分标签与中文 UTF-8 字节；Key 为 `bad` 时返回 401。`GET http://localhost:8787/captured` 可查看最近请求体。模拟服务允许所有来源 CORS，仅用于本地测试。

## 文件结构

`index.html` 与 `css/style.css` 为界面；`js/app.js` 管理 UI；`api.js` 为可在 Node 18+ 测试的流式客户端；`emotion.js` 是纯函数解析器；`image.js` 提供图片压缩、视觉模型识别、消息构造和历史图片裁剪，`camera.js` 管理相机预览与摄像头生命周期；`storage.js` 管理 localStorage 设置和 IndexedDB 本地 VRM；`avatar-svg.js`、`live2d.js`、`vrm.js`、`tts.js` 管理形象和朗读，`vrm-emotion.js` 提供可独立测试的 VRM 表情映射；`sw.js`、manifest 与 `icons/` 提供 PWA 外壳；`server.mjs` 为零依赖静态服务；`test/` 包含模拟接口和测试。

## 版权与参考

Steins;Gate、Amadeus、牧濑红莉栖相关版权属于 MAGES. / Nitroplus 等权利人。本项目是非商业同人学习项目，不含官方立绘、模型、语音、游戏文本转储。人物设定与商标不因本项目代码许可而获得授权。

本项目自行编写代码，代码与原创图标 / SVG 使用 MIT（见 LICENSE）；第三方运行库和模型遵守各自许可。参考项目／思路来源：

- [amadeus-plan/amadeus-frontend](https://github.com/amadeus-plan/amadeus-frontend)（MIT）
- [yyxcnasd/amadeus-for-dsh](https://github.com/yyxcnasd/amadeus-for-dsh)（MIT）
- [FrancescoCaracciolo/Amadeus](https://github.com/FrancescoCaracciolo/Amadeus)（GPL-3.0，仅参考思路，未复制代码）
- [lucca3447/OpenAmadeus](https://github.com/lucca3447/OpenAmadeus)（GPL-3.0，仅参考思路，未复制代码）
- [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)（MIT，运行时 CDN 加载）
