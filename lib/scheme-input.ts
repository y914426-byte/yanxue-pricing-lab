export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TEXT_LENGTH = 100000;
export type SchemeInput = {
  title: string;
  fileName: string;
  fileType: 'docx' | 'txt';
  rawText: string;
};
export type SchemeSummary = Omit<SchemeInput, 'rawText'> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export type SchemeDocument = SchemeSummary & { rawText: string };
export function validateSchemeFile(file: {
  name: string;
  size: number;
  type: string;
}) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'docx' && extension !== 'txt')
    throw new Error('仅支持 .docx 和 .txt 文件');
  if (file.size > MAX_FILE_BYTES)
    throw new Error('文件不能超过 5 MB，请精简后重新上传');
  if (!file.size) throw new Error('文件为空，请重新选择');
  const allowed =
    extension === 'docx'
      ? [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/zip',
        ]
      : ['text/plain'];
  if (
    file.type &&
    file.type !== 'application/octet-stream' &&
    !allowed.includes(file.type)
  )
    throw new Error('文件类型与扩展名不一致');
  return extension;
}
export function parseSchemeInput(value: unknown): SchemeInput {
  if (!value || typeof value !== 'object') throw new Error('方案格式无效');
  const v = value as Record<string, unknown>;
  for (const [key, max, label] of [
    ['title', 120, '方案名称'],
    ['fileName', 255, '文件名称'],
    ['rawText', MAX_TEXT_LENGTH, '方案正文'],
  ] as const) {
    if (typeof v[key] !== 'string' || !(v[key] as string).trim())
      throw new Error(label + '不能为空');
    if ((v[key] as string).length > max)
      throw new Error(label + '不能超过 ' + max + ' 个字符');
  }
  if (v.fileType !== 'docx' && v.fileType !== 'txt')
    throw new Error('仅支持 .docx 和 .txt 文件');
  if (!(v.fileName as string).toLowerCase().endsWith('.' + v.fileType))
    throw new Error('文件类型与扩展名不一致');
  return {
    title: (v.title as string).trim(),
    fileName: (v.fileName as string).trim(),
    fileType: v.fileType,
    rawText: (v.rawText as string).trim(),
  };
}
