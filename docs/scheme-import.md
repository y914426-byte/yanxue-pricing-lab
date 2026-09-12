# 方案库第一阶段

入口 `/scheme-import`，列表 `/schemes`，详情 `/schemes?id=<schemeDocument.id>`。
`/api/schemes` 支持 GET 列表、GET `?id=` 详情、POST 保存、DELETE `?id=` 删除。
服务端复用 Google 会话，仅使用会话 owner；列表、详情和删除均限制 owner_id。

仅支持 5 MB 以内 DOCX、UTF-8 TXT，正文最多 100000 字符，名称最多 120 字符，文件名最多 255 字符。JSON 请求流最多 650000 字节。
DOCX 使用浏览器 Web Worker 解析纯文本，15 秒超时终止；不转换 HTML、不执行宏或脚本。原文件不上传，只有点击保存后的文字与文件元数据写入 D1。
列表每页 20 条，不传回正文。删除需确认。智能分析按钮仅显示下一阶段提示，无 AI 请求。

## 生产数据库迁移

新增 Drizzle 生成文件：`drizzle/0004_scheme_documents.sql`，新增表 `scheme_documents` 与账号/时间/编号索引。旧 SQL 和旧快照不变，仅追加 journal 和新快照。

沿用 README 中现有 Pages D1 手动执行 SQL 的方式，在当前 Pages **生产 DB 绑定指向的现有数据库**上执行一次新增 SQL，不执行以前的 SQL，不重建数据库。

在已登录 Cloudflare 的终端，把下方占位符替换成 Pages 生产 DB 绑定的真实数据库名称或 ID：

```sh
pnpm exec wrangler d1 execute <现有生产D1数据库名称或ID> --remote --file=drizzle/0004_scheme_documents.sql
```

也可在该 D1 控制台执行这份文件中的 SQL。先确认表尚未存在；已经成功执行过则不要重复执行。
仓库仅有本地占位数据库 ID，不能将其作为生产迁移目标。Git 提交触发 Pages 构建不会自动执行 D1 SQL。
构建命令保持 `pnpm run build:pages`，输出 `dist/client`。无需新 Pages 项目或新环境变量。

## 下一阶段

围绕已保存的 schemeDocument.id 新增分析接口，并再次校验 owner。当前仅预留详情交互，不包含 AI、Embedding 或自动定价。
