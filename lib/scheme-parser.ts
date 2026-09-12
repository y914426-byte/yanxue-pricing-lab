import {
  MAX_TEXT_LENGTH,
  validateSchemeFile,
  type SchemeInput,
} from './scheme-input';
export async function parseSchemeFile(file: File): Promise<SchemeInput> {
  const fileType = validateSchemeFile(file);
  let rawText: string;
  if (fileType === 'txt') {
    const bytes = await file.arrayBuffer();
    try {
      rawText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error('TXT 请使用 UTF-8 编码保存后重新上传');
    }
    if (rawText.includes('\0'))
      throw new Error('文件不是有效的纯文本，请使用 UTF-8 TXT');
  } else {
    const bytes = await file.arrayBuffer();
    if (new Uint8Array(bytes)[0] !== 0x50 || new Uint8Array(bytes)[1] !== 0x4b)
      throw new Error('文件不是有效的 DOCX 文档');
    rawText = await new Promise<string>((resolve, reject) => {
      const worker = new Worker(
        new URL('./scheme-parser.worker.ts', import.meta.url),
        { type: 'module' },
      );
      const finish = () => {
        clearTimeout(timer);
        worker.terminate();
      };
      const timer = setTimeout(() => {
        finish();
        reject(new Error('解析超时，请精简文档或另存为 TXT'));
      }, 15000);
      worker.onmessage = (
        event: MessageEvent<{ text?: string; error?: string }>,
      ) => {
        finish();
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.text ?? '');
      };
      worker.onerror = () => {
        finish();
        reject(new Error('Word 解析失败，请另存为 TXT 后重试'));
      };
      worker.postMessage(bytes, [bytes]);
    });
  }
  if (rawText.length > MAX_TEXT_LENGTH)
    throw new Error('正文不能超过 100000 个字符，请精简后重新上传');
  if (!rawText.trim())
    throw new Error('未解析到文字，图片或扫描件不支持文字识别');
  return {
    title: file.name.replace(/\.[^.]+$/, '').slice(0, 120),
    fileName: file.name,
    fileType,
    rawText: rawText.trim(),
  };
}
