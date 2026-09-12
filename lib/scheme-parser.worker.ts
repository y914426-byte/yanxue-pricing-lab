import { extractRawText } from 'mammoth/mammoth.browser';
import { MAX_TEXT_LENGTH } from './scheme-input';
self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    const { value } = await extractRawText({ arrayBuffer: event.data });
    if (value.length > MAX_TEXT_LENGTH)
      throw new Error('正文不能超过 100000 个字符');
    self.postMessage({ text: value });
  } catch {
    self.postMessage({
      error:
        'Word 解析失败或正文过长，请检查文件是否损坏、加密，或另存为 TXT 后重试',
    });
  }
};
